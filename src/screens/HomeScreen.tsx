import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '../context/AppContext';
import {
  addDays, currentStreak, formatVN, parseKey, todayKey,
} from '../lib/dates';
import { totalRepsOf, type WorkoutEntry } from '../types';
import { C, PrimaryButton, SectionTitle, StatCard, styles as S } from '../components/ui';

interface Props {
  onAdd: (date?: string) => void;
  onEdit: (entry: WorkoutEntry) => void;
  goCalendar: () => void;
}

function EntryRow({ entry, onPress }: { entry: WorkoutEntry; onPress: () => void }) {
  return (
    <TouchableOpacity style={local.entryRow} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15.5, fontWeight: '700', color: C.ink }}>{entry.exercise_name}</Text>
        <Text style={S.muted}>
          {entry.sets.map((s) => s.reps).join(' · ')} cái
          {entry.sets.some((s) => s.weight_kg) ? ` · tạ ${entry.sets.map((s) => s.weight_kg || 0).join('/')}` : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontWeight: '800', color: C.green, fontSize: 16 }}>{totalRepsOf(entry)}</Text>
        <Text style={{ color: C.sub, fontSize: 12 }}>{entry.sets.length} hiệp</Text>
      </View>
    </TouchableOpacity>
  );
}

/** Đồng hồ nghỉ giữa hiệp */
function RestTimer() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [total, setTotal] = useState(60);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (ref.current) clearInterval(ref.current); }, []);

  const start = (sec: number) => {
    if (ref.current) clearInterval(ref.current);
    setTotal(sec);
    setSecondsLeft(sec);
    ref.current = setInterval(() => {
      setSecondsLeft((v) => {
        if (v === null || v <= 1) {
          if (ref.current) clearInterval(ref.current);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  };

  return (
    <View style={S.card}>
      <View style={[S.row, { justifyContent: 'space-between' }]}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>⏱ Nghỉ giữa hiệp</Text>
        {secondsLeft !== null && (
          <Text style={{ fontSize: 20, fontWeight: '800', color: secondsLeft === 0 ? C.red : C.green }}>
            {secondsLeft === 0 ? 'Hết giờ! Tập tiếp 💪' : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`}
          </Text>
        )}
      </View>
      <View style={[S.row, { gap: 8, marginTop: 10, flexWrap: 'wrap' }]}>
        {[30, 60, 90, 120, 180].map((sec) => (
          <TouchableOpacity
            key={sec}
            style={[local.timerBtn, total === sec && secondsLeft !== null && { backgroundColor: C.green }]}
            onPress={() => start(sec)}
          >
            <Text style={[local.timerBtnText, total === sec && secondsLeft !== null && { color: '#fff' }]}>
              {sec >= 60 ? `${sec / 60} phút` : `${sec} giây`}
            </Text>
          </TouchableOpacity>
        ))}
        {secondsLeft !== null && (
          <TouchableOpacity
            style={local.timerBtn}
            onPress={() => { if (ref.current) clearInterval(ref.current); setSecondsLeft(null); }}
          >
            <Text style={[local.timerBtnText, { color: C.red }]}>Dừng</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function HomeScreen({ onAdd, onEdit, goCalendar }: Props) {
  const { entries, user } = useApp();
  const today = todayKey();

  const derived = useMemo(() => {
    const activeDays = new Set(entries.map((e) => e.workout_date));
    const streak = currentStreak(activeDays);
    const todayEntries = entries.filter((e) => e.workout_date === today);
    const weekStart = addDays(today, -6);
    const weekEntries = entries.filter((e) => e.workout_date >= weekStart && e.workout_date <= today);
    const year = new Date().getFullYear();
    const yearEntries = entries.filter((e) => e.workout_date.startsWith(`${year}-`));
    return {
      streak,
      todayEntries,
      weekSessions: new Set(weekEntries.map((e) => e.workout_date)).size,
      weekReps: weekEntries.reduce((s, e) => s + totalRepsOf(e), 0),
      yearSessions: new Set(yearEntries.map((e) => e.workout_date)).size,
      last7: Array.from({ length: 7 }, (_, i) => {
        const day = addDays(today, i - 6);
        const list = entries.filter((e) => e.workout_date === day);
        return { day, reps: list.reduce((s, e) => s + totalRepsOf(e), 0), has: list.length > 0 };
      }),
    };
  }, [entries, today]);

  const maxReps7 = Math.max(1, ...derived.last7.map((d) => d.reps));
  const name = user?.email ? user.email.split('@')[0] : 'bạn';

  return (
    <ScrollView style={S.screen} contentContainerStyle={S.content}>
      <Text style={S.h1}>Chào {name} 👋</Text>
      <Text style={[S.muted, { marginTop: 2 }]}>{formatVN(today)}</Text>

      <View style={local.hero}>
        <Text style={{ fontSize: 34 }}>🔥</Text>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>
            {derived.streak > 0 ? `${derived.streak} ngày tập liên tiếp` : 'Hôm nay tập 1 hiệp nhé?'}
          </Text>
          <Text style={{ color: '#D7EBDD', fontSize: 13.5, marginTop: 2 }}>
            {derived.streak >= 7
              ? 'Phong độ quá tốt — giữ vững chuỗi này!'
              : derived.streak > 0
                ? 'Đừng để đứt chuỗi — ghi buổi tập hôm nay ngay.'
                : 'Chuỗi ngày tập bắt đầu từ một buổi tập đầu tiên.'}
          </Text>
        </View>
      </View>

      <View style={[S.row, { gap: 10, marginTop: 12 }]}>
        <StatCard label="Buổi tập tuần này" value={String(derived.weekSessions)} sub={`${derived.weekReps} cái trong 7 ngày`} />
        <StatCard label={`Ngày đã tập năm ${new Date().getFullYear()}`} value={String(derived.yearSessions)} sub="theo lịch năm → xem Lịch" />
      </View>

      <View style={{ height: 14 }} />
      <PrimaryButton title="＋ Ghi buổi tập hôm nay" onPress={() => onAdd(today)} />

      <SectionTitle>📅 Hôm nay</SectionTitle>
      {derived.todayEntries.length === 0 ? (
        <View style={S.card}>
          <Text style={S.muted}>Hôm nay chưa ghi buổi tập nào. Bấm nút xanh ở trên để ghi hiệp đầu tiên — chỉ mất 10 giây.</Text>
        </View>
      ) : (
        <View style={S.card}>
          {derived.todayEntries.map((e) => (
            <EntryRow key={e.id} entry={e} onPress={() => onEdit(e)} />
          ))}
          <Text style={[S.muted, { marginTop: 8 }]}>
            Tổng hôm nay: {derived.todayEntries.reduce((s, e) => s + e.sets.length, 0)} hiệp ·{' '}
            {derived.todayEntries.reduce((s, e) => s + totalRepsOf(e), 0)} cái
          </Text>
        </View>
      )}

      <SectionTitle>📊 7 ngày gần nhất</SectionTitle>
      <View style={S.card}>
        <View style={local.bars}>
          {derived.last7.map((d) => (
            <View key={d.day} style={local.barCol}>
              <Text style={{ fontSize: 11, color: C.sub }}>{d.reps || ''}</Text>
              <View style={[local.bar, { height: Math.max(4, (d.reps / maxReps7) * 74), backgroundColor: d.day === today ? C.gold : C.greenMid }]} />
              <Text style={{ fontSize: 11.5, fontWeight: d.day === today ? '800' : '500', color: d.day === today ? C.ink : C.sub }}>
                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][parseKey(d.day).getDay()]}
              </Text>
            </View>
          ))}
        </View>
        <TouchableOpacity onPress={goCalendar}>
          <Text style={{ color: C.green, fontWeight: '700', marginTop: 6 }}>Xem lịch nhiệt cả năm →</Text>
        </TouchableOpacity>
      </View>

      <RestTimer />
    </ScrollView>
  );
}

const local = StyleSheet.create({
  hero: {
    marginTop: 14, backgroundColor: C.green, borderRadius: 18,
    padding: 16, flexDirection: 'row', alignItems: 'center',
  },
  entryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 116 },
  barCol: { alignItems: 'center', justifyContent: 'flex-end', gap: 4, flex: 1 },
  bar: { width: 26, borderRadius: 7 },
  timerBtn: {
    borderWidth: 1, borderColor: C.line, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.card,
  },
  timerBtnText: { fontSize: 13.5, fontWeight: '700', color: C.green },
});
