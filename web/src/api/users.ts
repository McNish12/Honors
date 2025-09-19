import type { PostgrestError } from '@supabase/supabase-js'
import supabase from '../supabaseClient'
import type { AppUser } from '../types'

export class UnauthorizedError extends Error {
  constructor(message = 'You are not signed in.') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

const SELECT_FIELDS = 'id, email, display_name, created_at'

const SCHEMA_MESSAGE =
  'API schema not refreshed — open Supabase Database > API and click “Refresh” to rebuild the cache.'
const PERMISSION_MESSAGE = 'Permission denied — check RLS/grants.'

function mapAppUser(row: AppUser | null): AppUser | null {
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    created_at: row.created_at,
  }
}

function translateError(error: PostgrestError): Error {
  const message = error.message?.toLowerCase() ?? ''

  if (error.code === '42501' || message.includes('permission denied')) {
    return new Error(PERMISSION_MESSAGE)
  }

  if (
    error.code === '42P01' ||
    error.code === 'PGRST301' ||
    (message.includes('relation') && message.includes('app_users')) ||
    (message.includes('not found') && message.includes('app_users'))
  ) {
    return new Error(SCHEMA_MESSAGE)
  }

  if (error.code === '401' || message.includes('jwt') || message.includes('unauth')) {
    return new UnauthorizedError('Session expired. Please sign in again.')
  }

  return new Error(error.message || 'Unable to load your profile. Please try again.')
}

export async function getOrCreateAppUser(): Promise<AppUser> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error('Failed to retrieve authenticated user:', userError)
    throw new Error('Unable to read the current session. Please sign in again.')
  }

  if (!user) {
    throw new UnauthorizedError('You are not signed in.')
  }

  const { data, error } = await supabase
    .from('app_users')
    .select<AppUser>(SELECT_FIELDS)
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    const friendly = translateError(error)
    console.error('Failed to fetch app_users row:', error)
    throw friendly
  }

  const existing = mapAppUser(data)
  if (existing) {
    return existing
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  const displayName = typeof metadata.full_name === 'string' ? metadata.full_name : null

  const insertPayload = {
    id: user.id,
    email: (user.email ?? '').toLowerCase(),
    display_name: displayName,
  }

  const { data: inserted, error: insertError } = await supabase
    .from('app_users')
    .insert(insertPayload)
    .select<AppUser>(SELECT_FIELDS)
    .single()

  if (insertError) {
    const friendly = translateError(insertError)
    console.error('Failed to create app_users row:', insertError)
    throw friendly
  }

  const created = mapAppUser(inserted)
  if (!created) {
    throw new Error('Profile creation returned an empty response.')
  }

  return created
}
