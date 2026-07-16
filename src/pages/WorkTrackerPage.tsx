import { useState, useEffect, useMemo } from 'react';
import { WorkHeatmap } from '../components/WorkHeatmap';
import { WorkStats } from '../components/WorkStats';
import { WorkLogForm } from '../components/WorkLogForm';
import { DayDetailModal } from '../components/DayDetailModal';
import { TrendingUp, Loader2, Lock, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWorkData } from '../context/WorkDataContext';
import { useProjects } from '../context/ProjectsContext';
import { useTimer } from '../context/TimerContext';
import { GrindEfficiency } from '../components/GrindEfficiency';
import { WorkAnalytics } from '../components/WorkAnalytics';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { DailyHabitsForm } from '../components/DailyHabitsForm';
import { OtherActivitiesForm } from '../components/OtherActivitiesForm';
import { AIAssistant } from '../components/AIAssistant';

const WorkTrackerPage = () => {
    const { user, loading: authLoading } = useAuth();
    const {
        workLogs, recentEntries, loading: logsLoading,
        addWorkLogEntry, fetchWorkLogEntries, editWorkLogEntry, deleteWorkLogEntry, refreshWorkLogs,
        dailyHabits, upsertDailyHabit,
        otherActivities, otherActivitiesList, addOtherActivity, deleteOtherActivity
    } = useWorkData();
    const { projects, addProject, deleteProject, getProjectsWithHours } = useProjects();
    const { openStart, timer, version } = useTimer();
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [modalDate, setModalDate] = useState<string | null>(null);

    // De timer schrijft sessies buiten deze pagina om weg; na elke opgeslagen
    // sessie moeten de totalen hier opnieuw opgehaald worden.
    useEffect(() => {
        if (version > 0) refreshWorkLogs();
    }, [version, refreshWorkLogs]);

    const yearHours = useMemo(() => {
        const prefix = new Date().getFullYear().toString();
        return Object.entries(workLogs)
            .filter(([date]) => date.startsWith(prefix))
            .reduce((acc, [, hours]) => acc + hours, 0);
    }, [workLogs]);

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
            <div className="card" style={{
                padding: 'var(--spacing-2xl)',
                textAlign: 'center',
                marginTop: 'var(--spacing-xl)'
            }}>
                <Lock size={32} style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-text-muted)' }} />
                <h2 style={{ marginBottom: 'var(--spacing-xs)', fontSize: 'var(--text-2xl)' }}>Access Denied</h2>
                <p className="muted" style={{ margin: 0 }}>Log in om je voortgang bij te houden.</p>
            </div>
        );
    }

    return (
        <div className="work-tracker-page">
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 'var(--spacing-md)',
                marginBottom: 'var(--spacing-xl)',
                flexWrap: 'wrap'
            }}>
                <div>
                    <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--spacing-2xs)' }}>
                        Work Intensity
                    </h1>
                    <p className="muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                        No excuses. Just hours.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                    <ThemeSwitcher />
                    <button
                        className="btn-primary"
                        onClick={() => openStart()}
                        disabled={!!timer}
                        title={timer ? 'Er loopt al een timer' : 'Start een timer'}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)',
                            padding: 'var(--spacing-xs) var(--spacing-md)'
                        }}
                    >
                        <Play size={16} />
                        {timer ? 'Timer loopt' : 'Start timer'}
                    </button>
                </div>
            </header>

            <div className="stack">
                {/* Statistics Section */}
                <section className="card">
                    <h2 className="card-title">
                        <TrendingUp size={18} color="var(--color-primary)" />
                        Performance Stats
                    </h2>
                    <WorkStats workHours={workLogs} />
                </section>

                {/* Heatmap Section */}
                <section className="card">
                    <h2 className="card-title">Annual Grind</h2>
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
                <section className="card">
                    <h2 className="card-title">Voeg Sessie Toe</h2>
                    <WorkLogForm
                        date={selectedDate}
                        currentHours={workLogs[selectedDate] || 0}
                        currentSessions={todaySessions}
                        onAdd={addWorkLogEntry}
                        getProjectsWithHours={getProjectsWithHours}
                        addProject={addProject}
                        deleteProject={deleteProject}
                    />

                    <div style={{ marginTop: 'var(--spacing-xl)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-lg)' }}>
                        <h2 className="card-title">Dagelijkse Gewoontes</h2>
                        <DailyHabitsForm
                            date={selectedDate}
                            habit={dailyHabits[selectedDate]}
                            onSave={upsertDailyHabit}
                        />
                    </div>

                    <div style={{ marginTop: 'var(--spacing-xl)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-lg)' }}>
                        <h2 className="card-title">Andere Activiteiten</h2>
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
                    workLogEntries={recentEntries}
                    otherActivities={otherActivitiesList}
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
                    onEdit={editWorkLogEntry}
                    fetchEntries={fetchWorkLogEntries}
                    projects={projects}
                />
            )}

            <AIAssistant
                data={{
                    workHours: workLogs,
                    dailyHabits,
                    workLogEntries: recentEntries,
                    otherActivities: otherActivitiesList,
                    projects
                }}
                onAddWorkLog={addWorkLogEntry}
                onUpsertHabit={upsertDailyHabit}
            />
        </div>
    );
};

export default WorkTrackerPage;
