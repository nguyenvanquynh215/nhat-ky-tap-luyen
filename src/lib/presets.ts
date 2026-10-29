import type { Exercise } from '../types';

/** Danh mục bài tập có sẵn — người dùng có thể thêm bài tự tạo trong app */
export const PRESET_EXERCISES: Exercise[] = [
  { name: 'Hít đất', category: 'Ngực', icon: '💪', unit: 'cái' },
  { name: 'Tập tạ tay (Bench Press)', category: 'Ngực', icon: '🏋️', unit: 'cái' },
  { name: 'Kéo xà đơn', category: 'Lưng', icon: '🧗', unit: 'cái' },
  { name: 'Deadlift', category: 'Lưng', icon: '🏋️', unit: 'cái' },
  { name: 'Squat (gánh tạ / ngồi xổm)', category: 'Chân', icon: '🦵', unit: 'cái' },
  { name: 'Đá chân / Leg Press', category: 'Chân', icon: '🦿', unit: 'cái' },
  { name: 'Nhún vai / Shoulder Press', category: 'Vai', icon: '🎯', unit: 'cái' },
  { name: 'Cuốn tay trước (Biceps)', category: 'Tay', icon: '💪', unit: 'cái' },
  { name: 'Tay sau (Triceps)', category: 'Tay', icon: '🔱', unit: 'cái' },
  { name: 'Gập bụng', category: 'Bụng', icon: '🔥', unit: 'cái' },
  { name: 'Plank', category: 'Bụng', icon: '🧘', unit: 'giây' },
  { name: 'Burpee', category: 'Toàn thân', icon: '⚡', unit: 'cái' },
  { name: 'Nhảy dây', category: 'Cardio', icon: '🪢', unit: 'cái' },
  { name: 'Chạy bộ', category: 'Cardio', icon: '🏃', unit: 'phút' },
  { name: 'Đạp xe', category: 'Cardio', icon: '🚴', unit: 'phút' },
  { name: 'Bơi lội', category: 'Cardio', icon: '🏊', unit: 'phút' },
  { name: 'Hít xà kép (Dips)', category: 'Ngực', icon: '💪', unit: 'cái' },
  { name: 'Chống đẩy kim cương', category: 'Tay', icon: '💎', unit: 'cái' },
];

export const CATEGORIES = [
  'Ngực', 'Lưng', 'Chân', 'Vai', 'Tay', 'Bụng', 'Toàn thân', 'Cardio', 'Khác',
];

/** Các mẫu hiệp nhanh hay dùng */
export const SET_TEMPLATES: { label: string; sets: number[] }[] = [
  { label: '3 hiệp × 10 cái', sets: [10, 10, 10] },
  { label: '4 hiệp × 12 cái', sets: [12, 12, 12, 12] },
  { label: '5 hiệp × 5 cái (sức mạnh)', sets: [5, 5, 5, 5, 5] },
  { label: 'Kim tự tháp 12-10-8-6', sets: [12, 10, 8, 6] },
  { label: '4 hiệp × 15 cái', sets: [15, 15, 15, 15] },
];
