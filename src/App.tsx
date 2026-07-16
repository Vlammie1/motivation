import { Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { Navigation } from './components/Navigation';
import { TimerLayer } from './components/TimerLayer';
import WorkTrackerPage from './pages/WorkTrackerPage';
import ProjectsPage from './pages/ProjectsPage';

const IS_SUPABASE_CONFIGURED = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

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
        <Route path="/" element={<WorkTrackerPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        {/* Oude bookmarks naar de tracker blijven werken. */}
        <Route path="/work" element={<WorkTrackerPage />} />
      </Routes>

      <TimerLayer />
      <Analytics />

      <div style={{ marginTop: 'var(--spacing-xl)', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem', fontFamily: 'var(--font-heading)' }}>
        BRUTALIST MOTIVATION TOOL v4.0
      </div>
    </div>
  );
}

export default App;
