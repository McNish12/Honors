import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

const CHECK_TIMEOUT_MS = 6000

type AuthGuardProps = {
  children: ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { status, error, refresh, signOut } = useAuth()
  const [timedOut, setTimedOut] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    if (status !== 'checking') {
      setTimedOut(false)
      return
    }

    setTimedOut(false)
    const timeout = window.setTimeout(() => setTimedOut(true), CHECK_TIMEOUT_MS)
    return () => window.clearTimeout(timeout)
  }, [status])

  const handleRetry = async () => {
    if (retrying) return
    setRetrying(true)
    setTimedOut(false)
    await refresh()
    setRetrying(false)
  }

  const handleReset = async () => {
    if (resetting) return
    setResetting(true)
    await signOut()
    window.location.reload()
  }

  if (status === 'checking' && !timedOut) {
    return (
      <div className="auth-guard__state" role="status" aria-live="polite">
        <div className="auth-guard__spinner" />
        <p>Checking your session…</p>
      </div>
    )
  }

  if (status === 'checking' && timedOut) {
    return (
      <div className="auth-guard__state auth-guard__state--timeout">
        <h2>Still working…</h2>
        <p>
          The authentication check is taking longer than expected. You can retry or reset your
          session.
        </p>
        {error && <p className="auth-guard__error">{error}</p>}
        <div className="auth-guard__actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={handleRetry}
            disabled={retrying}
          >
            {retrying ? 'Retrying…' : 'Retry'}
          </button>
          <button type="button" onClick={handleReset} disabled={resetting} className="link">
            {resetting ? 'Resetting…' : 'Reset session'}
          </button>
        </div>
      </div>
    )
  }

  if (status === 'anon') {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
