import type { WorkHours } from '../types/work';
import { format, parseISO, subDays, isAfter, isBefore } from 'date-fns';

interface WorkStatsProps {
    workHours: WorkHours;
}

export const WorkStats = ({ workHours }: WorkStatsProps) => {
    const hoursArray = Object.values(workHours);
    const totalHours = hoursArray.reduce((acc, h) => acc + h, 0);
    const activeDays = hoursArray.filter(h => h > 0).length;
    const avgHours = activeDays > 0 ? (totalHours / activeDays).toFixed(1) : 0;

    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7); // YYYY-MM
    const monthHours = Object.entries(workHours)
        .filter(([date]) => date.startsWith(currentMonthPrefix))
        .reduce((acc, [_, h]) => acc + h, 0);

    // Calculate current streak
    const calculateStreak = () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

        // Check if we worked today or yesterday (to allow for ongoing streaks)
        const hasRecentWork = workHours[today] > 0 || workHours[yesterday] > 0;
        if (!hasRecentWork) return 0;

        let streak = 0;
        let currentDate = new Date();

        // Count backwards from today
        for (let i = 0; i < 365; i++) {
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            if (workHours[dateStr] > 0) {
                streak++;
                currentDate = subDays(currentDate, 1);
            } else {
                break;
            }
        }

        return streak;
    };

    const currentStreak = calculateStreak();

    const StatBox = ({ label, value, unit, highlight }: { label: string, value: string | number, unit?: string, highlight?: boolean }) => (
        <div style={{
            border: highlight ? '4px solid var(--color-primary)' : '4px solid var(--color-text)',
            padding: 'var(--spacing-md)',
            textAlign: 'center',
            background: highlight ? 'var(--color-primary)' : 'transparent',
            color: highlight ? 'white' : 'var(--color-text)',
            position: 'relative'
        }}>
            <div style={{ textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: 'var(--spacing-xs)' }}>{label}</div>
            <div style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)' }}>
                {value}<span style={{ fontSize: '1rem', marginLeft: '4px' }}>{unit}</span>
            </div>
            {highlight && currentStreak > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    background: 'var(--color-secondary)',
                    color: 'var(--color-text)',
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    border: '2px solid var(--color-text)'
                }}>
                    🔥 ON FIRE
                </div>
            )}
        </div>
    );

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)' }}>
            <StatBox label="Total Grind" value={totalHours} unit="hrs" />
            <StatBox label="Monthly Total" value={monthHours} unit="hrs" />
            <StatBox label="Avg Per Day" value={avgHours} unit="hrs/d" />
            <StatBox label="Current Streak" value={currentStreak} unit="days" highlight={currentStreak >= 3} />
        </div>
    );
};
