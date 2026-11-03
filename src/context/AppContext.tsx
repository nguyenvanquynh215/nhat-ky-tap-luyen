import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateSampleEntries } from '../lib/sampleData';
import { PRESET_EXERCISES } from '../lib/presets';
import type { Exercise, UserInfo, WorkoutEntry } from '../types';

// ─── Khóa lưu trữ cục bộ (chế độ demo / dự phòng khi mất mạng) ───────────────
const K = {
  demoUser: 'fitlog_demo_user_v1',
  demoOtp: 'fitlog_demo_otp_v1',
  entries: (owner: string) => `fitlog_entries_v1_${owner}`,
  customExercises: 'fitlog_custom_exercises_v1',
  seeded: (owner: string) => `fitlog_seeded_v1_${owner}`,
};

interface AppContextValue {
  ready: boolean;
  user: UserInfo | null;
  /** true = đang dùng Supabase thật, false = chế độ demo trên máy */
  isRemote: boolean;
  entries: WorkoutEntry[];
  exercises: Exercise[];
  /** Gửi mã OTP: Supabase gửi email thật; demo thì trả mã về để hiện trong app */
  sendOtp: (email: string) => Promise<{ demoCode?: string }>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  /** Đăng nhập bằng Google/Facebook qua Supabase OAuth (cần bật provider trên Supabase) */
  signInWithProvider: (provider: 'google' | 'facebook') => Promise<void>;
  signOut: () => Promise<void>;
  addEntry: (e: Omit<WorkoutEntry, 'id'> & { id?: string }) => Promise<void>;
  updateEntry: (e: WorkoutEntry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  addCustomExercise: (ex: Exercise) => Promise<void>;
  clearAllData: () => Promise<void>;
  importEntries: (list: WorkoutEntry[]) => Promise<void>;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp phải nằm trong AppProvider');
  return ctx;
};

const uid = () =>
  `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [entries, setEntries] = useState<WorkoutEntry[]>([]);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const userRef = useRef<UserInfo | null>(null);
  userRef.current = user;

  const isRemote = isSupabaseConfigured;

  // ── Tải dữ liệu theo chủ sở hữu ──────────────────────────────────────────
  const loadEntries = useCallback(async (owner: UserInfo) => {
    if (isRemote && supabase) {
      const { data, error } = await supabase
        .from('workout_entries')
        .select('*')
        .eq('user_id', owner.id)
        .order('workout_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5000);
      if (!error && data) {
        setEntries(data as WorkoutEntry[]);
        // lưu bản sao cục bộ để xem offline
        await AsyncStorage.setItem(K.entries(owner.id), JSON.stringify(data));
        return;
      }
      // mất mạng / lỗi → rơi xuống bản sao cục bộ
    }
    const raw = await AsyncStorage.getItem(K.entries(owner.id));
    if (raw) {
      try { setEntries(JSON.parse(raw)); return; } catch { /* bỏ qua */ }
    }
    // Lần đầu ở chế độ demo → nạp dữ liệu mẫu để thấy ngay giá trị của app
    if (!isRemote) {
      const already = await AsyncStorage.getItem(K.seeded(owner.id));
      if (!already) {
        const sample = generateSampleEntries(new Date().getFullYear());
        setEntries(sample);
        await AsyncStorage.setItem(K.entries(owner.id), JSON.stringify(sample));
        await AsyncStorage.setItem(K.seeded(owner.id), '1');
        return;
      }
    }
    setEntries([]);
  }, [isRemote]);

  const persistLocal = useCallback(async (list: WorkoutEntry[]) => {
    const owner = userRef.current;
    if (owner) await AsyncStorage.setItem(K.entries(owner.id), JSON.stringify(list));
  }, []);

  // ── Khởi tạo phiên đăng nhập ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const rawEx = await AsyncStorage.getItem(K.customExercises);
        if (rawEx) { try { setCustomExercises(JSON.parse(rawEx)); } catch { /* */ } }

        if (isRemote && supabase) {
          const { data } = await supabase.auth.getSession();
          const u = data.session?.user;
          if (u) {
            const info = { id: u.id, email: u.email || '' };
            setUser(info);
            await loadEntries(info);
          }
          supabase.auth.onAuthStateChange(async (_evt, session) => {
            const nu = session?.user;
            if (nu) {
              const info = { id: nu.id, email: nu.email || '' };
              setUser(info);
              await loadEntries(info);
            } else {
              setUser(null);
              setEntries([]);
            }
          });
        } else {
          const raw = await AsyncStorage.getItem(K.demoUser);
          if (raw) {
            try {
              const info = JSON.parse(raw) as UserInfo;
              setUser(info);
              await loadEntries(info);
            } catch { /* */ }
          }
        }
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── OTP ───────────────────────────────────────────────────────────────────
  const sendOtp = useCallback(async (email: string) => {
    const clean = email.trim().toLowerCase();
    if (isRemote && supabase) {
      const { error } = await supabase.auth.signInWithOtp({
        email: clean,
        options: { shouldCreateUser: true },
      });
      if (error) throw new Error(error.message);
      return {};
    }
    // DEMO: sinh mã 6 số, "gửi email giả lập" — hiện mã ngay trong app để test
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await AsyncStorage.setItem(
      K.demoOtp,
      JSON.stringify({ email: clean, code, expires: Date.now() + 10 * 60 * 1000 }),
    );
    return { demoCode: code };
  }, [isRemote]);

  const verifyOtp = useCallback(async (email: string, code: string) => {
    const clean = email.trim().toLowerCase();
    const token = code.trim();
    if (isRemote && supabase) {
      const { data, error } = await supabase.auth.verifyOtp({
        email: clean, token, type: 'email',
      });
      if (error) throw new Error('Mã OTP không đúng hoặc đã hết hạn. Hãy kiểm tra lại email.');
      const u = data.user;
      if (!u) throw new Error('Không tạo được phiên đăng nhập. Thử lại nhé.');
      const info = { id: u.id, email: u.email || clean };
      setUser(info);
      await loadEntries(info);
      return;
    }
    const raw = await AsyncStorage.getItem(K.demoOtp);
    if (!raw) throw new Error('Chưa có mã OTP nào được gửi. Hãy bấm "Gửi mã" trước.');
    const saved = JSON.parse(raw) as { email: string; code: string; expires: number };
    if (saved.email !== clean) throw new Error('Email không khớp với email đã nhận mã.');
    if (Date.now() > saved.expires) throw new Error('Mã OTP đã hết hạn (10 phút). Hãy gửi lại mã mới.');
    if (saved.code !== token) throw new Error('Mã OTP chưa đúng. Kiểm tra lại 6 số nhé.');
    const info: UserInfo = {
      id: `demo-${clean.replace(/[^a-z0-9]/g, '_')}`,
      email: clean,
    };
    await AsyncStorage.setItem(K.demoUser, JSON.stringify(info));
    await AsyncStorage.removeItem(K.demoOtp);
    setUser(info);
    await loadEntries(info);
  }, [isRemote, loadEntries]);

  const signInWithProvider = useCallback(async (provider: 'google' | 'facebook') => {
    if (!isRemote || !supabase) {
      throw new Error('Đăng nhập bằng Google/Facebook cần Supabase thật — chế độ demo chỉ dùng email + OTP.');
    }
    const label = provider === 'google' ? 'Google' : 'Facebook';
    const redirectTo = Linking.createURL('auth-callback');

    // Trên web: Supabase tự chuyển hướng cả trang tới nhà cung cấp
    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      return;
    }

    // Trên app: mở trình duyệt trong app, chờ quay lại bằng deep link
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data?.url) throw new Error(`Không lấy được đường dẫn đăng nhập ${label}.`);

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') {
      // Người dùng tự đóng trình duyệt → không coi là lỗi
      throw Object.assign(new Error('cancelled'), { code: 'AUTH_CANCELLED' });
    }

    const returned = result.url;
    const params = new URLSearchParams(returned.split('?')[1]?.split('#')[0] ?? '');
    const errText = params.get('error_description') || params.get('error');
    if (errText) {
      if (/not enabled|unsupported provider/i.test(errText)) {
        throw new Error(`Đăng nhập ${label} chưa được bật trên Supabase. Cần cấu hình provider ${label} trong Supabase Dashboard rồi thử lại.`);
      }
      throw new Error(errText);
    }
    const code = params.get('code');
    if (code) {
      const { error: exError } = await supabase.auth.exchangeCodeForSession(code);
      if (exError) throw exError;
      return;
    }
    // Dự phòng: token nằm ở phần #fragment (flow implicit)
    const frag = new URLSearchParams(returned.split('#')[1] ?? '');
    const access_token = frag.get('access_token');
    const refresh_token = frag.get('refresh_token');
    if (access_token && refresh_token) {
      const { error: sError } = await supabase.auth.setSession({ access_token, refresh_token });
      if (sError) throw sError;
      return;
    }
    throw new Error(`Đăng nhập ${label} chưa hoàn tất. Thử lại nhé.`);
  }, [isRemote]);

  const signOut = useCallback(async () => {
    if (isRemote && supabase) await supabase.auth.signOut();
    await AsyncStorage.removeItem(K.demoUser);
    setUser(null);
    setEntries([]);
  }, [isRemote]);

  // ── CRUD buổi tập ─────────────────────────────────────────────────────────
  const addEntry = useCallback(async (e: Omit<WorkoutEntry, 'id'> & { id?: string }) => {
    const owner = userRef.current;
    if (!owner) throw new Error('Chưa đăng nhập');
    const row: WorkoutEntry = { ...e, id: e.id || uid(), user_id: owner.id };
    if (isRemote && supabase) {
      const { data, error } = await supabase
        .from('workout_entries')
        .insert({
          user_id: owner.id,
          exercise_name: row.exercise_name,
          category: row.category,
          workout_date: row.workout_date,
          sets: row.sets,
          notes: row.notes || null,
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      const saved = data as WorkoutEntry;
      setEntries((prev) => {
        const next = [saved, ...prev];
        void persistLocal(next);
        return next;
      });
      return;
    }
    setEntries((prev) => {
      const next = [row, ...prev];
      void persistLocal(next);
      return next;
    });
  }, [isRemote, persistLocal]);

  const updateEntry = useCallback(async (e: WorkoutEntry) => {
    if (isRemote && supabase) {
      const { error } = await supabase
        .from('workout_entries')
        .update({
          exercise_name: e.exercise_name,
          category: e.category,
          workout_date: e.workout_date,
          sets: e.sets,
          notes: e.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', e.id);
      if (error) throw new Error(error.message);
    }
    setEntries((prev) => {
      const next = prev.map((x) => (x.id === e.id ? e : x));
      void persistLocal(next);
      return next;
    });
  }, [isRemote, persistLocal]);

  const deleteEntry = useCallback(async (id: string) => {
    if (isRemote && supabase) {
      const { error } = await supabase.from('workout_entries').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
    setEntries((prev) => {
      const next = prev.filter((x) => x.id !== id);
      void persistLocal(next);
      return next;
    });
  }, [isRemote, persistLocal]);

  const clearAllData = useCallback(async () => {
    const owner = userRef.current;
    if (!owner) return;
    if (isRemote && supabase) {
      await supabase.from('workout_entries').delete().eq('user_id', owner.id);
    }
    setEntries([]);
    await AsyncStorage.setItem(K.entries(owner.id), JSON.stringify([]));
    await AsyncStorage.setItem(K.seeded(owner.id), '1'); // không nạp lại dữ liệu mẫu
  }, [isRemote]);

  const importEntries = useCallback(async (list: WorkoutEntry[]) => {
    for (const item of list) {
      // eslint-disable-next-line no-await-in-loop
      await addEntry({
        exercise_name: item.exercise_name,
        category: item.category || 'Khác',
        workout_date: item.workout_date,
        sets: Array.isArray(item.sets) ? item.sets : [],
        notes: item.notes || null,
      });
    }
  }, [addEntry]);

  const addCustomExercise = useCallback(async (ex: Exercise) => {
    setCustomExercises((prev) => {
      if (prev.some((x) => x.name.toLowerCase() === ex.name.toLowerCase())) return prev;
      const next = [...prev, { ...ex, custom: true }];
      void AsyncStorage.setItem(K.customExercises, JSON.stringify(next));
      return next;
    });
    const owner = userRef.current;
    if (isRemote && supabase && owner) {
      await supabase.from('exercises').insert({
        user_id: owner.id, name: ex.name, category: ex.category, icon: ex.icon, unit: ex.unit,
      });
    }
  }, [isRemote]);

  const refresh = useCallback(async () => {
    const owner = userRef.current;
    if (owner) await loadEntries(owner);
  }, [loadEntries]);

  const value = useMemo<AppContextValue>(() => ({
    ready,
    user,
    isRemote,
    entries,
    exercises: [...PRESET_EXERCISES, ...customExercises],
    sendOtp,
    verifyOtp,
    signInWithProvider,
    signOut,
    addEntry,
    updateEntry,
    deleteEntry,
    addCustomExercise,
    clearAllData,
    importEntries,
    refresh,
  }), [ready, user, isRemote, entries, customExercises, sendOtp, verifyOtp, signInWithProvider, signOut,
    addEntry, updateEntry, deleteEntry, addCustomExercise, clearAllData, importEntries, refresh]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
