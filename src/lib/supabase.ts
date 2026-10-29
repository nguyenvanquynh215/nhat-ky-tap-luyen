import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Đọc từ biến môi trường Expo (file .env) — xem .env.example
const SUPABASE_URL: string =
  process.env.EXPO_PUBLIC_SUPABASE_URL || (Constants.expoConfig?.extra?.supabaseUrl ?? '');
const SUPABASE_ANON_KEY: string =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || (Constants.expoConfig?.extra?.supabaseAnonKey ?? '');

export const APP_WEB_URL: string =
  process.env.EXPO_PUBLIC_APP_WEB_URL || 'https://nhat-ky-tap-luyen.expo.app';

/** Đã cấu hình Supabase thật hay chưa? Chưa → app chạy CHẾ ĐỘ DEMO (OTP giả lập + lưu trên máy) */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Trên web: cho phép mở link đăng nhập (magic link) từ email
        detectSessionInUrl: true,
      },
    })
  : null;
