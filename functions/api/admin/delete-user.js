import { createClient } from '@supabase/supabase-js'

export async function onRequestPost(context) {
  const { request, env } = context
  const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  })

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Server belum dikonfigurasi untuk menghapus user.' }, 500)
  }

  const authHeader = request.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Sesi admin tidak ditemukan.' }, 401)
  const token = authHeader.slice(7).trim()
  if (!token) return json({ error: 'Sesi admin tidak ditemukan.' }, 401)

  let body
  try { body = await request.json() } catch { return json({ error: 'Request tidak valid.' }, 400) }

  const userId = typeof body?.userId === 'string' ? body.userId.trim() : ''
  if (!userId) return json({ error: 'User yang akan dihapus wajib dipilih.' }, 400)

  const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData?.user) return json({ error: 'Sesi login tidak valid atau sudah kedaluwarsa.' }, 401)

  const adminId = userData.user.id
  if (adminId === userId) return json({ error: 'Akun admin yang sedang digunakan tidak boleh dihapus dari panel ini.' }, 400)

  const { data: adminProfile, error: adminError } = await supabaseAdmin
    .from('profiles').select('role').eq('id', adminId).maybeSingle()
  if (adminError) return json({ error: `Gagal memeriksa role admin: ${adminError.message}` }, 500)
  if (String(adminProfile?.role || '').trim().toLowerCase() !== 'admin') return json({ error: 'Akses admin diperlukan.' }, 403)

  const { data: targetProfile, error: targetError } = await supabaseAdmin
    .from('profiles').select('username,role').eq('id', userId).maybeSingle()
  if (targetError) return json({ error: `Gagal memeriksa user: ${targetError.message}` }, 500)
  if (!targetProfile) return json({ error: 'Profil user tidak ditemukan.' }, 404)
  if (String(targetProfile.role || '').trim().toLowerCase() === 'admin') return json({ error: 'Akun admin tidak dapat dihapus dari panel ini.' }, 403)

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (deleteError) return json({ error: `Gagal menghapus akun: ${deleteError.message}` }, 400)

  return json({ ok: true, message: `User ${targetProfile.username || 'user'} berhasil dihapus.` })
}
