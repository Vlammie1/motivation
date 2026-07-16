import { Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { Navigation } from './components/Navigation';
import { TimerLayer } from './components/TimerLayer';
import WorkTrackerPage from './pages/WorkTrackerPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';

const IS_SUPABASE_CONFIGURED = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

function App() {
  if (!IS_SUPABASE_CONFIGURED) {
    return (
      <div className="App" style={{ padding: 'var(--spacing-xl) 0' }}>
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--spacing-xs)' }}>Configuration Missing</h1>
          <p className="muted" style={{ marginTop: 0, marginBottom: 'var(--spacing-lg)' }}>
            VITE_SUPABASE_URL of VITE_SUPABASE_ANON_KEY is niet gedefinieerd.
          </p>
          <div style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-md)',
            fontSize: 'var(--text-sm)'
          }}>
            <p style={{ marginTop: 0 }}>Zo los je dit op:</p>
            <ol style={{ margin: 0, paddingLeft: 'var(--spacing-md)' }}>
              <li>Maak een <code>.env.local</code> in de project root.</li>
              <li>Voeg je Supabase-credentials toe:</li>
            </ol>
            <pre style={{
              background: 'var(--color-canvas)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--spacing-sm)',
              overflowX: 'auto',
              fontSize: 'var(--text-xs)'
            }}>
              {`VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key`}
            </pre>
            <p style={{ marginBottom: 0 }}>Herstart daarna de dev server.</p>
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
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        {/* Oude bookmarks naar de tracker blijven werken. */}
        <Route path="/work" element={<WorkTrackerPage />} />
      </Routes>

      <TimerLayer />
      <Analytics />

      <div className="muted" style={{
        marginTop: 'var(--spacing-2xl)',
        textAlign: 'center',
        fontSize: 'var(--text-xs)',
        letterSpacing: '0.04em'
      }}>
        Motivation Tool v4.0
      </div>
    </div>
  );
}

export default App;
