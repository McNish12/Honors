import { FormEvent, useCallback, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

const REDIRECT_URL = 'https://mcnish12.github.io/Honors/'

export default function Login() {
  const { status, error: authError, signInWithEmail, signInWithPassword } = useAuth()
  const [mode, setMode] = useState<'magic' | 'password'>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const combinedError = useMemo(() => formError || authError, [authError, formError])

  const handleModeChange = useCallback(
    (nextMode: 'magic' | 'password') => {
      if (nextMode === mode) return
      setMode(nextMode)
      setFormError(null)
      setMessage(null)
      if (nextMode === 'magic') {
        setPassword('')
      }
    },
    [mode],
  )

  if (status === 'authed') {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      setFormError('Enter your email address to continue.')
      return
    }

    if (mode === 'password' && !password) {
      setFormError('Enter your password to continue.')
      return
    }

    setSubmitting(true)
    setFormError(null)
    if (mode === 'magic') {
      setMessage(null)
    }

    try {
      if (mode === 'magic') {
        const { error } = await signInWithEmail(trimmedEmail, REDIRECT_URL)
        if (error) {
          setFormError(
            error.message || 'Unable to send the sign-in link. Please try again.',
          )
        } else {
          setMessage('Check your email for a sign-in link. The message expires in 5 minutes.')
        }
      } else {
        const { error } = await signInWithPassword(trimmedEmail, password)
        if (error) {
          setFormError(
            error.message ||
              'Unable to sign in with that email and password. Please try again.',
          )
        }
      }
    } catch (err) {
      const friendly =
        err instanceof Error
          ? err.message
          : mode === 'magic'
            ? 'Unable to send the sign-in link.'
            : 'Unable to sign in with the provided credentials.'
      setFormError(friendly)
    }

    setSubmitting(false)
  }

  return (
    <div className="page login-page">
      <div className="card">
        <h1>Sign in to Honors</h1>
        <p className="card__subtitle">
          Use a magic link or enter your password to securely access your account.
        </p>
        <div className="login-page__mode-selector" role="tablist" aria-label="Sign-in method">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'magic'}
            className={`button button--subtle${mode === 'magic' ? ' is-active' : ''}`}
            onClick={() => handleModeChange('magic')}
            disabled={submitting}
          >
            Magic link
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'password'}
            className={`button button--subtle${mode === 'password' ? ' is-active' : ''}`}
            onClick={() => handleModeChange('password')}
            disabled={submitting}
          >
            Email &amp; password
          </button>
        </div>
        <form className="form" onSubmit={handleSubmit}>
          <label className="form__field">
            <span>Email address</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
              required
            />
          </label>
          {mode === 'password' && (
            <label className="form__field">
              <span>Password</span>
              <input
                type="password"
                name="current-password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={submitting}
                required
              />
            </label>
          )}
          {combinedError && (
            <p className="form__error" role="alert">
              {combinedError}
            </p>
          )}
          {mode === 'magic' && message && <p className="form__status">{message}</p>}
          <button type="submit" className="button" disabled={submitting}>
            {submitting
              ? mode === 'magic'
                ? 'Sending link…'
                : 'Signing in…'
              : mode === 'magic'
                ? 'Send magic link'
                : 'Sign in'}
          </button>
        </form>
        <p className="card__footer">Need help? Contact an administrator to verify your access.</p>
      </div>
    </div>
  )
}
