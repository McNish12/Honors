/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import supabase, { hasSupabaseConfig } from '../lib/supabaseClient.js'

const AuthContext = createContext(null)

function logAuthEvent(...args) {
  if (import.meta.env.DEV) {
    console.info('[auth]', ...args)
  }
}

function formatErrorMessage(error) {
  if (!error) return null
  const message = typeof error === 'string' ? error : error.message
  if (!message) return 'An unexpected error occurred.'
  if (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')) {
    return 'Unable to reach the authentication service. Check your connection and try again.'
  }
  return message
}

const CONFIG_ERROR_MESSAGE = 'Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [initializing, setInitializing] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [error, setError] = useState(null)
  const isMountedRef = useRef(true)

  useEffect(() => () => {
    isMountedRef.current = false
  }, [])

  const loadProfile = useCallback(
    async (user) => {
      if (!hasSupabaseConfig) {
        if (isMountedRef.current) {
          setError(CONFIG_ERROR_MESSAGE)
        }
        return null
      }

      if (!user) {
        if (isMountedRef.current) {
          setProfile(null)
        }
        return null
      }

      if (!isMountedRef.current) return null
      setProfileLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('app_users')
          .select('id, email, role, created_at, updated_at')
          .eq('id', user.id)
          .maybeSingle()

        if (fetchError) throw fetchError

        if (data) {
          if (isMountedRef.current) {
            setProfile(data)
          }
          return data
        }

        const { data: inserted, error: insertError } = await supabase
          .from('app_users')
          .insert({
            id: user.id,
            email: user.email?.toLowerCase() || user.email,
            role: 'staff',
          })
          .select('id, email, role, created_at, updated_at')
          .single()

        if (insertError) throw insertError

        if (isMountedRef.current) {
          setProfile(inserted)
        }
        return inserted
      } catch (err) {
        const friendly = formatErrorMessage(err)
        logAuthEvent('profile error', err)
        if (isMountedRef.current) {
          setProfile(null)
          setError(friendly)
        }
        return null
      } finally {
        if (isMountedRef.current) {
          setProfileLoading(false)
        }
      }
    },
    [],
  )

  const fetchSession = useCallback(async () => {
    if (!hasSupabaseConfig) {
      if (isMountedRef.current) {
        setError(CONFIG_ERROR_MESSAGE)
        setSession(null)
        setProfile(null)
        setInitializing(false)
      }
      return null
    }

    if (!isMountedRef.current) return null
    setInitializing(true)
    setError(null)
    try {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!isMountedRef.current) return data.session

      const currentSession = data.session
      setSession(currentSession)
      if (currentSession?.user) {
        await loadProfile(currentSession.user)
      } else {
        setProfile(null)
      }

      return currentSession
    } catch (err) {
      logAuthEvent('session error', err)
      if (isMountedRef.current) {
        setSession(null)
        setProfile(null)
        setError(formatErrorMessage(err))
      }
      return null
    } finally {
      if (isMountedRef.current) {
        setInitializing(false)
      }
    }
  }, [loadProfile])

  useEffect(() => {
    fetchSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMountedRef.current) return
      logAuthEvent('state change', event)
      setSession(newSession)
      if (newSession?.user) {
        await loadProfile(newSession.user)
      } else {
        setProfile(null)
      }
      if (event === 'SIGNED_OUT') {
        setError(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchSession, loadProfile])

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return null
    return loadProfile(session.user)
  }, [loadProfile, session])

  const signInWithPassword = useCallback(
    async ({ email, password }) => {
      if (!hasSupabaseConfig) {
        const configError = new Error(CONFIG_ERROR_MESSAGE)
        logAuthEvent('sign-in error', configError)
        return { data: null, error: configError }
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) {
        logAuthEvent('sign-in error', signInError)
      } else {
        logAuthEvent('signed in', data?.user?.id)
      }
      return { data, error: signInError }
    },
    [],
  )

  const signOut = useCallback(async () => {
    if (!hasSupabaseConfig) {
      const configError = new Error(CONFIG_ERROR_MESSAGE)
      logAuthEvent('sign-out error', configError)
      return { error: configError }
    }

    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      logAuthEvent('sign-out error', signOutError)
    } else {
      logAuthEvent('signed out')
    }
    return { error: signOutError }
  }, [])

  const resetPassword = useCallback(async (email) => {
    if (!hasSupabaseConfig) {
      const configError = new Error(CONFIG_ERROR_MESSAGE)
      logAuthEvent('password reset error', configError)
      return { data: null, error: configError }
    }

    const { data, error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL || '/'}`,
    })
    if (resetError) {
      logAuthEvent('password reset error', resetError)
    } else {
      logAuthEvent('password reset requested', email)
    }
    return { data, error: resetError }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role: profile?.role ?? null,
      initializing,
      profileLoading,
      loading: initializing || profileLoading,
      error,
      actions: {
        signInWithPassword,
        signOut,
        resetPassword,
        refreshProfile,
        refreshSession: fetchSession,
      },
    }),
    [
      session,
      profile,
      initializing,
      profileLoading,
      error,
      signInWithPassword,
      signOut,
      resetPassword,
      refreshProfile,
      fetchSession,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

export function useAuth() {
  return useAuthContext()
}

export function useSession() {
  const { session, user, loading, initializing } = useAuthContext()
  return { session, user, loading, initializing }
}

export function useRole() {
  const { role, profile, loading } = useAuthContext()
  return { role, profile, loading }
}

export function useAuthActions() {
  const { actions } = useAuthContext()
  return actions
}

export function useAuthError() {
  const { error } = useAuthContext()
  return error
}

export default AuthProvider
