export async function onRequestPost(context) {
  const { request, env } = context
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_ANON_KEY) {
    return json({ error: 'Server belum dikonfigurasi untuk reset password.' }, 500)
  }

  const authHeader = request.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Sesi admin tidak ditemukan.' }, 401)

  let body
  try { body = await request.json() } catch { return json({ error: 'Request tidak valid.' }, 400) }
  const userId = typeof body?.userId === 'string' ? body.userId : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!userId || password.length < 8) return json({ error: 'User dan password minimal 8 karakter wajib diisi.' }, 400)

  const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: authHeader }
  })
  if (!userResponse.ok) return json({ error: 'Sesi login tidak valid atau sudah kedaluwarsa.' }, 401)
  const currentUser = await userResponse.json()

  const profileResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(currentUser.id)}&select=role`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }
  })
  const profiles = profileResponse.ok ? await profileResponse.json() : []
  if (!profiles[0] || profiles[0].role !== 'admin') return json({ error: 'Akses admin diperlukan.' }, 403)

  const targetResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ password })
  })
  if (!targetResponse.ok) {
    const detail = await targetResponse.text()
    return json({ error: 'Gagal mengganti password user.', detail: detail.slice(0, 500) }, targetResponse.status >= 400 && targetResponse.status < 500 ? targetResponse.status : 502)
  }
  return json({ ok: true, message: 'Password user berhasil diubah.' })
}
