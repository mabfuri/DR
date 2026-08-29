import { createClient } from '@supabase/supabase-js'

export async function onRequestPost(context) {
  const { request, env } = context
  const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  })

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Server belum dikonfigurasi untuk membuat user.' }, 500)
  }

  const authHeader = request.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Sesi admin tidak ditemukan.' }, 401)

  let body
  try { body = await request.json() } catch { return json({ error: 'Request tidak valid.' }, 400) }

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const role = body?.role === 'admin' ? 'admin' : 'user'
  const level = ['free', 'basic', 'premium', 'vip'].includes(body?.level) ? body.level : 'free'
  const status = ['active', 'suspended'].includes(body?.status) ? body.status : 'active'
  const exclusiveLink = typeof body?.exclusiveLink === 'string' ? body.exclusiveLink.trim() : ''
  const dashboardLink = typeof body?.dashboardLink === 'string' ? body.dashboardLink.trim() : ''

  if (!email || !email.includes('@')) return json({ error: 'Email valid wajib diisi.' }, 400)
  if (!username || username.length < 2 || username.length > 50) return json({ error: 'Username harus 2-50 karakter.' }, 400)
  if (password.length < 8) return json({ error: 'Password minimal 8 karakter.' }, 400)

  const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const token = authHeader.slice(7)
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData?.user) return json({ error: 'Sesi login tidak valid atau sudah kedaluwarsa.' }, 401)

  const { data: adminProfile, error: adminError } = await supabaseAdmin
    .from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
  if (adminError) return json({ error: `Gagal memeriksa role admin: ${adminError.message}` }, 500)
  if (String(adminProfile?.role || '').trim().toLowerCase() !== 'admin') return json({ error: 'Akses admin diperlukan.' }, 403)

  const { data: existingUsername, error: usernameError } = await supabaseAdmin
    .from('profiles').select('id').eq('username', username).maybeSingle()
  if (usernameError) return json({ error: `Gagal memeriksa username: ${usernameError.message}` }, 500)
  if (existingUsername) return json({ error: 'Username sudah digunakan.' }, 409)

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username }
  })
  if (createError || !created?.user) return json({ error: createError?.message || 'Gagal membuat akun.' }, 400)

  const newUserId = created.user.id
  const { error: profileError } = await supabaseAdmin.from('profiles').update({
    username, role, level, status,
    exclusive_link: exclusiveLink || null,
    personal_dashboard_link: dashboardLink || null
  }).eq('id', newUserId)

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(newUserId)
    return json({ error: `Akun dibuat tetapi profil gagal disiapkan: ${profileError.message}` }, 500)
  }

  return json({ ok: true, user: { id: newUserId, username, email, role, level, status } }, 201)
}
