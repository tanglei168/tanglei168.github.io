import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'

// Lazily initialize to avoid WebSocket errors during SSG (Node.js < 22)
let _instance: SupabaseClient | undefined

function getInstance(): SupabaseClient {
  if (!_instance) {
    _instance = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  }
  return _instance
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop: string | symbol) {
    const val = (getInstance() as any)[prop as string]
    return typeof val === 'function' ? val.bind(getInstance()) : val
  },
})
