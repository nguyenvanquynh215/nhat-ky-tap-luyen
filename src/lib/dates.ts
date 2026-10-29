// ─── Hàm xử lý ngày tháng (lịch dương) & thống kê ───────────────────────────
// Mọi ngày đều lưu dạng chuỗi 'YYYY-MM-DD' để tránh lỗi lệch múi giờ.

export const pad2 = (n: number) => String(n).padStart(2, '0');

export const toKey = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const todayKey = (): string => toKey(new Date());

export const parseKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const addDays = (key: string, days: number): string => {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
};

export const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

export const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** '2026-10-29' → 'Thứ 5, 29/10/2026' */
export const formatVN = (key: string): string => {
  const d = parseKey(key);
  const wd = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][d.getDay()];
  return `${wd}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

/** Số ngày trong tháng (dương lịch) */
export const daysInMonth = (year: number, month1to12: number): number =>
  new Date(year, month1to12, 0).getDate();

/** Chuỗi ngày tập liên tục tính đến hôm nay (hoặc hôm qua nếu hôm nay chưa tập) */
export function currentStreak(activeDays: Set<string>): number {
  let streak = 0;
  let cursor = todayKey();
  if (!activeDays.has(cursor)) cursor = addDays(cursor, -1);
  while (activeDays.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Chuỗi ngày tập dài nhất trong tập ngày đã cho */
export function longestStreak(activeDays: Set<string>): number {
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  const sorted = Array.from(activeDays).sort();
  for (const day of sorted) {
    run = prev && addDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

/** Mức độ đậm nhạt trên lịch nhiệt theo tổng số cái trong ngày */
export function heatLevel(totalReps: number): 0 | 1 | 2 | 3 | 4 {
  if (totalReps <= 0) return 0;
  if (totalReps < 30) return 1;
  if (totalReps < 80) return 2;
  if (totalReps < 150) return 3;
  return 4;
}

export const HEAT_COLORS = ['#E7EBE4', '#BFE3C8', '#7CC78F', '#2F9E5F', '#0F5132'];
