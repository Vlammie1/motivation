import { useState } from 'react';
import { WorkHeatmap } from '../components/WorkHeatmap';
import { WorkStats } from '../components/WorkStats';
import { WorkLogForm } from '../components/WorkLogForm';
import { TrendingUp, Loader2, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSupabaseWorkLogs } from '../hooks/useSupabaseWorkLogs';
import { GrindEfficiency } from '../components/GrindEfficiency';

const WorkTrackerPage = () => {
    const { user, loading: authLoading } = useAuth();
    const { workLogs, loading: logsLoading, upsertWorkLog } = useSupabaseWorkLogs();
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const currentYearPrefix = new Date().getFullYear().toString();
    const yearHours = Object.entries(workLogs)
        .filter(([date]) => date.startsWith(currentYearPrefix))
        .reduce((acc, [_, hours]) => acc + hours, 0);

    if (authLoading || (user && logsLoading)) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-xl)' }}>
                <Loader2 className="animate-spin" size={48} />
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{
                border: 'var(--brutalist-border)',
                padding: 'var(--spacing-xl)',
                textAlign: 'center',
                background: 'var(--color-bg)',
                boxShadow: '8px 8px 0px var(--color-text)',
                marginTop: 'var(--spacing-xl)'
            }}>
                <Lock size={48} style={{ marginBottom: 'var(--spacing-md)' }} />
                <h2 style={{ textTransform: 'uppercase', marginBottom: 'var(--spacing-md)', fontSize: '2rem' }}>Access Denied</h2>
                <p style={{ fontWeight: 'bold' }}>LOG IN TO TRACK YOUR JOURNEY.</p>
            </div>
        );
    }

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
                    <WorkStats workHours={workLogs} />
                </section>

                {/* Heatmap Section */}
                <section style={{
                    border: 'var(--brutalist-border)',
                    padding: 'var(--spacing-lg)',
                    background: 'var(--color-bg)',
                    boxShadow: 'var(--brutalist-shadow)'
                }}>
                    <h2 style={{ textTransform: 'uppercase', marginBottom: 'var(--spacing-lg)' }}>Annual Grind</h2>
                    <WorkHeatmap workHours={workLogs} onSelectDate={setSelectedDate} selectedDate={selectedDate} />
                    <GrindEfficiency totalYearHours={yearHours} />
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
                        currentHours={workLogs[selectedDate] || 0}
                        onUpdate={upsertWorkLog}
                    />
                </section>
            </div>
        </div>
    );
};

export default WorkTrackerPage;
