import { useState, useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import type { WorkHours } from '../types/work';
import { format, subDays, startOfYear } from 'date-fns';
import useLocalStorage from '../hooks/useLocalStorage';

interface WorkStatsProps {
    workHours: WorkHours;
}

const progressCardStyle = {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-md)',
    background: 'var(--color-surface-2)',
} as const;

const progressLabelStyle = {
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
    marginBottom: 'var(--spacing-2xs)',
} as const;

const progressValueStyle = {
    fontSize: 'var(--text-xl)',
    fontFamily: 'var(--font-heading)',
    lineHeight: 1.1,
    marginBottom: 'var(--spacing-xs)',
} as const;

const ProgressBar = ({ value, color }: { value: number; color: string }) => (
    <div style={{
        height: '5px',
        background: 'var(--color-border)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
    }}>
        <div style={{
            height: '100%',
            width: `${Math.min(100, Math.max(0, value))}%`,
            background: color,
            borderRadius: 'var(--radius-full)',
            transition: 'width var(--transition-base)',
        }} />
    </div>
);

export const WorkStats = ({ workHours }: WorkStatsProps) => {
    const [birthDate, setBirthDate] = useLocalStorage<string>('user-birthdate', '');
    const [yearProgress, setYearProgress] = useState(0);
    const [lifeProgress, setLifeProgress] = useState(0);
    const [isEditingBirthday, setIsEditingBirthday] = useState(false);

    const hoursArray = Object.values(workHours);
    const totalHours = hoursArray.reduce((acc, h) => acc + h, 0);
    const activeDays = hoursArray.filter(h => h > 0).length;
    const avgHours = activeDays > 0 ? (totalHours / activeDays).toFixed(1) : 0;

    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7); // YYYY-MM
    const monthHours = Object.entries(workHours)
        .filter(([date]) => date.startsWith(currentMonthPrefix))
        .reduce((acc, [_, h]) => acc + h, 0);

    // Initial Year Progress Update
    useEffect(() => {
        const updateYear = () => {
            const now = new Date();
            const start = startOfYear(now);
            const end = new Date(now.getFullYear() + 1, 0, 1);
            const total = end.getTime() - start.getTime();
            const elapsed = now.getTime() - start.getTime();
            setYearProgress((elapsed / total) * 100);
        };
        updateYear();
        const interval = setInterval(updateYear, 3600000); // 1 hour
        return () => clearInterval(interval);
    }, []);

    // Initial Life Progress Update
    useEffect(() => {
        const updateLife = () => {
            if (!birthDate) return;
            const birth = new Date(birthDate);
            const now = new Date();
            const death = new Date(birth.getFullYear() + 80, birth.getMonth(), birth.getDate());
            const total = death.getTime() - birth.getTime();
            const elapsed = now.getTime() - birth.getTime();
            setLifeProgress(Math.min(100, Math.max(0, (elapsed / total) * 100)));
        };
        updateLife();
        const interval = setInterval(updateLife, 21600000); // 6 hours
        return () => clearInterval(interval);
    }, [birthDate]);

    // Calculate current streak
    const calculateStreak = () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

        const hasRecentWork = workHours[today] > 0 || workHours[yesterday] > 0;
        if (!hasRecentWork) return 0;

        let streak = 0;
        let currentDate = new Date();

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
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-md)',
            background: highlight ? 'var(--color-primary)' : 'var(--color-surface-2)',
            color: highlight ? 'var(--color-on-primary)' : 'var(--color-text)',
            position: 'relative'
        }}>
            <div style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                opacity: highlight ? 0.85 : 1,
                color: highlight ? 'inherit' : 'var(--color-text-muted)',
                marginBottom: 'var(--spacing-2xs)'
            }}>{label}</div>
            <div style={{ fontSize: 'var(--text-2xl)', fontFamily: 'var(--font-heading)', lineHeight: 1.1 }}>
                {value}<span style={{ fontSize: 'var(--text-sm)', marginLeft: '3px', opacity: 0.7 }}>{unit}</span>
            </div>
            {highlight && currentStreak > 0 && (
                <div style={{
                    position: 'absolute',
                    top: 'var(--spacing-xs)',
                    right: 'var(--spacing-xs)',
                    fontSize: 'var(--text-xs)'
                }}>
                    🔥
                </div>
            )}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--spacing-sm)' }}>
                <StatBox label="Total Grind" value={totalHours} unit="hrs" />
                <StatBox label="Monthly Total" value={monthHours} unit="hrs" />
                <StatBox label="Avg Per Day" value={avgHours} unit="hrs/d" />
                <StatBox label="Current Streak" value={currentStreak} unit="days" highlight={currentStreak >= 3} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-sm)' }}>
                <div style={progressCardStyle}>
                    <div style={progressLabelStyle}>Year progress</div>
                    <div style={progressValueStyle}>{yearProgress.toFixed(4)}%</div>
                    <ProgressBar value={yearProgress} color="var(--color-primary)" />
                </div>

                <div style={progressCardStyle}>
                    <div style={{ ...progressLabelStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Life used</span>
                        <button
                            onClick={() => setIsEditingBirthday(!isEditingBirthday)}
                            title="Geboortedatum instellen"
                            style={{
                                display: 'flex',
                                padding: 'var(--spacing-2xs)',
                                border: 'none',
                                background: 'none',
                                boxShadow: 'none',
                                color: 'var(--color-text-muted)'
                            }}
                        >
                            <Settings2 size={13} />
                        </button>
                    </div>
                    {isEditingBirthday ? (
                        <input
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            style={{ width: '100%', fontSize: 'var(--text-sm)' }}
                        />
                    ) : (
                        <>
                            <div style={progressValueStyle}>
                                {birthDate ? `${lifeProgress.toFixed(5)}%` : '—'}
                            </div>
                            <ProgressBar value={lifeProgress} color="var(--color-secondary)" />
                            {!birthDate && (
                                <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--spacing-2xs)' }}>
                                    Stel je geboortedatum in
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
