import React from 'react';
import {
  ActivityIndicator, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

export const C = {
  bg: '#F6F7F4',
  card: '#FFFFFF',
  ink: '#17301F',
  sub: '#5C6B5F',
  line: '#E2E8DF',
  green: '#0F5132',
  greenMid: '#2F9E5F',
  greenSoft: '#E3F2E7',
  gold: '#C99700',
  red: '#C0392B',
  redSoft: '#FDECEA',
};

export function PrimaryButton({
  title, onPress, loading, disabled, color,
}: {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean; color?: string;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.primary,
        { backgroundColor: color || C.green, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.primaryText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

export function GhostButton({ title, onPress, danger }: { title: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.ghost, danger && { borderColor: C.red }]}
    >
      <Text style={[styles.ghostText, danger && { color: C.red }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {!!sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Chip({
  label, active, onPress,
}: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Stepper({
  value, onChange, min = 0, step = 1, suffix,
}: {
  value: number; onChange: (v: number) => void; min?: number; step?: number; suffix?: string;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        accessibilityRole="button"
        style={styles.stepBtn}
        onPress={() => onChange(Math.max(min, value - step))}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>{value}{suffix || ''}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        style={styles.stepBtn}
        onPress={() => onChange(value + step)}
      >
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 40, maxWidth: 760, width: '100%', alignSelf: 'center' },
  h1: { fontSize: 24, fontWeight: '800', color: C.ink },
  h2: { fontSize: 18, fontWeight: '700', color: C.ink },
  muted: { color: C.sub, fontSize: 13.5, lineHeight: 19 },
  card: {
    backgroundColor: C.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.line, marginBottom: 12,
  },
  primary: {
    borderRadius: 12, paddingVertical: 13, paddingHorizontal: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
  ghost: {
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 1, borderColor: C.line, backgroundColor: C.card, alignItems: 'center',
  },
  ghostText: { color: C.ink, fontSize: 14, fontWeight: '600' },
  input: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15.5, color: C.ink,
  },
  label: { fontSize: 13, fontWeight: '700', color: C.sub, marginBottom: 6, marginTop: 14 },
  statCard: {
    flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: C.line, minWidth: 100,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: C.green },
  statLabel: { fontSize: 12.5, color: C.ink, fontWeight: '600', marginTop: 2 },
  statSub: { fontSize: 11.5, color: C.sub, marginTop: 1 },
  sectionTitle: { fontSize: 16.5, fontWeight: '800', color: C.ink, marginTop: 18, marginBottom: 10 },
  chip: {
    borderWidth: 1, borderColor: C.line, backgroundColor: C.card,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, marginBottom: 8,
  },
  chipActive: { backgroundColor: C.green, borderColor: C.green },
  chipText: { fontSize: 13.5, color: C.ink, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: C.greenSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { fontSize: 18, fontWeight: '800', color: C.green },
  stepValue: { fontSize: 16, fontWeight: '800', color: C.ink, minWidth: 44, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  banner: {
    borderRadius: 12, padding: 12, backgroundColor: '#FFF7DE',
    borderWidth: 1, borderColor: '#F0D98C', marginBottom: 12,
  },
});
