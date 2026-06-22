import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Eyebrow, ScreenTitle } from '@/components/ui';
import { font, gradientDir, gradients, palette, radius, shadow } from '@/constants/theme';
import { notify } from '@/lib/dialog';
import { listFollowing, Profile, searchUsers } from '@/lib/social';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <View style={styles.screen}>
      <View style={[styles.head, { paddingTop: insets.top + 12 }]}>
        <Eyebrow>Comunitate</Eyebrow>
        <ScreenTitle>Caută prieteni</ScreenTitle>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="Caută după nume…"
            placeholderTextColor={palette.ink4}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={onSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
          <Pressable
            style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.85 }]}
            onPress={onSearch}
          >
            <LinearGradient
              colors={gradients.ember as unknown as [string, string]}
              locations={gradients.emberLocations}
              start={gradientDir.start}
              end={gradientDir.end}
              style={[StyleSheet.absoluteFill, { borderRadius: radius.input }]}
            />
            <Ionicons name="search" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      {searching ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={palette.accent} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <Text style={styles.sectionLabel}>{hasQuery ? 'Rezultate' : 'Urmăriți'}</Text>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {hasQuery
                ? 'Niciun rezultat. Încearcă alt nume.'
                : 'Nu urmărești încă pe nimeni. Caută un nume mai sus.'}
            </Text>
          }
          renderItem={({ item }) => <UserRow profile={item} onPress={() => openProfile(item.id)} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 96 }]}
        />
      )}
    </View>
  );
}

function UserRow({ profile, onPress }: { profile: Profile; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]} onPress={onPress}>
      <Avatar name={profile.display_name} size={42} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{profile.display_name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.ink4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  head: { paddingHorizontal: 18, gap: 4, paddingBottom: 12 },
  searchRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: font.sans,
    fontSize: 15,
    color: palette.ink,
    backgroundColor: palette.surface,
    ...shadow.sm,
  },
  searchBtn: {
    backgroundColor: palette.accent,
    borderRadius: radius.input,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.accentBtn,
  },
  list: { paddingHorizontal: 18, paddingTop: 4, gap: 10 },
  sectionLabel: {
    fontFamily: font.sansSemibold,
    fontSize: 12,
    letterSpacing: 0.48,
    color: palette.ink3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  empty: {
    fontFamily: font.sans,
    fontSize: 15,
    color: palette.ink3,
    lineHeight: 22,
    marginTop: 24,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.line,
    ...shadow.sm,
  },
  name: { fontFamily: font.sansSemibold, fontSize: 16, color: palette.ink },
  username: { fontFamily: font.sansMedium, fontSize: 13, color: palette.ink3, marginTop: 1 },
});
