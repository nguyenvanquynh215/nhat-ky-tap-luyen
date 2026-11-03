import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import StatsScreen from './src/screens/StatsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WorkoutModal from './src/components/WorkoutModal';
import { C } from './src/components/ui';
import type { WorkoutEntry } from './src/types';
import * as WebBrowser from 'expo-web-browser';

// Hoàn tất phiên đăng nhập OAuth (Google/Facebook) khi trình duyệt quay lại app
WebBrowser.maybeCompleteAuthSession();

type Tab = 'home' | 'calendar' | 'history' | 'stats' | 'profile';

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'home', icon: '🏠', label: 'Trang chủ' },
  { key: 'calendar', icon: '📅', label: 'Lịch năm' },
  { key: 'history', icon: '📖', label: 'Nhật ký' },
  { key: 'stats', icon: '📈', label: 'Thống kê' },
  { key: 'profile', icon: '👤', label: 'Cá nhân' },
];

function MainApp() {
  const { ready, user } = useApp();
  const [tab, setTab] = useState<Tab>('home');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<WorkoutEntry | null>(null);
  const [initialDate, setInitialDate] = useState<string | undefined>();

  if (!ready) {
    return (
      <View style={local.center}>
        <Text style={{ fontSize: 44 }}>🏋️</Text>
        <ActivityIndicator color={C.green} style={{ marginTop: 14 }} />
        <Text style={{ color: C.sub, marginTop: 8 }}>Đang tải Exercise Diary…</Text>
      </View>
    );
  }

  if (!user) return <AuthScreen />;

  const openAdd = (date?: string) => {
    setEditing(null);
    setInitialDate(date);
    setModalVisible(true);
  };
  const openEdit = (entry: WorkoutEntry) => {
    setEditing(entry);
    setInitialDate(undefined);
    setModalVisible(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1 }}>
        {tab === 'home' && (
          <HomeScreen onAdd={openAdd} onEdit={openEdit} goCalendar={() => setTab('calendar')} />
        )}
        {tab === 'calendar' && <CalendarScreen onAdd={openAdd} onEdit={openEdit} />}
        {tab === 'history' && <HistoryScreen onAdd={() => openAdd()} onEdit={openEdit} />}
        {tab === 'stats' && <StatsScreen />}
        {tab === 'profile' && <ProfileScreen />}
      </View>

      {/* Nút ghi nhanh nổi */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Ghi buổi tập mới"
        style={local.fab}
        onPress={() => openAdd()}
      >
        <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', marginTop: -2 }}>＋</Text>
      </TouchableOpacity>

      <View style={local.tabBar}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              accessibilityRole="button"
              style={local.tabItem}
              onPress={() => setTab(t.key)}
            >
              <Text style={{ fontSize: 21, opacity: active ? 1 : 0.55 }}>{t.icon}</Text>
              <Text style={{
                fontSize: 11.5, fontWeight: active ? '800' : '500',
                color: active ? C.green : C.sub,
              }}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <WorkoutModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        editing={editing}
        initialDate={initialDate}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <AppProvider>
          <MainApp />
        </AppProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const local = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.line,
    paddingTop: 7, paddingBottom: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 1 },
  fab: {
    position: 'absolute', right: 18, bottom: 86, width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.green, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 6, zIndex: 10,
  },
});
