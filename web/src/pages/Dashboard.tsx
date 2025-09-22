import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getOrCreateAppUser, UnauthorizedError } from '../api/users'
import { useAuth } from '../auth/useAuth'
import type { AppUser } from '../types'

export default function Dashboard() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(
    () => () => {
      isMountedRef.current = false
    },
    [],
  )

  const loadProfile = useCallback(async () => {
    if (!isMountedRef.current) return

    setLoading(true)
    setError(null)

    try {
      const profile = await getOrCreateAppUser()
      if (!isMountedRef.current) return
      setAppUser(profile)

      const hasDisplayName = typeof profile.display_name === 'string' && profile.display_name.trim().length > 0
      if (!hasDisplayName) {
        navigate('/onboarding')
      }
    } catch (err) {
      if (!isMountedRef.current) return

      if (err instanceof UnauthorizedError) {
        navigate('/login', { replace: true })
        return
      }

      const friendly = err instanceof Error ? err.message : 'Unable to load your profile.'
      setError(friendly)
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [navigate])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleRefresh = async () => {
    await loadProfile()
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const createdAt = useMemo(() => {
    if (!appUser?.created_at) return ''
    const parsed = new Date(appUser.created_at)
    if (Number.isNaN(parsed.getTime())) return appUser.created_at
    return parsed.toLocaleString()
  }, [appUser])

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div>
          <h1>Honors Dashboard</h1>
          <p className="page-header__subtitle">Supabase session demo with protected content.</p>
        </div>
        <div className="page-header__actions">
          <button type="button" className="button button--ghost" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh profile'}
          </button>
          <button type="button" className="button button--danger" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>
      <section className="card">
        {loading && <p>Loading your profile…</p>}
        {!loading && error && (
          <p className="form__error" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && appUser && (
          <>
            <dl className="profile">
              <div>
                <dt>Email</dt>
                <dd>{appUser.email}</dd>
              </div>
              <div>
                <dt>Display name</dt>
                <dd>{appUser.display_name || <span className="muted">Not set</span>}</dd>
              </div>
              <div>
                <dt>Account created</dt>
                <dd>{createdAt}</dd>
              </div>
              <div>
                <dt>Auth user ID</dt>
                <dd className="monospace">{appUser.id}</dd>
              </div>
            </dl>
            <div>
              <Link to="/jobs" className="link">
                Go to Jobs →
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
