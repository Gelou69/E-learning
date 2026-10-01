/**
 * Supabase client + connection status.
 *
 * Copy `.env.example` → `.env.local` and fill in your project values:
 *   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
 *   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
 *   VITE_SUPABASE_ANON_KEY=eyJhbGciOi... (legacy name also supported)
 *
 * Without those values the app runs on the built-in demo adapter so it still
 * works offline; with them every read and write goes to Postgres.
 */

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''

export const isSupabaseConfigured = url.startsWith('http') && supabaseKey.length > 20

export const supabase = isSupabaseConfigured
  ? createClient(url, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'vgd-hub-supabase-auth',
      },
      global: { headers: { 'x-client-info': 'vgd-e-learning-hub/1.0' } },
    })
  : null

export const BUCKETS = {
  submissions: 'submissions',
  lessons: 'lessons',
  plates: 'plates',
  avatars: 'avatars',
}

/** Upload a File/Blob and return its storage path. */
export async function uploadFile(bucket, path, file) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })
  if (error) throw error
  return path
}

export async function uploadDataUrl(bucket, path, dataUrl) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const base64 = dataUrl.split(',')[1] ?? ''
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: dataUrl.match(/data:(.*?);/)?.[1] ?? 'image/png',
    cacheControl: '3600',
    upsert: true,
  })
  if (error) throw error
  return path
}

/** Resolve a stored path to a URL the browser can render. */
export async function resolveFileUrl(bucket, path, { signed = true, expires = 3600 } = {}) {
  if (!path) return null
  if (path.startsWith('data:') || path.startsWith('http')) return path
  if (!supabase) return null
  if (!signed) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expires)
  if (error) return null
  return data.signedUrl
}

/**
 * Batch variant of resolveFileUrl: one request for every path, with a fallback
 * to per-path signing for older projects where the batch endpoint is missing.
 */
export async function resolveFileUrls(bucket, paths, { signed = true, expires = 3600 } = {}) {
  const list = [...new Set((paths ?? []).filter(Boolean))]
  if (!list.length) return new Map()
  if (!signed) {
    return new Map(list.map((p) => [p, supabase.storage.from(bucket).getPublicUrl(p).data.publicUrl]))
  }
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(list, expires)
  if (!error && data) {
    return new Map(data.filter((d) => d.path && d.signedUrl).map((d) => [d.path, d.signedUrl]))
  }
  const entries = await Promise.all(list.map(async (p) => [p, await resolveFileUrl(bucket, p, { signed, expires })]))
  return new Map(entries)
}

export async function removeFile(bucket, path) {
  if (!path || !supabase) return
  await supabase.storage.from(bucket).remove([path])
}

export async function listFiles(bucket, prefix = '') {
  if (!supabase) return []
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
  if (error) return []
  return data ?? []
}
