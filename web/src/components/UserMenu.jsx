import { useRef, useState } from 'react'
import { useAuthActions, useRole, useSession } from '../auth/AuthProvider.jsx'

export default function UserMenu() {
  const { user } = useSession()
  const { role } = useRole()
  const { signOut } = useAuthActions()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const detailsRef = useRef(null)

  const handleSignOut = async () => {
    setPending(true)
    setError(null)
    const { error: signOutError } = await signOut()
    if (signOutError) {
      setError(signOutError.message || 'Unable to sign out. Please try again.')
    } else if (detailsRef.current) {
      detailsRef.current.open = false
    }
    setPending(false)
  }

  const email = user?.email || 'Account'
  const displayRole = role || 'role unavailable'

  return (
    <details className="user-menu" ref={detailsRef} data-testid="user-menu">
      <summary className="user-menu__summary">
        <span className="user-menu__email">{email}</span>
        <span className="user-menu__role">{displayRole}</span>
      </summary>
      <div className="user-menu__content">
        <p className="user-menu__label">
          <span className="user-menu__label-heading">Signed in as</span>
          <span className="user-menu__label-value">{email}</span>
        </p>
        <p className="user-menu__label">
          <span className="user-menu__label-heading">Role</span>
          <span className="user-menu__label-value user-menu__label-role">{displayRole}</span>
        </p>
        {error && <p className="user-menu__error">{error}</p>}
        <button
          type="button"
          className="user-menu__logout"
          onClick={handleSignOut}
          disabled={pending}
        >
          {pending ? 'Signing out…' : 'Log out'}
        </button>
      </div>
    </details>
  )
}
