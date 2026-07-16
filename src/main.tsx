import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from './context/ThemeContext'

import { BrowserRouter } from 'react-router-dom'

import { AuthProvider } from './context/AuthContext'
import { ProjectsProvider } from './context/ProjectsContext'
import { TimerProvider } from './context/TimerContext'
import { WorkDataProvider } from './context/WorkDataContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ProjectsProvider>
            <WorkDataProvider>
              <TimerProvider>
                <App />
              </TimerProvider>
            </WorkDataProvider>
          </ProjectsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
