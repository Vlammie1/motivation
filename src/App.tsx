import { useState, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MotivationHeader } from './components/MotivationHeader';
import { TaskList } from './components/TaskList';
import { HypeButton } from './components/HypeButton';
import { ProgressBar } from './components/ProgressBar';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { LockInMode } from './components/LockInMode';
import { VictoryOverlay } from './components/VictoryOverlay';
import { ShameClock } from './components/ShameClock';
import { Navigation } from './components/Navigation';
import { Analytics } from "@vercel/analytics/react"
import WorkTrackerPage from './pages/WorkTrackerPage';
import { useAuth } from './context/AuthContext';
import { useSupabaseTasks } from './hooks/useSupabaseTasks';
import { useSupabaseProfile } from './hooks/useSupabaseProfile';
import { Loader2, Lock } from 'lucide-react';
import useLocalStorage from './hooks/useLocalStorage';

const IS_SUPABASE_CONFIGURED = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

function MainTool() {
  const { user, loading: authLoading } = useAuth();
  const { tasks, loading: tasksLoading, toggleTask } = useSupabaseTasks();
  const { profile } = useSupabaseProfile();
  const [lastCompletionTime, setLastCompletionTime] = useLocalStorage<number | null>('brutalist-last-completion', null);
  const [isLockInActive, setIsLockInActive] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const prevCompletedCountRef = useRef<number>(0);
  const isFirstRender = useRef(true);

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;

  // Victory Logic: Show whenever a task is finished
  useEffect(() => {
    // Skip if loading tasks
    if (tasksLoading) return;

    if (isFirstRender.current) {
      if (tasks.length > 0) {
        isFirstRender.current = false;
        prevCompletedCountRef.current = completedCount;
      }
      return;
    }

    // If completed count INCREASED (user finished a task)
    if (completedCount > prevCompletedCountRef.current) {
      setShowVictory(true);
      // Timeout removed: overlay stays until user closes it
      prevCompletedCountRef.current = completedCount;
      return;
    }

    // Check if task was un-completed (count decreased)
    if (completedCount < prevCompletedCountRef.current) {
      setShowVictory(false);
    }

    prevCompletedCountRef.current = completedCount;
  }, [completedCount, tasksLoading, tasks.length]);

  const handleTaskToggle = async (id: string, completed: boolean) => {
    await toggleTask(id, completed);
    if (completed) {
      setLastCompletionTime(Date.now());
    }
  };

  const handleLockIn = () => {
    setIsLockInActive(true);
  };

  if (authLoading || (user && tasksLoading)) {
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
        <p style={{ fontWeight: 'bold' }}>YOU MUST LOGIN TO ACCESS THE GRIND.</p>
        <p style={{ fontSize: '0.8rem', marginTop: 'var(--spacing-sm)', opacity: 0.7 }}>PRO TIP: NO ACCOUNT = NO PROGRESS.</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
          <ThemeSwitcher />
        </div>
        <button
          onClick={handleLockIn}
          style={{
            background: 'var(--color-primary)',
            color: 'white',
            padding: 'var(--spacing-md) var(--spacing-xl)',
            fontWeight: 'bold',
            fontFamily: 'var(--font-heading)',
            textTransform: 'uppercase',
            border: 'var(--brutalist-border)',
            cursor: 'crosshair',
            boxShadow: 'var(--brutalist-shadow)',
            fontSize: '1.2rem'
          }}
        >
          [ LOCK IN ]
        </button>
      </div>

      <MotivationHeader />
      <HypeButton />
      <ProgressBar current={completedCount} total={totalCount} />

      <div style={{
        border: 'var(--brutalist-border)',
        padding: 'var(--spacing-md)',
        background: 'var(--color-bg)',
        boxShadow: 'var(--brutalist-shadow)',
        marginBottom: 'var(--spacing-lg)',
        marginTop: 'var(--spacing-md)'
      }}>
        <TaskList onTaskToggle={handleTaskToggle} />
      </div>

      <ShameClock lastCompletionTime={lastCompletionTime} />

      <LockInMode
        isActive={isLockInActive}
        onExit={() => setIsLockInActive(false)}
        mainGoal={profile?.lock_in_beat || ''}
      />

      <VictoryOverlay
        isVisible={showVictory}
        onClose={() => setShowVictory(false)}
      />
    </>
  );
}

function App() {
  if (!IS_SUPABASE_CONFIGURED) {
    return (
      <div className="App" style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <div style={{
          border: '4px solid var(--color-error, #ff0000)',
          padding: 'var(--spacing-xl)',
          background: 'var(--color-bg)',
          boxShadow: '10px 10px 0px var(--color-text)',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <h1 style={{ textTransform: 'uppercase', color: 'var(--color-error, #ff0000)' }}>Configuration Missing</h1>
          <p style={{ fontWeight: 'bold', fontSize: '1.2rem', margin: 'var(--spacing-md) 0' }}>
            VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not defined.
          </p>
          <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.1)', padding: 'var(--spacing-md)', fontSize: '0.9rem' }}>
            <p>To fix this:</p>
            <ol>
              <li>Create a <code>.env</code> file in the project root.</li>
              <li>Add your Supabase credentials:</li>
            </ol>
            <pre style={{ background: '#222', color: '#fff', padding: '10px', overflowX: 'auto' }}>
              {`VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key`}
            </pre>
            <p>Then restart the development server.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Navigation />

      <Routes>
        <Route path="/" element={<MainTool />} />
        <Route path="/work" element={<WorkTrackerPage />} />
      </Routes>

      <Analytics />

      <div style={{ marginTop: 'var(--spacing-xl)', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem', fontFamily: 'var(--font-heading)' }}>
        BRUTALIST MOTIVATION TOOL v3.0
      </div>
    </div>
  );
}

export default App;
