import { FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

const REDIRECT_URL = 'https://mcnish12.github.io/Honors/'

export default function Login() {
  const { status, error: authError, signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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

    setSubmitting(true)
    setFormError(null)
    setMessage(null)

    try {
      const { error } = await signInWithEmail(trimmedEmail, REDIRECT_URL)
      if (error) {
        setFormError(error.message || 'Unable to send the sign-in link. Please try again.')
      } else {
        setMessage('Check your email for a sign-in link. The message expires in 5 minutes.')
      }
    } catch (err) {
      const friendly = err instanceof Error ? err.message : 'Unable to send the sign-in link.'
      setFormError(friendly)
    }

    setSubmitting(false)
  }

  return (
    <div className="page login-page">
      <div className="card">
        <h1>Sign in to Honors</h1>
        <p className="card__subtitle">Enter your work email to receive a secure magic link.</p>
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
          {(formError || authError) && (
            <p className="form__error" role="alert">
              {formError || authError}
            </p>
          )}
          {message && <p className="form__status">{message}</p>}
          <button type="submit" className="button" disabled={submitting}>
            {submitting ? 'Sending link…' : 'Send magic link'}
          </button>
        </form>
        <p className="card__footer">Need help? Contact an administrator to verify your access.</p>
      </div>
    </div>
  )
}
