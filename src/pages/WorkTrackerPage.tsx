import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { WorkHeatmap } from '../components/WorkHeatmap';
import { WorkStats } from '../components/WorkStats';
import { WorkLogForm } from '../components/WorkLogForm';
import { DayDetailModal } from '../components/DayDetailModal';
import { TrendingUp, Loader2, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSupabaseWorkLogs } from '../hooks/useSupabaseWorkLogs';
import { useSupabaseProjects } from '../hooks/useSupabaseProjects';
import { GrindEfficiency } from '../components/GrindEfficiency';
import { WorkAnalytics } from '../components/WorkAnalytics';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { DailyHabitsForm } from '../components/DailyHabitsForm';
import { OtherActivitiesForm } from '../components/OtherActivitiesForm';
import { useSupabaseDailyHabits } from '../hooks/useSupabaseDailyHabits';
import { useSupabaseOtherActivities } from '../hooks/useSupabaseOtherActivities';
import { subDays, format } from 'date-fns';
import type { WorkLogEntry } from '../hooks/useSupabaseWorkLogs';
import type { OtherActivity } from '../types/work';

const WorkTrackerPage = () => {
    const { user, loading: authLoading } = useAuth();
    const { workLogs, loading: logsLoading, addWorkLogEntry, fetchWorkLogEntries, fetchWorkLogEntriesInRange, deleteWorkLogEntry } = useSupabaseWorkLogs();
    const { projects, addProject, deleteProject, getProjectsWithHours } = useSupabaseProjects();
    const { dailyHabits, upsertDailyHabit } = useSupabaseDailyHabits();
    const { activities: otherActivities, addOtherActivity, deleteOtherActivity } = useSupabaseOtherActivities();
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [modalDate, setModalDate] = useState<string | null>(null);
    const [allEntries, setAllEntries] = useState<WorkLogEntry[]>([]);
    const [allOtherActivities, setAllOtherActivities] = useState<OtherActivity[]>([]);

    // Fetch entries for the last 30 days for the activity chart
    useEffect(() => {
        const fetchRange = async () => {
            const end = new Date();
            const start = subDays(end, 30);
            
            // Work Logs
            const entries = await fetchWorkLogEntriesInRange(
                format(start, 'yyyy-MM-dd'),
                format(end, 'yyyy-MM-dd')
            );
            setAllEntries(entries);

            // Other Activities
            const { data, error } = await supabase
                .from('other_activities')
                .select('*')
                .gte('work_date', format(start, 'yyyy-MM-dd'))
                .lte('work_date', format(end, 'yyyy-MM-dd'));
            
            if (!error && data) {
                setAllOtherActivities(data);
            }
        };
        if (user) fetchRange();
    }, [user, workLogs, otherActivities]); // Refetch when logs or activities change

    const currentYearPrefix = new Date().getFullYear().toString();
    const yearHours = Object.entries(workLogs)
        .filter(([date]) => date.startsWith(currentYearPrefix))
        .reduce((acc, [_, hours]) => acc + hours, 0);

    // Count entries for today (approximate via sessions tracked in workLogs — we show live count from modal)
    const todaySessions = 0; // updated after fetch; workLogs only stores total

    const handleDayClick = (date: string) => {
        setModalDate(date);
    };

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                    <ThemeSwitcher />
                </div>
            </div>
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
                    <WorkHeatmap
                        workHours={workLogs}
                        onSelectDate={(date: string) => {
                            setSelectedDate(date);
                            handleDayClick(date);
                        }}
                        selectedDate={selectedDate}
                    />
                    <GrindEfficiency totalYearHours={yearHours} />
                </section>

                {/* Log Form Section */}
                <section style={{
                    border: 'var(--brutalist-border)',
                    padding: 'var(--spacing-lg)',
                    background: 'var(--color-bg)',
                    boxShadow: 'var(--brutalist-shadow)'
                }}>
                    <h2 style={{ textTransform: 'uppercase', marginBottom: 'var(--spacing-md)' }}>Voeg Sessie Toe</h2>
                    <WorkLogForm
                        date={selectedDate}
                        currentHours={workLogs[selectedDate] || 0}
                        currentSessions={todaySessions}
                        onAdd={addWorkLogEntry}
                        getProjectsWithHours={getProjectsWithHours}
                        addProject={addProject}
                        deleteProject={deleteProject}
                    />

                    <div style={{ marginTop: 'var(--spacing-xl)', borderTop: '4px solid var(--color-text)', paddingTop: 'var(--spacing-lg)' }}>
                        <h2 style={{ textTransform: 'uppercase', marginBottom: 'var(--spacing-md)' }}>Dagelijkse Gewoontes</h2>
                        <DailyHabitsForm
                            date={selectedDate}
                            habit={dailyHabits[selectedDate]}
                            onSave={upsertDailyHabit}
                        />
                    </div>

                    <div style={{ marginTop: 'var(--spacing-xl)', borderTop: '4px solid var(--color-text)', paddingTop: 'var(--spacing-lg)' }}>
                        <h2 style={{ textTransform: 'uppercase', marginBottom: 'var(--spacing-md)' }}>Andere Activiteiten</h2>
                        <OtherActivitiesForm
                            date={selectedDate}
                            activities={otherActivities[selectedDate] || []}
                            onAdd={addOtherActivity}
                            onDelete={deleteOtherActivity}
                        />
                    </div>
                </section>

                <WorkAnalytics 
                    workHours={workLogs} 
                    onDayClick={handleDayClick} 
                    dailyHabits={dailyHabits}
                    workLogEntries={allEntries}
                    otherActivities={allOtherActivities}
                    projects={projects}
                />
            </div>

            {modalDate !== null && (
                <DayDetailModal
                    date={modalDate}
                    totalHours={workLogs[modalDate] || 0}
                    allWorkHours={workLogs}
                    onClose={() => setModalDate(null)}
                    onDelete={deleteWorkLogEntry}
                    fetchEntries={fetchWorkLogEntries}
                    projects={projects}
                />
            )}
        </div>
    );
};

export default WorkTrackerPage;
