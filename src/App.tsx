import { useState, useEffect } from 'react';
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
import useLocalStorage from './hooks/useLocalStorage';
import { Analytics } from "@vercel/analytics/react"
import WorkTrackerPage from './pages/WorkTrackerPage';

interface Task {
  id: string;
  text: string;
  why: string;
  completed: boolean;
}

function MainTool() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('brutalist-tasks', []);
  const [mainGoal] = useLocalStorage<string>('brutalist-main-goal', '');
  const [lastCompletionTime, setLastCompletionTime] = useLocalStorage<number | null>('brutalist-last-completion', null);
  const [isLockInActive, setIsLockInActive] = useState(false);
  const [showVictory, setShowVictory] = useState(false);

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const isComplete = totalCount > 0 && completedCount === totalCount;

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => setShowVictory(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setShowVictory(false);
    }
  }, [isComplete]);

  const handleLockIn = () => {
    setIsLockInActive(true);
  };

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
            fontSize: '1.5rem',
            transform: 'scale(1.1)'
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
        <TaskList
          tasks={tasks}
          setTasks={(newTasks: Task[] | ((prev: Task[]) => Task[])) => {
            if (typeof newTasks === 'function') {
              setTasks((prev: Task[]) => {
                const resolved = newTasks(prev);
                const newlyCompleted = resolved.some((t: Task, i: number) => t.completed && !prev[i]?.completed);
                if (newlyCompleted) setLastCompletionTime(Date.now());
                return resolved;
              });
            } else {
              const newlyCompleted = newTasks.some((t: Task, i: number) => t.completed && !tasks[i]?.completed);
              if (newlyCompleted) setLastCompletionTime(Date.now());
              setTasks(newTasks);
            }
          }}
        />
      </div>

      <ShameClock lastCompletionTime={lastCompletionTime} />

      <LockInMode
        isActive={isLockInActive}
        onExit={() => setIsLockInActive(false)}
        mainGoal={mainGoal}
      />

      <VictoryOverlay
        isVisible={showVictory}
        onClose={() => setShowVictory(false)}
      />
    </>
  );
}

function App() {
  return (
    <div className="App">
      <Navigation />

      <Routes>
        <Route path="/" element={<MainTool />} />
        <Route path="/work" element={<WorkTrackerPage />} />
      </Routes>

      <Analytics />

      <div style={{ marginTop: 'var(--spacing-xl)', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem', fontFamily: 'var(--font-heading)' }}>
        BRUTALIST MOTIVATION TOOL v2.7 // AGGRESSIVE EDITION
      </div>
    </div>
  );
}

export default App;
