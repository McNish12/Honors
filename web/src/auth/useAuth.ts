import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import supabase, { isSupabaseConfigured } from '../supabaseClient'

type AuthStatus = 'checking' | 'authed' | 'anon'

type SignInWithEmailResult = Awaited<ReturnType<typeof supabase.auth.signInWithOtp>>
type SignInWithPasswordResult = Awaited<
  ReturnType<typeof supabase.auth.signInWithPassword>
>

type AuthContextValue = {
  session: Session | null
  user: User | null
  status: AuthStatus
  error: string | null
  isConfigured: boolean
  signInWithEmail: (
    email: string,
    redirectTo?: string,
  ) => Promise<SignInWithEmailResult>
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<SignInWithPasswordResult>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const CONFIG_ERROR = 'Missing VITE_SUPABASE_URL/ANON_KEY'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type AuthParamState = {
  hasCode: boolean
  fromSearch: boolean
  fromHash: boolean
}

function readAuthParams(): AuthParamState {
  const searchParams = new URLSearchParams(window.location.search)
  const fromSearch = searchParams.has('code')

  const hash = window.location.hash
  let fromHash = false
  if (hash.includes('?')) {
    const query = hash.slice(hash.indexOf('?') + 1)
    const hashParams = new URLSearchParams(query)
    fromHash = hashParams.has('code')
  }

  return {
    hasCode: fromSearch || fromHash,
    fromSearch,
    fromHash,
  }
}

function clearAuthParams({ fromSearch, fromHash }: AuthParamState) {
  const currentUrl = new URL(window.location.href)

  if (fromSearch) {
    currentUrl.searchParams.delete('code')
    currentUrl.searchParams.delete('state')
  }

  let newHash = window.location.hash
  if (fromHash && window.location.hash.includes('?')) {
    const [hashPath, hashQuery] = window.location.hash.split('?')
    const hashParams = new URLSearchParams(hashQuery)
    hashParams.delete('code')
    hashParams.delete('state')
    const cleaned = hashParams.toString()
    newHash = cleaned ? `${hashPath}?${cleaned}` : hashPath
  }

  currentUrl.hash = newHash

  const cleanedUrl = `${currentUrl.origin}${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
  window.history.replaceState({}, document.title, cleanedUrl)
}

function describeError(error: unknown): string {
  if (typeof error === 'string') return error
  if (error instanceof Error && error.message) return error.message
  return 'Unexpected authentication error. Please try again.'
}

function useProvideAuth(): AuthContextValue {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(
    () => () => {
      isMountedRef.current = false
    },
    [],
  )

  const applySession = useCallback((nextSession: Session | null) => {
    if (!isMountedRef.current) return
    setSession(nextSession)
    setStatus(nextSession ? 'authed' : 'anon')
  }, [])

  const loadSession = useCallback(async () => {
    if (!isMountedRef.current) {
      return
    }

    if (!isSupabaseConfigured) {
      setSession(null)
      setStatus('anon')
      setError(CONFIG_ERROR)
      return
    }

    setStatus('checking')
    setError(null)

    try {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      applySession(data.session ?? null)
    } catch (err) {
      const friendly = describeError(err)
      console.error('Auth session error:', err)
      applySession(null)
      setError(friendly)
    }
  }, [applySession])

  const exchangeCodeIfPresent = useCallback(async () => {
    if (!isSupabaseConfigured || !isMountedRef.current) {
      return
    }

    const authParams = readAuthParams()
    if (!authParams.hasCode) {
      return
    }

    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
        window.location.href,
      )
      if (exchangeError) throw exchangeError
      clearAuthParams(authParams)
    } catch (err) {
      const friendly = describeError(err)
      console.error('Failed to exchange Supabase code:', err)
      clearAuthParams(authParams)
      applySession(null)
      setError(friendly)
      setStatus('anon')
    }
  }, [applySession])

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null

    const initialise = async () => {
      if (!isMountedRef.current) return

      if (!isSupabaseConfigured) {
        setSession(null)
        setStatus('anon')
        setError(CONFIG_ERROR)
        return
      }

      await exchangeCodeIfPresent()
      await loadSession()
    }

    initialise()

    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
        applySession(newSession)
        setError(null)
      })
      subscription = data.subscription
    }

    return () => {
      subscription?.unsubscribe()
    }
  }, [applySession, exchangeCodeIfPresent, loadSession])

  const signInWithEmail = useCallback(
    async (email: string, redirectTo?: string) => {
      if (!isSupabaseConfigured) {
        setError(CONFIG_ERROR)
        throw new Error(CONFIG_ERROR)
      }

      const trimmed = email.trim().toLowerCase()
      const result = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: true,
        },
      })

      if (result.error) {
        const friendly = describeError(result.error)
        console.error('Sign-in request failed:', result.error)
        setError(friendly)
      } else {
        setError(null)
      }

      return result
    },
    [],
  )

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!isSupabaseConfigured) {
        setError(CONFIG_ERROR)
        throw new Error(CONFIG_ERROR)
      }

      const trimmed = email.trim().toLowerCase()
      const result = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      })

      if (result.error) {
        const friendly = describeError(result.error)
        console.error('Password sign-in failed:', result.error)
        setError(friendly)
      } else {
        setError(null)
      }

      return result
    },
    [],
  )

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setSession(null)
      setStatus('anon')
      setError(CONFIG_ERROR)
      return
    }

    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      const friendly = describeError(signOutError)
      console.error('Sign-out failed:', signOutError)
      setError(friendly)
      return
    }

    setError(null)
    applySession(null)
  }, [applySession])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      status,
      error,
      isConfigured: isSupabaseConfigured,
      signInWithEmail,
      signInWithPassword,
      signOut,
      refresh: loadSession,
    }),
    [
      error,
      loadSession,
      session,
      signInWithEmail,
      signInWithPassword,
      signOut,
      status,
    ],
  )

  return value
}

export function AuthProvider({ children }: PropsWithChildren<unknown>) {
  const value = useProvideAuth()
  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
