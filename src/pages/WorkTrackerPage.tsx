import { useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { WorkHeatmap } from '../components/WorkHeatmap';
import { WorkStats } from '../components/WorkStats';
import { WorkLogForm } from '../components/WorkLogForm';
import { TrendingUp } from 'lucide-react';

export interface WorkHours { [date: string]: number }

const WorkTrackerPage = () => {
    const [workHours, setWorkHours] = useLocalStorage<WorkHours>('brutalist-work-hours', {});
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const handleUpdateHours = (date: string, hours: number) => {
        setWorkHours((prev) => ({
            ...prev,
            [date]: hours,
        }));
    };

    return (
        <div className="work-tracker-page">
            <header style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{
                    fontSize: '3rem',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-heading)',
                    borderBottom: '8px solid var(--color-primary)',
                    display: 'inline-block',
                    marginBottom: 'var(--spacing-md)'
                }}>
                    Work Intensity
                </h1>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                    NO EXCUSES. JUST HOURS.
                </p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-xl)' }}>
                {/* Statistics Section */}
                <section style={{
                    border: 'var(--brutalist-border)',
                    padding: 'var(--spacing-lg)',
                    background: 'var(--color-bg)',
                    boxShadow: 'var(--brutalist-shadow)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                        <TrendingUp size={24} color="var(--color-primary)" />
                        <h2 style={{ textTransform: 'uppercase', margin: 0 }}>Performance Stats</h2>
                    </div>
                    <WorkStats workHours={workHours} />
                </section>

                {/* Heatmap Section */}
                <section style={{
                    border: 'var(--brutalist-border)',
                    padding: 'var(--spacing-lg)',
                    background: 'var(--color-bg)',
                    boxShadow: 'var(--brutalist-shadow)'
                }}>
                    <h2 style={{ textTransform: 'uppercase', marginBottom: 'var(--spacing-lg)' }}>Annual Grind</h2>
                    <WorkHeatmap workHours={workHours} onSelectDate={setSelectedDate} />
                </section>

                {/* Log Form Section */}
                <section style={{
                    border: 'var(--brutalist-border)',
                    padding: 'var(--spacing-lg)',
                    background: 'var(--color-bg)',
                    boxShadow: 'var(--brutalist-shadow)'
                }}>
                    <h2 style={{ textTransform: 'uppercase', marginBottom: 'var(--spacing-md)' }}>Log Your Hours</h2>
                    <WorkLogForm
                        date={selectedDate}
                        currentHours={workHours[selectedDate] || 0}
                        onUpdate={handleUpdateHours}
                    />
                </section>
            </div>
        </div>
    );
};

export default WorkTrackerPage;
