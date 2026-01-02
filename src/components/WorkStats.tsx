import type { WorkHours } from '../pages/WorkTrackerPage';

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

    const StatBox = ({ label, value, unit }: { label: string, value: string | number, unit?: string }) => (
        <div style={{
            border: '4px solid var(--color-text)',
            padding: 'var(--spacing-md)',
            textAlign: 'center'
        }}>
            <div style={{ textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: 'var(--spacing-xs)' }}>{label}</div>
            <div style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)' }}>
                {value}<span style={{ fontSize: '1rem', marginLeft: '4px' }}>{unit}</span>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)' }}>
            <StatBox label="Total Grind" value={totalHours} unit="hrs" />
            <StatBox label="Monthly Total" value={monthHours} unit="hrs" />
            <StatBox label="Avg Per Day" value={avgHours} unit="hrs/d" />
            <StatBox label="Days Worked" value={activeDays} unit="days" />
        </div>
    );
};
