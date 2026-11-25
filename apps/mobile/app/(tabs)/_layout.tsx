import React from 'react';
import { Tabs } from 'expo-router';
import { palette } from '@alc/design-system';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: palette.bgSecondary },
        headerTintColor: palette.textPrimary,
        tabBarStyle: {
          backgroundColor: palette.bgSecondary,
          borderTopColor: palette.borderSubtle,
        },
        tabBarActiveTintColor: palette.accentCyan,
        tabBarInactiveTintColor: palette.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="roadmap" options={{ title: 'Roadmap' }} />
      <Tabs.Screen name="planner" options={{ title: 'Planner' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="assistant" options={{ title: 'Llama AI' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
