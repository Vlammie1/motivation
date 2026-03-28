export interface WorkHours { [date: string]: number }

export interface DailyHabit {
    id: string;
    user_id: string;
    work_date: string;
    wake_time: string | null;
    sleep_time: string | null;
    created_at?: string;
}
