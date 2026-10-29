import React, { useMemo, useState } from 'react';
import {
  ScrollView, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { MONTH_NAMES } from '../lib/dates';
import { totalRepsOf, totalVolumeOf, type WorkoutEntry } from '../types';
import { C, Chip, PrimaryButton, styles as S } from '../components/ui';

interface Props {
  onAdd: () => void;
  onEdit: (entry: WorkoutEntry) => void;
}

export default function HistoryScreen({ onAdd, onEdit }: Props) {
  const { entries, exercises } = useApp();
  const [query, setQuery] = useState('');
  const [filterExercise, setFilterExercise] = useState<string>('Tất cả');
  const [year, setYear] = useState(new Date().getFullYear());

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    entries.forEach((e) => set.add(Number(e.workout_date.slice(0, 4))));
    return Array.from(set).sort((a, b) => b - a);
  }, [entries]);

  const filtered = useMemo(() => entries.filter((e) => {
    if (!e.workout_date.startsWith(`${year}-`)) return false;
    if (filterExercise !== 'Tất cả' && e.exercise_name !== filterExercise) return false;
    if (query && !e.exercise_name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [entries, year, filterExercise, query]);

  const groups = useMemo(() => {
    const map = new Map<string, WorkoutEntry[]>();
    for (const e of filtered) {
      const key = e.workout_date.slice(0, 7);
      const list = map.get(key) || [];
      list.push(e);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const exerciseNames = useMemo(
    () => ['Tất cả', ...Array.from(new Set([...exercises.map((x) => x.name), ...entries.map((e) => e.exercise_name)]))],
    [exercises, entries],
  );

  return (
    <ScrollView style={S.screen} contentContainerStyle={S.content}>
      <Text style={S.h1}>📖 Nhật ký</Text>
      <Text style={[S.muted, { marginTop: 2 }]}>
        {filtered.length} lượt ghi · {filtered.reduce((s, e) => s + e.sets.length, 0)} hiệp ·{' '}
        {filtered.reduce((s, e) => s + totalRepsOf(e), 0).toLocaleString('vi-VN')} cái trong năm {year}
      </Text>

      <View style={{ height: 12 }} />
      <PrimaryButton title="＋ Ghi buổi tập mới" onPress={onAdd} />

      <TextInput
        style={[S.input, { marginTop: 14 }]}
        placeholder="🔎 Tìm bài tập… (ví dụ: hít đất)"
        placeholderTextColor="#9AA79D"
        value={query}
        onChangeText={setQuery}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
        <View style={S.row}>
          {years.map((y) => (
            <Chip key={y} label={`Năm ${y}`} active={year === y} onPress={() => setYear(y)} />
          ))}
        </View>
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={S.row}>
          {exerciseNames.slice(0, 14).map((name) => (
            <Chip key={name} label={name} active={filterExercise === name} onPress={() => setFilterExercise(name)} />
          ))}
        </View>
      </ScrollView>

      {groups.length === 0 && (
        <View style={[S.card, { marginTop: 8 }]}>
          <Text style={S.muted}>Chưa có dữ liệu phù hợp bộ lọc. Thử đổi năm/bài tập, hoặc ghi buổi tập đầu tiên của năm {year}.</Text>
        </View>
      )}

      {groups.map(([monthKey, list]) => {
        const [y, m] = monthKey.split('-').map(Number);
        const monthSets = list.reduce((s, e) => s + e.sets.length, 0);
        const monthReps = list.reduce((s, e) => s + totalRepsOf(e), 0);
        return (
          <View key={monthKey} style={{ marginTop: 16 }}>
            <View style={[S.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>{MONTH_NAMES[m - 1]} {y}</Text>
              <Text style={S.muted}>{list.length} lượt · {monthSets} hiệp · {monthReps.toLocaleString('vi-VN')} cái</Text>
            </View>
            <View style={S.card}>
              {list.map((e) => {
                const volume = totalVolumeOf(e);
                return (
                  <TouchableOpacity
                    key={e.id}
                    onPress={() => onEdit(e)}
                    style={{
                      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line,
                      flexDirection: 'row', gap: 10, alignItems: 'center',
                    }}
                  >
                    <View style={{
                      width: 46, alignItems: 'center', backgroundColor: C.greenSoft,
                      borderRadius: 10, paddingVertical: 6,
                    }}
                    >
                      <Text style={{ fontWeight: '800', color: C.green, fontSize: 16 }}>{e.workout_date.slice(8)}</Text>
                      <Text style={{ fontSize: 10.5, color: C.sub }}>th {m}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', fontSize: 15, color: C.ink }}>{e.exercise_name}</Text>
                      <Text style={S.muted}>
                        {e.sets.map((s) => s.reps).join(' · ')} cái
                        {volume > 0 ? ` · tổng tạ ${volume.toLocaleString('vi-VN')} kg×cái` : ''}
                        {e.notes ? ` · ${e.notes}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontWeight: '800', color: C.green }}>{totalRepsOf(e)}</Text>
                      <Text style={{ fontSize: 11.5, color: C.sub }}>{e.sets.length} hiệp ›</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
