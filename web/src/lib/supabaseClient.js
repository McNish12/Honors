import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

if (import.meta.env.DEV) {
  if (!supabaseUrl) {
    console.warn('Supabase URL is not configured. Set VITE_SUPABASE_URL in your environment variables.')
  }
  if (!supabaseAnonKey) {
    console.warn('Supabase anon key is not configured. Set VITE_SUPABASE_ANON_KEY in your environment variables.')
  }
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'honors-auth',
  },
})

export default supabase
