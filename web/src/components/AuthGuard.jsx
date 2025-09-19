import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthActions, useAuthError, useRole, useSession } from '../auth/AuthProvider.jsx'

const rolePriority = {
  viewer: 1,
  staff: 2,
  admin: 3,
}

function hasRequiredRole(currentRole, requiredRole) {
  if (!requiredRole) return true
  const current = rolePriority[currentRole] ?? 0
  const required = rolePriority[requiredRole] ?? 0
  return current >= required
}

export default function AuthGuard({ children, requiredRole }) {
  const location = useLocation()
  const { user, loading } = useSession()
  const { role } = useRole()
  const error = useAuthError()
  const { refreshSession } = useAuthActions()

  if (loading) {
    return (
      <div className="auth-guard__loading" role="status" aria-live="polite">
        <div className="spinner" />
        <p>Checking your session…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="auth-guard__error">
        <p>{error}</p>
        <button
          type="button"
          onClick={refreshSession}
          className="auth-guard__retry"
          disabled={loading}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    )
  }

  if (!hasRequiredRole(role, requiredRole)) {
    return (
      <div className="auth-guard__error">
        <h2>Access restricted</h2>
        <p>You do not have permission to view this section.</p>
      </div>
    )
  }

  if (children) {
    return children
  }

  return <Outlet />
}
