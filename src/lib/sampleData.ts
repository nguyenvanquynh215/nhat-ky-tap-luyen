import type { WorkoutEntry } from '../types';
import { pad2 } from './dates';

/**
 * Dữ liệu mẫu cho CHẾ ĐỘ DEMO — giúp người dùng mở app lần đầu là thấy ngay
 * lịch năm, thống kê và chuỗi ngày tập có ý nghĩa như thế nào.
 * Chỉ dùng ở chế độ demo; người dùng xóa hết bằng 1 nút trong mục Cá nhân.
 * Sinh dữ liệu tất định (không random) rải trong năm hiện tại:
 * lịch tập ~3–4 buổi/tuần theo mẫu tuần, thỉnh thoảng có chuỗi 3 ngày liên tiếp.
 */
export function generateSampleEntries(year: number): WorkoutEntry[] {
  const plan: { name: string; category: string; base: number[] }[] = [
    { name: 'Hít đất', category: 'Ngực', base: [15, 14, 12, 10] },
    { name: 'Squat (gánh tạ / ngồi xổm)', category: 'Chân', base: [12, 12, 10, 10] },
    { name: 'Kéo xà đơn', category: 'Lưng', base: [6, 5, 5, 4] },
    { name: 'Gập bụng', category: 'Bụng', base: [20, 18, 15] },
    { name: 'Cuốn tay trước (Biceps)', category: 'Tay', base: [12, 10, 10] },
  ];
  const entries: WorkoutEntry[] = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const cursor = new Date(year, 0, 1);
  let dayIndex = 0;
  let counter = 0;

  while (cursor.getFullYear() === year && cursor <= today) {
    const week = Math.floor(dayIndex / 7);
    const dow = dayIndex % 7;
    // Mẫu buổi tập trong tuần (theo vị trí ngày trong chu kỳ 7 ngày)
    const pattern = week % 7 === 3
      ? [0, 1, 2, 4] // tuần đặc biệt: chuỗi 3 ngày liên tiếp
      : week % 3 === 1
        ? [0, 1, 3, 5] // tuần 4 buổi, có cặp 2 ngày liên tiếp
        : [0, 2, 4]; // tuần thường: 3 buổi cách ngày
    if (pattern.includes(dow)) {
      const month = cursor.getMonth();
      const day = cursor.getDate();
      const workout = plan[(week + dow) % plan.length];
      const growth = Math.floor(month / 2); // tiến bộ dần theo thời gian
      const sets = workout.base.map((r, i) => ({
        reps: Math.max(1, r + growth - (i === workout.base.length - 1 ? 1 : 0)),
        weight_kg: workout.category === 'Tay' || workout.name.includes('Squat') ? 10 + month : null,
      }));
      entries.push({
        id: `sample-${year}-${pad2(month + 1)}-${pad2(day)}-${counter++}`,
        exercise_name: workout.name,
        category: workout.category,
        workout_date: `${year}-${pad2(month + 1)}-${pad2(day)}`,
        sets,
        notes: 'Dữ liệu mẫu',
        created_at: new Date(year, month, day, 7, 30).toISOString(),
      });
    }
    cursor.setDate(cursor.getDate() + 1);
    dayIndex += 1;
  }
  return entries.sort((a, b) => (a.workout_date < b.workout_date ? 1 : -1));
}
