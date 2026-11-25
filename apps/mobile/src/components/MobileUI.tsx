import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { palette } from '@alc/design-system';

export const Card: React.FC<{ children: React.ReactNode; style?: object }> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.sectionTitle}>{children}</Text>
);

export const MutedText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.muted}>{children}</Text>
);

export const Badge: React.FC<{ label: string; tone?: 'info' | 'success' | 'warning' | 'danger' }> = ({
  label,
  tone = 'info',
}) => {
  const colors = {
    info: { bg: palette.accentCyanSoft, fg: palette.accentCyan },
    success: { bg: palette.successSoft, fg: palette.success },
    warning: { bg: palette.warningSoft, fg: palette.warning },
    danger: { bg: palette.dangerSoft, fg: palette.danger },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.fg }]}>{label}</Text>
    </View>
  );
};

export const PrimaryButton: React.FC<{
  title: string;
  onPress: () => void;
  disabled?: boolean;
}> = ({ title, onPress, disabled }) => (
  <TouchableOpacity
    style={[styles.primaryBtn, disabled && { opacity: 0.5 }]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={styles.btnText}>{title}</Text>
  </TouchableOpacity>
);

export const SecondaryButton: React.FC<{
  title: string;
  onPress: () => void;
  disabled?: boolean;
}> = ({ title, onPress, disabled }) => (
  <TouchableOpacity
    style={[styles.secondaryBtn, disabled && { opacity: 0.5 }]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={styles.btnText}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.bgCard,
    borderColor: palette.borderSubtle,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  muted: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  primaryBtn: {
    backgroundColor: palette.accentIndigo,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryBtn: {
    backgroundColor: palette.bgElevated,
    borderColor: palette.borderSubtle,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});
