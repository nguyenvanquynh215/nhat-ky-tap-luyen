import React, { useState } from 'react';
import {
  Alert, Platform, ScrollView, Share, StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useApp } from '../context/AppContext';
import { APP_WEB_URL } from '../lib/supabase';
import { totalRepsOf, type WorkoutEntry } from '../types';
import { C, GhostButton, PrimaryButton, styles as S } from '../components/ui';

function downloadOnWeb(filename: string, content: string, mime: string) {
  if (Platform.OS !== 'web') return false;
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}

async function shareText(title: string, text: string) {
  if (Platform.OS === 'web') {
    const nav: any = navigator;
    if (nav.share) {
      try { await nav.share({ title, text }); return; } catch { /* người dùng hủy */ }
    }
    try { await nav.clipboard.writeText(text); Alert.alert('Đã sao chép', 'Nội dung đã được copy — dán vào nơi bạn muốn chia sẻ.'); return; } catch { /* */ }
    Alert.alert(title, text);
    return;
  }
  await Share.share({ title, message: text });
}

export default function ProfileScreen() {
  const {
    user, isRemote, entries, signOut, clearAllData, importEntries, refresh,
  } = useApp();
  const [busy, setBusy] = useState('');
  const [importText, setImportText] = useState('');
  const [notice, setNotice] = useState('');

  const webUrl = Linking.createURL('/') && APP_WEB_URL ? APP_WEB_URL : '';

  const handleShareApp = async () => {
    await shareText(
      'Nhật Ký Tập Luyện',
      `🏋️ Mình đang dùng app Nhật Ký Tập Luyện để ghi số hiệp / số cái mỗi buổi và xem lịch tập cả năm.\nMở link này là dùng ngay trên trình duyệt, không cần tải app:\n${APP_WEB_URL}\n(Cài Android: mở link bằng Expo Go hoặc bản APK trong repo GitHub.)`,
    );
  };

  const handleShareAchievement = async () => {
    const year = new Date().getFullYear();
    const list = entries.filter((e) => e.workout_date.startsWith(`${year}-`));
    const days = new Set(list.map((e) => e.workout_date)).size;
    const reps = list.reduce((s, e) => s + totalRepsOf(e), 0);
    const sets = list.reduce((s, e) => s + e.sets.length, 0);
    await shareText(
      'Thành tích tập luyện',
      `💪 Năm ${year} mình đã tập ${days} ngày · ${sets} hiệp · ${reps.toLocaleString('vi-VN')} cái!\nTheo dõi nhật ký tập luyện tại: ${APP_WEB_URL}`,
    );
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setBusy(format);
    try {
      if (format === 'json') {
        const content = JSON.stringify(entries, null, 2);
        if (!downloadOnWeb('nhat-ky-tap-luyen.json', content, 'application/json')) {
          await shareText('Xuất dữ liệu nhật ký (JSON)', content);
        }
      } else {
        const header = 'ngay, bai_tap, nhom, so_hiep, chi_tiet_hiep, tong_cai, ghi_chu';
        const lines = entries.map((e) => [
          e.workout_date,
          `"${e.exercise_name.replace(/"/g, '""')}"`,
          e.category,
          e.sets.length,
          `"${e.sets.map((s) => s.reps).join(' - ')}"`,
          totalRepsOf(e),
          `"${(e.notes || '').replace(/"/g, '""')}"`,
        ].join(','));
        const content = [header, ...lines].join('\n');
        if (!downloadOnWeb('nhat-ky-tap-luyen.csv', content, 'text/csv;charset=utf-8')) {
          await shareText('Xuất dữ liệu nhật ký (CSV)', content);
        }
      }
      setNotice(`Đã xuất ${entries.length} lượt tập dạng ${format.toUpperCase()}.`);
    } finally {
      setBusy('');
    }
  };

  const handleImport = async () => {
    setNotice('');
    try {
      const parsed = JSON.parse(importText) as WorkoutEntry[];
      if (!Array.isArray(parsed)) throw new Error('not-array');
      const valid = parsed.filter((x) => x && x.exercise_name && x.workout_date && Array.isArray(x.sets));
      if (!valid.length) throw new Error('empty');
      setBusy('import');
      await importEntries(valid);
      setImportText('');
      setNotice(`Đã nhập thêm ${valid.length} lượt tập ✔`);
    } catch {
      setNotice('Nội dung chưa đúng định dạng JSON đã xuất từ app. Hãy dán nguyên văn file JSON đã xuất.');
    } finally {
      setBusy('');
    }
  };

  const confirmClear = () => {
    const run = async () => { setBusy('clear'); try { await clearAllData(); setNotice('Đã xóa toàn bộ dữ liệu tập luyện.'); } finally { setBusy(''); } };
    if (Platform.OS === 'web') {
      if (window.confirm('Xóa TOÀN BỘ dữ liệu tập luyện? Hành động này không hoàn tác được.')) void run();
    } else {
      Alert.alert('Xóa toàn bộ dữ liệu?', 'Hành động này không hoàn tác được.', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa hết', style: 'destructive', onPress: () => void run() },
      ]);
    }
  };

  const confirmSignOut = () => {
    const run = async () => { await signOut(); };
    if (Platform.OS === 'web') {
      if (window.confirm('Đăng xuất khỏi ứng dụng?')) void run();
    } else {
      Alert.alert('Đăng xuất?', 'Dữ liệu đã lưu trên Supabase vẫn còn nguyên khi bạn đăng nhập lại.', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: () => void run() },
      ]);
    }
  };

  return (
    <ScrollView style={S.screen} contentContainerStyle={S.content}>
      <Text style={S.h1}>👤 Cá nhân</Text>

      <View style={[S.card, { marginTop: 12 }]}>
        <View style={[S.row, { gap: 12 }]}>
          <View style={local.avatar}>
            <Text style={{ fontSize: 24 }}>🏋️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16.5, fontWeight: '800', color: C.ink }}>{user?.email}</Text>
            <Text style={S.muted}>
              {isRemote ? '☁️ Đang lưu trên Supabase (đồng bộ mọi thiết bị)' : '📱 Chế độ demo — lưu trên máy này'}
            </Text>
          </View>
        </View>
        <Text style={[S.muted, { marginTop: 10 }]}>
          Tổng cộng đã ghi: <Text style={{ fontWeight: '800', color: C.green }}>{entries.length} lượt tập</Text> ·{' '}
          {entries.reduce((s, e) => s + totalRepsOf(e), 0).toLocaleString('vi-VN')} cái
        </Text>
      </View>

      {!isRemote && (
        <View style={S.banner}>
          <Text style={{ fontSize: 13.5, color: '#7A5B00', lineHeight: 19 }}>
            ⚙️ <Text style={{ fontWeight: '700' }}>Chưa nối Supabase thật.</Text> Để OTP gửi vào email thật và dữ liệu
            đồng bộ lên đám mây: tạo project Supabase → chạy file <Text style={{ fontWeight: '700' }}>supabase/schema.sql</Text> → điền
            2 khóa vào file <Text style={{ fontWeight: '700' }}>.env</Text> theo hướng dẫn trong README (khoảng 5 phút).
          </Text>
        </View>
      )}

      <Text style={local.section}>🔗 Chia sẻ</Text>
      <View style={S.card}>
        <Text style={S.muted}>
          Gửi link này cho bạn bè — họ mở link là thấy ngay giao diện web và dùng thử, không cần tải ứng dụng:
        </Text>
        <Text style={local.linkBox}>{webUrl}</Text>
        <View style={{ height: 10 }} />
        <PrimaryButton title="📤 Chia sẻ link ứng dụng" onPress={handleShareApp} />
        <View style={{ height: 10 }} />
        <GhostButton title="🏆 Chia sẻ thành tích năm nay" onPress={handleShareAchievement} />
      </View>

      <Text style={local.section}>💾 Dữ liệu của tôi</Text>
      <View style={S.card}>
        <View style={[S.row, { gap: 10 }]}>
          <View style={{ flex: 1 }}><GhostButton title={busy === 'csv' ? 'Đang xuất…' : 'Xuất CSV (Excel)'} onPress={() => handleExport('csv')} /></View>
          <View style={{ flex: 1 }}><GhostButton title={busy === 'json' ? 'Đang xuất…' : 'Xuất JSON'} onPress={() => handleExport('json')} /></View>
        </View>
        <View style={{ height: 10 }} />
        <GhostButton title="🔄 Tải lại dữ liệu từ máy chủ" onPress={async () => { setBusy('refresh'); try { await refresh(); setNotice('Đã tải lại dữ liệu ✔'); } finally { setBusy(''); } }} />
        <Text style={[S.label, { marginTop: 16 }]}>NHẬP DỮ LIỆU TỪ FILE JSON ĐÃ XUẤT</Text>
        <TextInput
          style={[S.input, { minHeight: 76, textAlignVertical: 'top' }]}
          placeholder="Dán nội dung JSON vào đây…"
          placeholderTextColor="#9AA79D"
          multiline
          value={importText}
          onChangeText={setImportText}
        />
        <View style={{ height: 10 }} />
        <GhostButton title={busy === 'import' ? 'Đang nhập…' : 'Nhập dữ liệu'} onPress={handleImport} />
        {!!notice && <Text style={{ color: C.green, fontWeight: '600', marginTop: 10, fontSize: 13.5 }}>{notice}</Text>}
      </View>

      <Text style={local.section}>⚠️ Vùng nguy hiểm</Text>
      <View style={S.card}>
        <GhostButton title={busy === 'clear' ? 'Đang xóa…' : '🗑 Xóa toàn bộ dữ liệu tập luyện'} onPress={confirmClear} danger />
        <View style={{ height: 10 }} />
        <PrimaryButton title="Đăng xuất" onPress={confirmSignOut} color={C.red} />
      </View>

      <Text style={[S.muted, { textAlign: 'center', marginTop: 8, fontSize: 12.5 }]}>
        Nhật Ký Tập Luyện v1.0 · Expo + Supabase{'\n'}
        Mã nguồn: GitHub nguyenvanquynh215/nhat-ky-tap-luyen
      </Text>
    </ScrollView>
  );
}

const local = StyleSheet.create({
  avatar: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: C.greenSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  section: { fontSize: 16.5, fontWeight: '800', color: C.ink, marginTop: 18, marginBottom: 10 },
  linkBox: {
    marginTop: 8, backgroundColor: C.bg, borderRadius: 10, padding: 10,
    fontSize: 13.5, color: C.green, fontWeight: '700',
  },
});
