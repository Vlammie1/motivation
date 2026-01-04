import { useState, useEffect } from 'react';
import type { WorkHours } from '../types/work';
import { format, subDays, startOfYear } from 'date-fns';
import useLocalStorage from '../hooks/useLocalStorage';

interface WorkStatsProps {
    workHours: WorkHours;
}

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)' }}>
                <StatBox label="Total Grind" value={totalHours} unit="hrs" />
                <StatBox label="Monthly Total" value={monthHours} unit="hrs" />
                <StatBox label="Avg Per Day" value={avgHours} unit="hrs/d" />
                <StatBox label="Current Streak" value={currentStreak} unit="days" highlight={currentStreak >= 3} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                <div style={{
                    border: 'var(--brutalist-border)',
                    padding: 'var(--spacing-md)',
                    textAlign: 'center',
                    background: 'var(--color-bg)'
                }}>
                    <div style={{ textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: 'var(--spacing-xs)' }}>YEAR PROGRESS</div>
                    <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>{yearProgress.toFixed(4)}%</div>
                    <div style={{ height: '4px', background: '#333', marginTop: '8px', width: '100%' }}>
                        <div style={{ height: '100%', width: `${yearProgress}%`, background: 'var(--color-primary)' }} />
                    </div>
                </div>

                <div style={{
                    border: 'var(--brutalist-border)',
                    padding: 'var(--spacing-md)',
                    textAlign: 'center',
                    background: 'var(--color-bg)',
                    position: 'relative'
                }}>
                    <div style={{ textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: 'var(--spacing-xs)' }}>
                        LIFE USED
                        <button
                            onClick={() => setIsEditingBirthday(!isEditingBirthday)}
                            style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}
                        >
                            ⚙️
                        </button>
                    </div>
                    {isEditingBirthday ? (
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <input
                                type="date"
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                style={{ fontFamily: 'var(--font-mono)', padding: '4px' }}
                            />
                        </div>
                    ) : (
                        <>
                            <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>
                                {birthDate ? lifeProgress.toFixed(5) : '???'}%
                            </div>
                            <div style={{ height: '4px', background: '#333', marginTop: '8px', width: '100%' }}>
                                <div style={{ height: '100%', width: `${lifeProgress}%`, background: 'var(--color-secondary)' }} />
                            </div>
                            {!birthDate && <div style={{ fontSize: '0.7rem', color: 'red', marginTop: '4px' }}>SET BIRTHDATE</div>}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
