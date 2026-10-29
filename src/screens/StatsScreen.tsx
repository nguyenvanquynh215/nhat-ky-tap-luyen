import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { MONTH_NAMES, formatVN, longestStreak, parseKey } from '../lib/dates';
import { totalRepsOf, totalVolumeOf } from '../types';
import { C, Chip, SectionTitle, StatCard, styles as S } from '../components/ui';

export default function StatsScreen() {
  const { entries } = useApp();
  const [year, setYear] = useState(new Date().getFullYear());

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    entries.forEach((e) => set.add(Number(e.workout_date.slice(0, 4))));
    return Array.from(set).sort((a, b) => b - a);
  }, [entries]);

  const data = useMemo(() => {
    const list = entries.filter((e) => e.workout_date.startsWith(`${year}-`));
    const activeDays = new Set(list.map((e) => e.workout_date));
    const byMonth = Array.from({ length: 12 }, (_, i) => {
      const prefix = `${year}-${String(i + 1).padStart(2, '0')}`;
      const monthList = list.filter((e) => e.workout_date.startsWith(prefix));
      return {
        month: i,
        sessions: monthList.length,
        days: new Set(monthList.map((e) => e.workout_date)).size,
        sets: monthList.reduce((s, e) => s + e.sets.length, 0),
        reps: monthList.reduce((s, e) => s + totalRepsOf(e), 0),
      };
    });

    const byExercise = new Map<string, { sessions: number; sets: number; reps: number; volume: number; bestSet: number }>();
    for (const e of list) {
      const cur = byExercise.get(e.exercise_name) || { sessions: 0, sets: 0, reps: 0, volume: 0, bestSet: 0 };
      cur.sessions += 1;
      cur.sets += e.sets.length;
      cur.reps += totalRepsOf(e);
      cur.volume += totalVolumeOf(e);
      cur.bestSet = Math.max(cur.bestSet, ...e.sets.map((s) => Number(s.reps) || 0), 0);
      byExercise.set(e.exercise_name, cur);
    }
    const exerciseRank = Array.from(byExercise.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.reps - a.reps);

    // Ngày tập "khủng" nhất + buổi tập lớn nhất
    const byDay = new Map<string, number>();
    list.forEach((e) => byDay.set(e.workout_date, (byDay.get(e.workout_date) || 0) + totalRepsOf(e)));
    let bestDay: { date: string; reps: number } | null = null;
    byDay.forEach((reps, date) => { if (!bestDay || reps > bestDay.reps) bestDay = { date, reps }; });
    const biggestSession = list.reduce((best, e) => {
      const r = totalRepsOf(e);
      return !best || r > best.reps ? { name: e.exercise_name, date: e.workout_date, reps: r } : best;
    }, null as null | { name: string; date: string; reps: number });

    // Phân bổ theo thứ trong tuần
    const byWeekday = Array.from({ length: 7 }, () => 0);
    activeDays.forEach((d) => { byWeekday[parseKey(d).getDay()] += 1; });

    return {
      list,
      totalSessions: list.length,
      totalSets: list.reduce((s, e) => s + e.sets.length, 0),
      totalReps: list.reduce((s, e) => s + totalRepsOf(e), 0),
      totalVolume: list.reduce((s, e) => s + totalVolumeOf(e), 0),
      activeDays: activeDays.size,
      longest: longestStreak(activeDays),
      byMonth,
      exerciseRank,
      bestDay,
      biggestSession,
      byWeekday,
    };
  }, [entries, year]);

  const maxMonthReps = Math.max(1, ...data.byMonth.map((m) => m.reps));
  const maxExerciseReps = Math.max(1, ...data.exerciseRank.map((x) => x.reps));
  const activeMonths = data.byMonth.filter((m) => m.days > 0).length || 1;
  const weekdayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const bestWeekdayIdx = data.byWeekday.indexOf(Math.max(...data.byWeekday));

  return (
    <ScrollView style={S.screen} contentContainerStyle={S.content}>
      <Text style={S.h1}>📈 Thống kê</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        <View style={S.row}>
          {years.map((y) => (
            <Chip key={y} label={`Năm ${y}`} active={year === y} onPress={() => setYear(y)} />
          ))}
        </View>
      </ScrollView>

      <View style={[S.row, { gap: 10, marginTop: 4 }]}>
        <StatCard label="Tổng lượt tập" value={String(data.totalSessions)} sub={`${data.activeDays} ngày có tập`} />
        <StatCard label="Tổng số hiệp" value={data.totalSets.toLocaleString('vi-VN')} sub={`TB ${(data.totalSets / Math.max(1, data.totalSessions)).toFixed(1)} hiệp/lượt`} />
      </View>
      <View style={[S.row, { gap: 10, marginTop: 10 }]}>
        <StatCard label="Tổng số cái" value={data.totalReps.toLocaleString('vi-VN')} sub={`TB tháng ${Math.round(data.totalReps / activeMonths).toLocaleString('vi-VN')} cái`} />
        <StatCard label="Chuỗi dài nhất" value={`${data.longest} ngày`} sub="liên tiếp trong năm" />
      </View>
      {data.totalVolume > 0 && (
        <View style={[S.card, { marginTop: 10 }]}>
          <Text style={{ fontSize: 14.5 }}>
            🏋️ Tổng khối lượng tạ đã nâng trong năm: <Text style={{ fontWeight: '800', color: C.green }}>
              {data.totalVolume.toLocaleString('vi-VN')} kg×cái
            </Text>
          </Text>
        </View>
      )}

      <SectionTitle>📊 Số cái theo từng tháng — năm {year}</SectionTitle>
      <View style={S.card}>
        {data.byMonth.map((m) => (
          <View key={m.month} style={{ marginBottom: 9 }}>
            <View style={[S.row, { justifyContent: 'space-between' }]}>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: C.ink, width: 74 }}>{MONTH_NAMES[m.month]}</Text>
              <Text style={{ fontSize: 12.5, color: C.sub }}>
                {m.days} ngày · {m.sets} hiệp · <Text style={{ fontWeight: '800', color: C.green }}>{m.reps.toLocaleString('vi-VN')} cái</Text>
              </Text>
            </View>
            <View style={{ height: 10, backgroundColor: C.bg, borderRadius: 6, marginTop: 4, overflow: 'hidden' }}>
              <View style={{ height: 10, borderRadius: 6, backgroundColor: C.greenMid, width: `${(m.reps / maxMonthReps) * 100}%` }} />
            </View>
          </View>
        ))}
      </View>

      <SectionTitle>🏆 Kỷ lục cá nhân năm {year}</SectionTitle>
      <View style={S.card}>
        {data.bestDay ? (
          <>
            <Text style={{ fontSize: 14.5, lineHeight: 22 }}>
              Ngày tập nhiều nhất: <Text style={{ fontWeight: '800', color: C.green }}>{formatVN((data.bestDay as any).date)}</Text>{' '}
              với <Text style={{ fontWeight: '800' }}>{(data.bestDay as any).reps} cái</Text>
            </Text>
            {data.biggestSession && (
              <Text style={{ fontSize: 14.5, lineHeight: 22, marginTop: 4 }}>
                Buổi tập lớn nhất: <Text style={{ fontWeight: '800' }}>{data.biggestSession.name}</Text> —{' '}
                {data.biggestSession.reps} cái ({formatVN(data.biggestSession.date)})
              </Text>
            )}
            <Text style={{ fontSize: 14.5, lineHeight: 22, marginTop: 4 }}>
              Bạn hay tập nhất vào: <Text style={{ fontWeight: '800', color: C.green }}>
                {['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][bestWeekdayIdx]}
              </Text>{' '}
              ({data.byWeekday[bestWeekdayIdx]} buổi)
            </Text>
            <View style={[S.row, { gap: 6, marginTop: 10, flexWrap: 'wrap' }]}>
              {data.byWeekday.map((count, i) => (
                <View key={i} style={{
                  backgroundColor: i === bestWeekdayIdx ? C.green : C.greenSoft,
                  borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center',
                }}
                >
                  <Text style={{ fontWeight: '800', color: i === bestWeekdayIdx ? '#fff' : C.green }}>{weekdayLabels[i]}</Text>
                  <Text style={{ fontSize: 11.5, color: i === bestWeekdayIdx ? '#fff' : C.sub }}>{count} buổi</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={S.muted}>Chưa có dữ liệu trong năm {year} để tính kỷ lục.</Text>
        )}
      </View>

      <SectionTitle>🥇 Xếp hạng bài tập theo tổng số cái</SectionTitle>
      <View style={S.card}>
        {data.exerciseRank.length === 0 && <Text style={S.muted}>Chưa có bài tập nào trong năm {year}.</Text>}
        {data.exerciseRank.map((x, idx) => (
          <View key={x.name} style={{ marginBottom: 11 }}>
            <View style={[S.row, { justifyContent: 'space-between' }]}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink, flex: 1 }}>
                {idx + 1}. {x.name}
              </Text>
              <Text style={{ fontSize: 12.5, color: C.sub }}>
                {x.sessions} lượt · {x.sets} hiệp · hiệp tốt nhất {x.bestSet}
              </Text>
            </View>
            <View style={[S.row, { gap: 8, marginTop: 4 }]}>
              <View style={{ flex: 1, height: 10, backgroundColor: C.bg, borderRadius: 6, overflow: 'hidden' }}>
                <View style={{ height: 10, backgroundColor: idx === 0 ? C.gold : C.greenMid, width: `${(x.reps / maxExerciseReps) * 100}%`, borderRadius: 6 }} />
              </View>
              <Text style={{ fontWeight: '800', color: C.green, width: 74, textAlign: 'right' }}>
                {x.reps.toLocaleString('vi-VN')} cái
              </Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity>
        <Text style={[S.muted, { textAlign: 'center' }]}>Số liệu tự động tính từ Nhật ký — ghi càng đều, thống kê càng đẹp.</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
