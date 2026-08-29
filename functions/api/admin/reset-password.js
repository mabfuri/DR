import { createClient } from '@supabase/supabase-js'

export async function onRequestPost(context) {
  const { request, env } = context
  const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  })

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Server belum dikonfigurasi untuk reset password.' }, 500)
  }

  const authHeader = request.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Sesi admin tidak ditemukan.' }, 401)
  }

  let body
  try { body = await request.json() } catch {
    return json({ error: 'Request tidak valid.' }, 400)
  }

  const userId = typeof body?.userId === 'string' ? body.userId : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!userId || password.length < 8) {
    return json({ error: 'User dan password minimal 8 karakter wajib diisi.' }, 400)
  }

  const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const token = authHeader.slice(7)
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData?.user) {
    return json({ error: 'Sesi login tidak valid atau sudah kedaluwarsa.' }, 401)
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profileError) {
    return json({ error: `Gagal memeriksa role admin: ${profileError.message}` }, 500)
  }

  if (String(profile?.role || '').trim().toLowerCase() !== 'admin') {
    return json({ error: 'Akses admin diperlukan.' }, 403)
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, { password })
  if (updateError) {
    return json({ error: 'Gagal mengganti password user.', detail: updateError.message }, 400)
  }

  return json({ ok: true, message: 'Password user berhasil diubah.' })
}
