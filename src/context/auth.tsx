import { Session } from '@supabase/supabase-js';
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

import { refreshFlags } from '@/lib/feature-flags';
import { registerForPushNotifications } from '@/lib/push';
import { supabase } from '@/lib/supabase';

/** Înregistrează push tokenul când există o sesiune (precondiție Faza 2, §13). */
function onSession(session: Session | null): void {
  if (!session) return;
  registerForPushNotifications(session.user.id).catch((err) =>
    console.warn('registerForPushNotifications:', err?.message ?? err),
  );
}

type SignUpResult = {
  /** true dacă userul e logat imediat; false dacă trebuie să confirme emailul. */
  needsEmailConfirmation: boolean;
};

type AuthContextValue = {
  session: Session | null;
  /** true cât timp se încarcă sesiunea inițială din storage. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: {
    email: string;
    password: string;
    username: string;
    displayName: string;
  }) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let done = false;
    const finish = (next: Session | null) => {
      if (done) return;
      done = true;
      setSession(next);
      setLoading(false);
    };

    // Sesiunea curentă (dacă există) din storage.
    supabase.auth.getSession().then(({ data }) => {
      finish(data.session);
      // Amânăm efectele secundare (push, flags) în afara lock-ului de auth:
      // apeluri supabase re-intrante din acest flux blochează sesiunea pe RN.
      setTimeout(() => onSession(data.session), 0);
    });

    // Plasă de siguranță: dacă getSession nu se rezolvă (lock blocat pe un refresh
    // de token care stă), nu lăsăm UI-ul în loading infinit.
    const safety = setTimeout(() => finish(null), 5000);

    // Sincronizare la login / logout / refresh.
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      // La autentificare: reîncarcă flag-urile și înregistrează push tokenul.
      // setTimeout(0) scoate apelurile supabase din callback (anti-deadlock lock auth).
      if (event === 'SIGNED_IN') {
        setTimeout(() => {
          refreshFlags();
          onSession(newSession);
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setTimeout(() => refreshFlags(), 0);
      }
    });

    return () => {
      clearTimeout(safety);
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
  };

  const signUp: AuthContextValue['signUp'] = async ({ email, password, username, displayName }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Preluate de trigger-ul handle_new_user pentru a popula profiles.
        data: {
          username: username.trim().toLowerCase(),
          display_name: displayName.trim(),
        },
      },
    });
    if (error) throw error;
    return { needsEmailConfirmation: data.session === null };
  };

  const signOut: AuthContextValue['signOut'] = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth trebuie folosit în interiorul <AuthProvider>.');
  }
  return ctx;
}
