import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { palette } from '@alc/design-system';
import { MobileProvider } from '../src/state/MobileContext';

export default function RootLayout() {
  return (
    <MobileProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: palette.bgSecondary },
          headerTintColor: palette.textPrimary,
          contentStyle: { backgroundColor: palette.bgPrimary },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ title: 'Learner Profile & Onboarding' }} />
        <Stack.Screen name="assessment" options={{ title: 'Diagnostic Skill Assessment' }} />
        <Stack.Screen name="quiz" options={{ title: 'Mastery Quiz' }} />
        <Stack.Screen name="content" options={{ title: 'Learning Content Viewer' }} />
        <Stack.Screen name="inference-poc" options={{ title: 'ExecuTorch Inference POC' }} />
      </Stack>
    </MobileProvider>
  );
}
