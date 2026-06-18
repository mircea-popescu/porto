import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { notify } from '@/lib/dialog';
import { listFollowing, Profile, searchUsers } from '@/lib/social';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const hasQuery = query.trim().length > 0;

  // Lista „urmăriți" se reîncarcă la fiecare intrare pe tab.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      listFollowing()
        .then((f) => active && setFollowing(f))
        .catch((err) => console.warn('listFollowing:', err.message));
      return () => {
        active = false;
      };
    }, []),
  );

  async function onSearch() {
    if (!hasQuery) return;
    setSearching(true);
    try {
      setResults(await searchUsers(query));
    } catch (err) {
      notify('Eroare', (err as Error).message);
    } finally {
      setSearching(false);
    }
  }

  function openProfile(userId: string) {
    router.push({ pathname: '/user/[id]', params: { id: userId } });
  }

  const data = hasQuery ? results : following;

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Caută după nume…"
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={onSearch}
          returnKeyType="search"
          autoCapitalize="none"
        />
        <Pressable style={styles.searchBtn} onPress={onSearch}>
          <Ionicons name="search" size={20} color="#fff" />
        </Pressable>
      </View>

      {searching ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <Text style={styles.sectionLabel}>
              {hasQuery ? 'Rezultate' : 'Urmăriți'}
            </Text>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {hasQuery
                ? 'Niciun rezultat. Încearcă alt nume.'
                : 'Nu urmărești încă pe nimeni. Caută un nume mai sus.'}
            </Text>
          }
          renderItem={({ item }) => (
            <UserRow profile={item} onPress={() => openProfile(item.id)} />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

function UserRow({ profile, onPress }: { profile: Profile; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {profile.display_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{profile.display_name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  searchRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  searchBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { paddingVertical: 12, gap: 8 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  empty: { fontSize: 15, color: '#64748b', lineHeight: 22, marginTop: 24, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rowPressed: { opacity: 0.6 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#2563eb' },
  name: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  username: { fontSize: 13, color: '#64748b' },
});
