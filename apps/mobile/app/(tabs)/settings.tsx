import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { palette } from '@alc/design-system';
import { Badge, Card, MutedText, PrimaryButton, SectionTitle, SecondaryButton } from '../../src/components/MobileUI';
import { useMobile } from '../../src/state/MobileContext';

export default function SettingsTab() {
  const {
    aiCapabilities,
    aiStatus,
    modelFilePath,
    tokenizerFilePath,
    pickAndInstallModelFile,
    initializeNativeLlama,
    exportJsonBackupFile,
    importJsonBackupFile,
    resetAllData,
  } = useMobile();
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Badge label="ExecuTorch Native Runtime" tone="info" />
        <SectionTitle>Offline Llama 3.2 Model Management</SectionTitle>
        <MutedText>
          Backend: {aiCapabilities?.backend ?? 'xnnpack'} • Device RAM: {aiCapabilities?.estimatedRamMb ?? 'unknown'} MB
        </MutedText>
        <MutedText>Model (.pte): {modelFilePath ?? 'Not selected'}</MutedText>
        <MutedText>Tokenizer (.model): {tokenizerFilePath ?? 'Not selected'}</MutedText>
        <MutedText>Status: {aiStatus.state} — {aiStatus.statusMessage}</MutedText>

        <SecondaryButton
          title="Select & Verify .pte Model File (SHA-256)"
          onPress={async () => {
            try {
              const sha = await pickAndInstallModelFile('pte');
              if (sha) setNotice(`Verified .pte SHA-256: ${sha.slice(0, 16)}...`);
            } catch (e) {
              setNotice(e instanceof Error ? e.message : 'Failed to pick .pte file');
            }
          }}
        />
        <SecondaryButton
          title="Select & Verify tokenizer.model (SHA-256)"
          onPress={async () => {
            try {
              const sha = await pickAndInstallModelFile('tokenizer');
              if (sha) setNotice(`Verified tokenizer SHA-256: ${sha.slice(0, 16)}...`);
            } catch (e) {
              setNotice(e instanceof Error ? e.message : 'Failed to pick tokenizer');
            }
          }}
        />
        <PrimaryButton
          title="Load Model into ExecuTorch"
          onPress={async () => {
            try {
              await initializeNativeLlama();
              setNotice('ExecuTorch Llama 3.2 loaded and ready offline.');
            } catch (e) {
              setNotice(e instanceof Error ? e.message : 'Load failed');
            }
          }}
        />
        <SecondaryButton
          title="Open ExecuTorch Inference POC & Diagnostics"
          onPress={() => router.push('/inference-poc')}
        />
        {notice && <MutedText>{notice}</MutedText>}
      </Card>

      <Card>
        <SectionTitle>Cross-Platform Backup & Privacy</SectionTitle>
        <MutedText>
          All learner data resides locally in SQLite. Export or import SHA-256 verified JSON backups across Web, Android, and iOS.
        </MutedText>
        <PrimaryButton
          title="Export Verified JSON Backup"
          onPress={async () => {
            const path = await exportJsonBackupFile();
            setNotice(`Exported backup to ${path}`);
          }}
        />
        <SecondaryButton
          title="Import Verified JSON Backup"
          onPress={async () => {
            const res = await importJsonBackupFile();
            setNotice(res.message);
          }}
        />
        <SecondaryButton title="Wipe Local SQLite Data" onPress={resetAllData} />
      </Card>

      <Card>
        <SectionTitle>About & Meta Llama Attribution</SectionTitle>
        <MutedText>
          Built with Llama. Llama 3.2 is licensed under the Llama 3.2 Community License, Copyright © Meta Platforms, Inc. All Rights Reserved.
        </MutedText>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bgPrimary },
  content: { padding: 16 },
});
