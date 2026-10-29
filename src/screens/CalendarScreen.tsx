import React, { useMemo, useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { useApp } from '../context/AppContext';
import {
  MONTH_NAMES, WEEKDAY_SHORT, daysInMonth, formatVN, heatLevel, HEAT_COLORS, pad2, todayKey,
} from '../lib/dates';
import { totalRepsOf, type DaySummary, type WorkoutEntry } from '../types';
import { C, PrimaryButton, SectionTitle, styles as S } from '../components/ui';

interface Props {
  onAdd: (date: string) => void;
  onEdit: (entry: WorkoutEntry) => void;
}

/**
 * LỊCH NĂM theo dương lịch:
 * - Chế độ "Nhiệt cả năm": lưới 53 tuần × 7 ngày kiểu GitHub — nhìn 1 phát thấy cả năm.
 * - Chế độ "12 tháng": 12 lịch tháng truyền thống.
 * Chạm vào 1 ngày → xem chi tiết buổi tập ngày đó ở panel bên dưới.
 */
export default function CalendarScreen({ onAdd, onEdit }: Props) {
  const { entries } = useApp();
  const [year, setYear] = useState(new Date().getFullYear());
  const [mode, setMode] = useState<'heat' | 'months'>('heat');
  const [selected, setSelected] = useState<string>(todayKey());
  const { width } = useWindowDimensions();

  const byDay = useMemo(() => {
    const map = new Map<string, DaySummary>();
    for (const e of entries) {
      const cur = map.get(e.workout_date) || {
        date: e.workout_date, sessions: 0, totalSets: 0, totalReps: 0, entries: [],
      };
      cur.sessions += 1;
      cur.totalSets += e.sets.length;
      cur.totalReps += totalRepsOf(e);
      cur.entries.push(e);
      map.set(e.workout_date, cur);
    }
    return map;
  }, [entries]);

  const yearStats = useMemo(() => {
    let sessions = 0; let sets = 0; let reps = 0; let days = 0;
    byDay.forEach((d, key) => {
      if (key.startsWith(`${year}-`)) {
        days += 1; sessions += d.sessions; sets += d.totalSets; reps += d.totalReps;
      }
    });
    return { sessions, sets, reps, days };
  }, [byDay, year]);

  // Lưới nhiệt: cột = tuần, hàng = thứ (T2..CN)
  const heatGrid = useMemo(() => {
    const jan1 = new Date(year, 0, 1);
    // Lùi về Thứ 2 của tuần chứa 1/1
    const start = new Date(jan1);
    const dow = (jan1.getDay() + 6) % 7; // 0 = Thứ 2
    start.setDate(jan1.getDate() - dow);
    const weeks: string[][] = [];
    const cursor = new Date(start);
    while (cursor.getFullYear() <= year || weeks.length < 53) {
      const week: string[] = [];
      for (let r = 0; r < 7; r++) {
        week.push(`${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}-${pad2(cursor.getDate())}`);
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
      if (cursor.getFullYear() > year && cursor.getMonth() > 0) break;
      if (weeks.length >= 53) break;
    }
    return weeks;
  }, [year]);

  const cell = Math.max(8, Math.min(15, Math.floor((Math.min(width, 760) - 66) / 53)));
  const selectedSummary = byDay.get(selected);
  const isCurrentYear = year === new Date().getFullYear();

  return (
    <ScrollView style={S.screen} contentContainerStyle={S.content}>
      <View style={[S.row, { justifyContent: 'space-between' }]}>
        <Text style={S.h1}>📅 Lịch năm</Text>
        <View style={[S.row, { gap: 6 }]}>
          <TouchableOpacity style={local.yearBtn} onPress={() => setYear((y) => y - 1)}>
            <Text style={local.yearBtnText}>‹ {year - 1}</Text>
          </TouchableOpacity>
          <Text style={local.yearNow}>{year}</Text>
          <TouchableOpacity style={local.yearBtn} onPress={() => setYear((y) => y + 1)}>
            <Text style={local.yearBtnText}>{year + 1} ›</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[S.muted, { marginTop: 2 }]}>Năm dương lịch {year} · chạm vào một ngày để xem / ghi buổi tập</Text>

      <View style={[S.row, { gap: 10, marginTop: 12 }]}>
        <View style={[S.card, { flex: 1, marginBottom: 0, alignItems: 'center' }]}>
          <Text style={local.bigNum}>{yearStats.days}</Text>
          <Text style={S.muted}>ngày đã tập</Text>
        </View>
        <View style={[S.card, { flex: 1, marginBottom: 0, alignItems: 'center' }]}>
          <Text style={local.bigNum}>{yearStats.sets}</Text>
          <Text style={S.muted}>tổng số hiệp</Text>
        </View>
        <View style={[S.card, { flex: 1, marginBottom: 0, alignItems: 'center' }]}>
          <Text style={local.bigNum}>{yearStats.reps.toLocaleString('vi-VN')}</Text>
          <Text style={S.muted}>tổng số cái</Text>
        </View>
      </View>

      <View style={[S.row, { gap: 8, marginTop: 14 }]}>
        <TouchableOpacity
          style={[local.modeBtn, mode === 'heat' && local.modeBtnActive]}
          onPress={() => setMode('heat')}
        >
          <Text style={[local.modeBtnText, mode === 'heat' && { color: '#fff' }]}>🔥 Nhiệt cả năm</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[local.modeBtn, mode === 'months' && local.modeBtnActive]}
          onPress={() => setMode('months')}
        >
          <Text style={[local.modeBtnText, mode === 'months' && { color: '#fff' }]}>🗓 12 tháng</Text>
        </TouchableOpacity>
        {!isCurrentYear && (
          <TouchableOpacity style={local.modeBtn} onPress={() => { setYear(new Date().getFullYear()); setSelected(todayKey()); }}>
            <Text style={local.modeBtnText}>Về năm nay</Text>
          </TouchableOpacity>
        )}
      </View>

      {mode === 'heat' ? (
        <View style={[S.card, { marginTop: 12 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={{ marginLeft: 28, height: 14, position: 'relative', width: heatGrid.length * (cell + 2) }}>
                {heatGrid.map((week, wi) => {
                  const d = new Date(year, 0, 1);
                  d.setDate(d.getDate() + wi * 7);
                  const showLabel = wi === 0 || d.getDate() <= 7;
                  if (!showLabel) return null;
                  return (
                    <Text
                      key={wi}
                      numberOfLines={1}
                      style={{
                        position: 'absolute', left: wi * (cell + 2), top: 0,
                        fontSize: 9, color: C.sub, fontWeight: '700',
                      }}
                    >
                      T{d.getMonth() + 1}
                    </Text>
                  );
                })}
              </View>
              {[0, 1, 2, 3, 4, 5, 6].map((row) => (
                <View key={row} style={S.row}>
                  <Text style={{ width: 26, fontSize: 9.5, color: C.sub }}>
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][row]}
                  </Text>
                  {heatGrid.map((week, wi) => {
                    const key = week[row];
                    const inYear = key.startsWith(`${year}-`);
                    const sum = byDay.get(key);
                    const lvl = heatLevel(sum?.totalReps || 0);
                    const isSel = key === selected;
                    const isToday = key === todayKey();
                    return (
                      <TouchableOpacity
                        key={wi}
                        onPress={() => setSelected(key)}
                        style={{
                          width: cell, height: cell, margin: 1, borderRadius: 3,
                          backgroundColor: inYear ? HEAT_COLORS[lvl] : 'transparent',
                          borderWidth: isSel ? 2 : isToday ? 1.5 : 0,
                          borderColor: isSel ? C.gold : '#E67E22',
                        }}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={[S.row, { gap: 5, marginTop: 10, alignItems: 'center' }]}>
            <Text style={S.muted}>Ít</Text>
            {HEAT_COLORS.map((c) => (
              <View key={c} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c }} />
            ))}
            <Text style={S.muted}>Nhiều cái</Text>
          </View>
        </View>
      ) : (
        <View style={{ marginTop: 12 }}>
          {MONTH_NAMES.map((name, mi) => {
            const total = daysInMonth(year, mi + 1);
            const firstDow = new Date(year, mi, 1).getDay(); // 0 = CN
            const cells: (string | null)[] = [
              ...Array.from({ length: firstDow }, () => null),
              ...Array.from({ length: total }, (_, i) => `${year}-${pad2(mi + 1)}-${pad2(i + 1)}`),
            ];
            const monthDays = cells.filter(Boolean).filter((k) => byDay.has(k as string)).length;
            return (
              <View key={name} style={S.card}>
                <View style={[S.row, { justifyContent: 'space-between' }]}>
                  <Text style={{ fontWeight: '800', fontSize: 15.5, color: C.ink }}>{name} {year}</Text>
                  <Text style={S.muted}>{monthDays} ngày tập</Text>
                </View>
                <View style={[S.row, { marginTop: 8 }]}>
                  {WEEKDAY_SHORT.map((w) => (
                    <Text key={w} style={local.dowCell}>{w}</Text>
                  ))}
                </View>
                <View style={[S.row, { flexWrap: 'wrap' }]}>
                  {cells.map((key, i) => {
                    if (!key) return <View key={`x-${i}`} style={local.dayCell} />;
                    const sum = byDay.get(key);
                    const lvl = heatLevel(sum?.totalReps || 0);
                    const dayNum = Number(key.slice(8));
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          local.dayCell,
                          {
                            backgroundColor: HEAT_COLORS[lvl],
                            borderWidth: key === selected ? 2 : key === todayKey() ? 1.5 : 0,
                            borderColor: key === selected ? C.gold : '#E67E22',
                          },
                        ]}
                        onPress={() => setSelected(key)}
                      >
                        <Text style={{
                          fontSize: 12,
                          fontWeight: lvl > 0 ? '800' : '500',
                          color: lvl >= 3 ? '#fff' : C.ink,
                        }}
                        >
                          {dayNum}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Chi tiết ngày đã chọn */}
      <SectionTitle>📌 {formatVN(selected)}</SectionTitle>
      <View style={S.card}>
        {selectedSummary ? (
          <>
            <Text style={{ fontSize: 14.5, marginBottom: 6 }}>
              <Text style={{ fontWeight: '800', color: C.green }}>
                {selectedSummary.sessions} bài · {selectedSummary.totalSets} hiệp · {selectedSummary.totalReps} cái
              </Text>
            </Text>
            {selectedSummary.entries.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={local.entryRow}
                onPress={() => onEdit(e)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 15, color: C.ink }}>{e.exercise_name}</Text>
                  <Text style={S.muted}>{e.sets.map((s) => s.reps).join(' · ')} cái{hệ(e)}</Text>
                </View>
                <Text style={{ color: C.green, fontWeight: '800' }}>{totalRepsOf(e)} cái ›</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <Text style={S.muted}>Ngày này chưa có buổi tập nào được ghi.</Text>
        )}
        <View style={{ height: 10 }} />
        <PrimaryButton title={`＋ Ghi buổi tập cho ngày ${selected.slice(8)}/${selected.slice(5, 7)}`} onPress={() => onAdd(selected)} />
      </View>
    </ScrollView>
  );
}

function hệ(e: WorkoutEntry): string {
  return e.sets.some((s) => s.weight_kg) ? ` · tạ ${e.sets.map((s) => s.weight_kg || 0).join('/')}` : '';
}

const local = StyleSheet.create({
  bigNum: { fontSize: 22, fontWeight: '800', color: C.green },
  yearBtn: {
    borderWidth: 1, borderColor: C.line, backgroundColor: C.card,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
  },
  yearBtnText: { fontWeight: '700', color: C.green, fontSize: 13.5 },
  yearNow: { fontSize: 19, fontWeight: '800', color: C.ink, paddingHorizontal: 2 },
  modeBtn: {
    borderWidth: 1, borderColor: C.line, backgroundColor: C.card,
    borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8,
  },
  modeBtnActive: { backgroundColor: C.green, borderColor: C.green },
  modeBtnText: { fontWeight: '700', fontSize: 13.5, color: C.ink },
  dowCell: { flex: 1, textAlign: 'center', fontSize: 11, color: C.sub, fontWeight: '700' },
  dayCell: {
    width: '14.28%', aspectRatio: 1.25, alignItems: 'center', justifyContent: 'center',
    borderRadius: 7, marginVertical: 1,
  },
  entryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line,
  },
});
