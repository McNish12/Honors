import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthGuard from './auth/AuthGuard'
import { AuthProvider } from './auth/useAuth'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import { isSupabaseConfigured } from './supabaseClient'
import './App.css'

function EnvBanner() {
  if (isSupabaseConfigured) return null
  return <div className="env-banner">Missing VITE_SUPABASE_URL/ANON_KEY</div>
}

function AppRoutes() {
  return (
    <>
      <EnvBanner />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={(
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          )}
        />
        <Route
          path="/jobs"
          element={(
            <AuthGuard>
              <Jobs />
            </AuthGuard>
          )}
        />
        <Route
          path="/onboarding"
          element={(
            <AuthGuard>
              <Onboarding />
            </AuthGuard>
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <div className="app-container">
          <AppRoutes />
        </div>
      </AuthProvider>
    </HashRouter>
  )
}
