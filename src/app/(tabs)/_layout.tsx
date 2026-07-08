import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { font, palette } from '@/constants/theme';

function TabBarBackground() {
  return (
    <BlurView
      intensity={Platform.OS === 'ios' ? 40 : 0}
      tint="light"
      style={[StyleSheet.absoluteFill, styles.tabBarBg]}
    />
  );
}

/** Iconiță cu pilă violet-soft în spate când tab-ul e activ. */
function TabIcon({
  name,
  color,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      <Ionicons name={name} color={color} size={20} />
    </View>
  );
}

export default function TabsLayout() {
  // Edge-to-edge (obligatoriu pe SDK 54 / Android 15+): aplicația desenează sub
  // bara de navigare de sistem, deci tab bar-ul trebuie să crească cu insetul
  // de jos ca butoanele de sistem (3-button nav / home indicator) să nu se
  // suprapună peste tab-uri.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.ink4,
        tabBarStyle: [
          styles.tabBar,
          { height: 72 + insets.bottom, paddingBottom: insets.bottom },
        ],
        tabBarBackground: () => <TabBarBackground />,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Acasă',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Caută',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="search" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    height: 72,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
    backgroundColor: 'transparent',
    elevation: 0,
  },
  tabBarBg: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  tabLabel: {
    fontFamily: font.sansSemibold,
    fontSize: 10,
  },
  tabItem: {
    paddingVertical: 4,
  },
  iconPill: {
    width: 44,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: palette.accentSoft,
  },
});
