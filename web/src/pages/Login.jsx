import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthActions, useAuthError, useSession } from '../auth/AuthProvider.jsx';

const initialFormState = {
  email: '',
  password: '',
};

export default function Login() {
  const [form, setForm] = useState(initialFormState);
  const [formError, setFormError] = useState(null);
  const [formStatus, setFormStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const authError = useAuthError();
  const { signInWithPassword, resetPassword } = useAuthActions();

  const redirectPath = useMemo(() => {
    if (location.state?.from && location.state.from !== '/login') {
      return location.state.from;
    }
    return '/';
  }, [location.state]);

  useEffect(() => {
    if (!loading && user) {
      navigate(redirectPath, { replace: true });
    }
  }, [loading, navigate, redirectPath, user]);

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    setFormStatus(null);

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      setFormError('Enter your email and password to continue.');
      setSubmitting(false);
      return;
    }

    const { error } = await signInWithPassword({ email, password });
    if (error) {
      setFormError(error.message || 'Invalid credentials. Please try again.');
      setSubmitting(false);
      return;
    }

    setFormStatus('Signed in successfully. Redirecting…');
    setSubmitting(false);
    navigate(redirectPath, { replace: true });
  };

  const handlePasswordReset = async () => {
    if (resetting) return;
    const email = form.email.trim().toLowerCase();
    if (!email) {
      setFormError('Enter your email address to request a reset link.');
      return;
    }

    setResetting(true);
    setFormError(null);
    setFormStatus(null);
    const { error } = await resetPassword(email);
    if (error) {
      setFormError(error.message || 'Unable to send reset email. Please try again.');
    } else {
      setFormStatus('Check your inbox for a password reset link.');
    }
    setResetting(false);
  };

  if (loading) {
    return (
      <div className="login-page__loading" role="status" aria-live="polite">
        <div className="spinner" />
        <p>Loading…</p>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Honors Ops Login</h1>
        <p className="login-card__subtitle">Sign in with your team email to access the dashboard.</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-form__field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={updateField('email')}
              disabled={submitting}
              required
            />
          </label>
          <label className="login-form__field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={form.password}
              onChange={updateField('password')}
              disabled={submitting}
              required
            />
          </label>
          {(formError || authError) && (
            <div className="login-form__error" role="alert">
              {formError || authError}
            </div>
          )}
          {formStatus && <p className="login-form__status">{formStatus}</p>}
          <button type="submit" className="login-form__submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <button
          type="button"
          className="login-form__forgot"
          onClick={handlePasswordReset}
          disabled={resetting || submitting}
        >
          {resetting ? 'Sending reset link…' : 'Forgot password?'}
        </button>
        <p className="login-card__footer">
          Need help? Contact your system administrator.
        </p>
        <p className="login-card__footer login-card__footer--small">
          <Link to="/">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
