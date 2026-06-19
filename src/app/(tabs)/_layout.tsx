import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

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

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.ink4,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => <TabBarBackground />,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Acasă',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
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
});
