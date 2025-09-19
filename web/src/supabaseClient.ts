import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (import.meta.env.DEV) {
  const projectInfo = supabaseUrl ?? '(missing URL)'
  const anonKeyState = supabaseAnonKey ? 'present' : 'missing'
  console.debug('[supabase] project:', projectInfo, '| anon key:', anonKeyState)
}

export const supabase: SupabaseClient = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'honors-auth',
  },
})

export default supabase
