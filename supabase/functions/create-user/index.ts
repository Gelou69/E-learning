/**
 * Supabase Edge Function: create-user
 *
 * Creating an account needs the Auth Admin API, which requires the service role
 * key. That key must never ship to the browser, so the frontend calls this
 * function instead. Only an admin (verified from the caller's own token) can
 * create accounts, and every account is created already confirmed.
 *
 * Deploy:
 *   supabase functions deploy create-user
 * Set secrets (already available by default as SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY):
 *   supabase secrets set SUPABASE_URL=https://xxx.supabase.co
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

const ROLES = new Set(['student', 'teacher', 'admin'])
const SECTIONS = new Set(['VGD 11 - Section A', 'VGD 11 - Section B', 'VGD 11 - Section C'])

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const isEmail = (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ error: 'Edge Function secrets are not configured.' }, 500)
  }

  // 1. Authenticate the caller with their own token.
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'You must be signed in.' }, 401)

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await caller.auth.getUser()
  if (userError || !userData?.user) return json({ error: 'Your session has expired. Sign in again.' }, 401)

  // 2. Authorise: admin only.
  const { data: profile } = await caller
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') return json({ error: 'Only an admin can create accounts.' }, 403)

  // 3. Validate the payload.
  const body = await req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : ''
  const role = ROLES.has(body?.role) ? body.role : 'student'
  const section = SECTIONS.has(body?.section) ? body.section : null
  const studentNo = typeof body?.studentNo === 'string' && body.studentNo.trim() ? body.studentNo.trim() : null
  const gender = typeof body?.gender === 'string' ? body.gender : null

  if (!isEmail(email)) return json({ error: 'Enter a valid email address.' }, 400)
  if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400)
  if (!fullName) return json({ error: 'Enter the full name.' }, 400)

  // 4. Create the auth user with the service role key (server side only).
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    // role lives in app metadata so the signup trigger can trust it
    app_metadata: { role },
    user_metadata: {
      full_name: fullName,
      section,
      student_no: studentNo,
      gender,
      avatar_color: '#0f766e',
    },
  })

  if (error) {
    const duplicate = /already (been )?(registered|exists)|duplicate/i.test(error.message)
    return json({ error: duplicate ? 'That email already has an account.' : error.message }, duplicate ? 409 : 400)
  }

  return json({ ok: true, userId: data.user?.id ?? null })
})
