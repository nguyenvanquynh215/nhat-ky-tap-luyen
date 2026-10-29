import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { CATEGORIES, SET_TEMPLATES } from '../lib/presets';
import { addDays, formatVN, todayKey } from '../lib/dates';
import { totalRepsOf, type WorkoutEntry, type WorkoutSet } from '../types';
import { C, Chip, PrimaryButton, Stepper, styles as S } from './ui';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Nếu có → đang sửa buổi tập này; nếu null → ghi buổi mới */
  editing?: WorkoutEntry | null;
  /** Ngày mặc định khi mở modal (ví dụ bấm vào 1 ngày trên lịch năm) */
  initialDate?: string;
}

export default function WorkoutModal({ visible, onClose, editing, initialDate }: Props) {
  const { exercises, addEntry, updateEntry, deleteEntry, addCustomExercise } = useApp();

  const [exerciseName, setExerciseName] = useState('');
  const [category, setCategory] = useState('Ngực');
  const [date, setDate] = useState(todayKey());
  const [sets, setSets] = useState<WorkoutSet[]>([{ reps: 10 }, { reps: 10 }, { reps: 10 }]);
  const [notes, setNotes] = useState('');
  const [customName, setCustomName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setError('');
    if (editing) {
      setExerciseName(editing.exercise_name);
      setCategory(editing.category);
      setDate(editing.workout_date);
      setSets(editing.sets?.length ? editing.sets.map((s) => ({ ...s })) : [{ reps: 10 }]);
      setNotes(editing.notes || '');
    } else {
      setExerciseName('');
      setCategory('Ngực');
      setDate(initialDate || todayKey());
      setSets([{ reps: 10 }, { reps: 10 }, { reps: 10 }]);
      setNotes('');
    }
    setCustomName('');
  }, [visible, editing, initialDate]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof exercises>();
    for (const ex of exercises) {
      const list = map.get(ex.category) || [];
      list.push(ex);
      map.set(ex.category, list);
    }
    return Array.from(map.entries());
  }, [exercises]);

  const pickExercise = (name: string, cat: string) => {
    setExerciseName(name);
    setCategory(cat);
  };

  const updateSet = (idx: number, patch: Partial<WorkoutSet>) =>
    setSets((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const totalReps = sets.reduce((sum, s) => sum + (Number(s.reps) || 0), 0);

  const handleAddCustom = async () => {
    const name = customName.trim();
    if (!name) return;
    await addCustomExercise({ name, category, icon: '⭐', unit: 'cái', custom: true });
    setExerciseName(name);
    setCustomName('');
  };

  const handleSave = async () => {
    setError('');
    if (!exerciseName.trim()) { setError('Hãy chọn hoặc nhập tên bài tập.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { setError('Ngày phải đúng dạng YYYY-MM-DD (ví dụ 2026-10-29).'); return; }
    const cleanSets = sets
      .map((s) => ({ reps: Math.max(0, Math.round(Number(s.reps) || 0)), weight_kg: s.weight_kg ? Number(s.weight_kg) : null }))
      .filter((s) => s.reps > 0);
    if (!cleanSets.length) { setError('Ít nhất 1 hiệp phải có số cái lớn hơn 0.'); return; }
    setBusy(true);
    try {
      if (editing) {
        await updateEntry({
          ...editing,
          exercise_name: exerciseName.trim(),
          category,
          workout_date: date,
          sets: cleanSets,
          notes: notes.trim() || null,
        });
      } else {
        await addEntry({
          exercise_name: exerciseName.trim(),
          category,
          workout_date: date,
          sets: cleanSets,
          notes: notes.trim() || null,
        });
      }
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Không lưu được. Thử lại nhé.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    if (!editing) return;
    const doDelete = async () => {
      setBusy(true);
      try { await deleteEntry(editing.id); onClose(); }
      catch (e: any) { setError(e?.message || 'Không xóa được.'); }
      finally { setBusy(false); }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Xóa buổi tập "${editing.exercise_name}" ngày ${formatVN(editing.workout_date)}?`)) void doDelete();
    } else {
      Alert.alert('Xóa buổi tập?', `${editing.exercise_name} — ${formatVN(editing.workout_date)}`, [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => void doDelete() },
      ]);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={local.header}>
          <TouchableOpacity onPress={onClose}><Text style={local.headerBtn}>✕ Đóng</Text></TouchableOpacity>
          <Text style={S.h2}>{editing ? 'Sửa buổi tập' : 'Ghi buổi tập mới'}</Text>
          <View style={{ width: 64 }} />
        </View>

        <ScrollView contentContainerStyle={[S.content, { paddingTop: 6 }]} keyboardShouldPersistTaps="handled">
          {/* Ngày tập */}
          <Text style={S.label}>NGÀY TẬP</Text>
          <View style={[S.row, { gap: 8, flexWrap: 'wrap' }]}>
            <TouchableOpacity style={local.dayBtn} onPress={() => setDate(addDays(date, -1))}>
              <Text style={local.dayBtnText}>‹ Hôm trước</Text>
            </TouchableOpacity>
            <TextInput
              style={[S.input, { flex: 1, minWidth: 130, textAlign: 'center', fontWeight: '700' }]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
            />
            <TouchableOpacity style={local.dayBtn} onPress={() => setDate(addDays(date, 1))}>
              <Text style={local.dayBtnText}>Hôm sau ›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={local.dayBtn} onPress={() => setDate(todayKey())}>
              <Text style={local.dayBtnText}>Hôm nay</Text>
            </TouchableOpacity>
          </View>
          <Text style={[S.muted, { marginTop: 6 }]}>{/^\d{4}-\d{2}-\d{2}$/.test(date) ? formatVN(date) : ''}</Text>

          {/* Chọn bài tập */}
          <Text style={S.label}>BÀI TẬP</Text>
          {grouped.map(([cat, list]) => (
            <View key={cat} style={{ marginBottom: 2 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: C.sub, marginBottom: 6 }}>{cat.toUpperCase()}</Text>
              <View style={[S.row, { flexWrap: 'wrap' }]}>
                {list.map((ex) => (
                  <Chip
                    key={ex.name}
                    label={`${ex.icon} ${ex.name}`}
                    active={exerciseName === ex.name}
                    onPress={() => pickExercise(ex.name, ex.category)}
                  />
                ))}
              </View>
            </View>
          ))}
          <View style={[S.row, { gap: 8, marginTop: 6 }]}>
            <TextInput
              style={[S.input, { flex: 1 }]}
              placeholder="Hoặc tự nhập bài tập mới…"
              placeholderTextColor="#9AA79D"
              value={customName}
              onChangeText={setCustomName}
            />
            <TouchableOpacity style={local.dayBtn} onPress={handleAddCustom}>
              <Text style={local.dayBtnText}>+ Thêm bài</Text>
            </TouchableOpacity>
          </View>
          {!!exerciseName && (
            <Text style={{ marginTop: 8, fontSize: 14 }}>
              Đã chọn: <Text style={{ fontWeight: '800', color: C.green }}>{exerciseName}</Text>
              <Text style={{ color: C.sub }}> · nhóm {category}</Text>
            </Text>
          )}

          {/* Mẫu hiệp nhanh */}
          <Text style={S.label}>MẪU HIỆP NHANH</Text>
          <View style={[S.row, { flexWrap: 'wrap' }]}>
            {SET_TEMPLATES.map((t) => (
              <Chip
                key={t.label}
                label={t.label}
                onPress={() => setSets(t.sets.map((reps) => ({ reps })))}
              />
            ))}
          </View>

          {/* Danh sách hiệp */}
          <Text style={S.label}>CÁC HIỆP — MỖI HIỆP BAO NHIÊU CÁI?</Text>
          <View style={S.card}>
            {sets.map((s, i) => (
              <View key={i} style={[local.setRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                <Text style={local.setIndex}>Hiệp {i + 1}</Text>
                <Stepper value={Number(s.reps) || 0} onChange={(v) => updateSet(i, { reps: v })} min={0} />
                <Text style={{ color: C.sub, fontSize: 13 }}>cái</Text>
                <TextInput
                  style={[S.input, { width: 74, paddingVertical: 7, textAlign: 'center' }]}
                  placeholder="kg"
                  placeholderTextColor="#B7C2B4"
                  keyboardType="numeric"
                  value={s.weight_kg ? String(s.weight_kg) : ''}
                  onChangeText={(t) => updateSet(i, { weight_kg: t === '' ? null : Number(t.replace(/[^0-9.]/g, '')) })}
                />
                <TouchableOpacity
                  onPress={() => setSets((prev) => [...prev.slice(0, i), { ...prev[i] }, ...prev.slice(i)])}
                  style={local.miniBtn}
                >
                  <Text style={local.miniBtnText}>⧉</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSets((prev) => (prev.length > 1 ? prev.filter((_, x) => x !== i) : prev))}
                  style={local.miniBtn}
                >
                  <Text style={[local.miniBtnText, { color: C.red }]}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={[local.dayBtn, { alignSelf: 'flex-start', marginTop: 10 }]}
              onPress={() => setSets((prev) => [...prev, { reps: prev[prev.length - 1]?.reps || 10 }])}
            >
              <Text style={local.dayBtnText}>+ Thêm hiệp</Text>
            </TouchableOpacity>
            <View style={local.totalBox}>
              <Text style={{ fontSize: 15 }}>
                Tổng: <Text style={{ fontWeight: '800', color: C.green }}>{sets.length} hiệp · {totalReps} cái</Text>
              </Text>
            </View>
          </View>

          <Text style={S.label}>GHI CHÚ (TÙY CHỌN)</Text>
          <TextInput
            style={[S.input, { minHeight: 64, textAlignVertical: 'top' }]}
            placeholder="Ví dụ: hiệp cuối hơi đuối, lần sau tăng tạ…"
            placeholderTextColor="#9AA79D"
            multiline
            value={notes}
            onChangeText={setNotes}
          />

          {!!error && <Text style={{ color: C.red, marginTop: 12, fontSize: 14 }}>{error}</Text>}

          <View style={{ height: 16 }} />
          <PrimaryButton title={editing ? 'Lưu thay đổi ✓' : '＋ Ghi buổi tập này'} onPress={handleSave} loading={busy} />
          {editing && (
            <>
              <View style={{ height: 10 }} />
              <PrimaryButton title="🗑 Xóa buổi tập này" onPress={handleDelete} color={C.red} />
              <Text style={[S.muted, { marginTop: 8, textAlign: 'center' }]}>
                Buổi này hiện có {editing.sets?.length || 0} hiệp · {totalRepsOf(editing)} cái
              </Text>
            </>
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const local = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  headerBtn: { color: C.green, fontWeight: '700', fontSize: 15, width: 64 },
  dayBtn: {
    borderWidth: 1, borderColor: C.line, backgroundColor: C.card,
    borderRadius: 10, paddingHorizontal: 11, paddingVertical: 10,
  },
  dayBtnText: { fontSize: 13.5, fontWeight: '700', color: C.green },
  setRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, flexWrap: 'wrap',
  },
  setIndex: { fontSize: 14.5, fontWeight: '800', color: C.ink, width: 58 },
  miniBtn: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  miniBtnText: { fontSize: 15, color: C.sub, fontWeight: '700' },
  totalBox: {
    marginTop: 12, backgroundColor: C.greenSoft, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
});
