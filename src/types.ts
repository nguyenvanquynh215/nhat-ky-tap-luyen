// ─── Kiểu dữ liệu cốt lõi của Nhật Ký Tập Luyện ─────────────────────────────

/** Một hiệp tập: hiệp thứ mấy, bao nhiêu cái, mức tạ (kg, tùy chọn) */
export interface WorkoutSet {
  reps: number;
  weight_kg?: number | null;
}

/** Một buổi/một lượt ghi: 1 bài tập trong 1 ngày, gồm nhiều hiệp */
export interface WorkoutEntry {
  id: string;
  user_id?: string;
  exercise_name: string;
  category: string;
  /** Ngày tập dạng YYYY-MM-DD (theo lịch dương) */
  workout_date: string;
  /** Danh sách hiệp — độ dài mảng = số hiệp, mỗi phần tử cho biết hiệp đó bao nhiêu cái */
  sets: WorkoutSet[];
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Bài tập trong danh mục (có sẵn hoặc tự tạo) */
export interface Exercise {
  name: string;
  category: string;
  icon: string;
  /** Đơn vị đếm mặc định: 'cái' | 'phút' | 'km' */
  unit: string;
  custom?: boolean;
}

export interface UserInfo {
  id: string;
  email: string;
}

/** Tổng hợp của 1 ngày trên lịch năm */
export interface DaySummary {
  date: string;
  sessions: number;
  totalSets: number;
  totalReps: number;
  entries: WorkoutEntry[];
}

export const totalRepsOf = (e: WorkoutEntry): number =>
  (e.sets || []).reduce((s, x) => s + (Number(x.reps) || 0), 0);

export const totalVolumeOf = (e: WorkoutEntry): number =>
  (e.sets || []).reduce((s, x) => s + (Number(x.reps) || 0) * (Number(x.weight_kg) || 0), 0);
