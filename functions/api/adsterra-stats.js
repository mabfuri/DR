import { createClient } from '@supabase/supabase-js'

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))
}

function normalizeApiKey(value) {
  let key = String(value || '').trim()
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim()
  }
  return key
}

export async function onRequestGet(context) {
  const { request, env } = context

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Supabase server configuration belum lengkap.' }, 500)
  }

  const apiKey = normalizeApiKey(env.ADSTERRA_API_KEY)
  if (!apiKey) {
    return json({ error: 'ADSTERRA_API_KEY belum dikonfigurasi di Cloudflare Preview/Production.' }, 500)
  }

  const authHeader = request.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Sesi admin tidak ditemukan.' }, 401)
  const token = authHeader.slice(7).trim()
  if (!token) return json({ error: 'Sesi admin tidak ditemukan.' }, 401)

  const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData?.user) return json({ error: 'Sesi login tidak valid atau sudah kedaluwarsa.' }, 401)

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
  if (profileError) return json({ error: `Gagal memeriksa role admin: ${profileError.message}` }, 500)
  if (String(profile?.role || '').trim().toLowerCase() !== 'admin') return json({ error: 'Akses admin diperlukan.' }, 403)

  const url = new URL(request.url)
  const placement = url.searchParams.get('placement')?.trim() || ''
  const domain = url.searchParams.get('domain')?.trim() || ''
  const startDate = url.searchParams.get('start_date')?.trim() || '2020-01-01'
  const finishDate = url.searchParams.get('finish_date')?.trim() || new Date().toISOString().slice(0, 10)

  if (!domain || !/^\d+$/.test(domain)) return json({ error: 'Domain ID tidak valid.' }, 400)
  if (!placement || !/^\d+$/.test(placement)) return json({ error: 'Placement ID tidak valid.' }, 400)
  if (!isDate(startDate) || !isDate(finishDate)) return json({ error: 'Format tanggal harus YYYY-MM-DD.' }, 400)
  if (startDate > finishDate) return json({ error: 'Tanggal mulai tidak boleh setelah tanggal akhir.' }, 400)

  const params = new URLSearchParams({
    domain,
    placement,
    start_date: startDate,
    finish_date: finishDate,
    group_by: 'placement'
  })

  const apiUrl = `https://api3.adsterratools.com/publisher/stats.json?${params.toString()}`
  let response
  try {
    response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-API-Key': apiKey
      }
    })
  } catch (error) {
    return json({ error: `Gagal menghubungi Adsterra: ${error?.message || 'network error'}` }, 502)
  }

  const raw = await response.text()
  let data
  try { data = raw ? JSON.parse(raw) : null } catch { data = null }

  if (!response.ok) {
    return json({
      error: 'Adsterra menolak permintaan statistik.',
      status: response.status,
      details: data || raw.slice(0, 500)
    }, response.status === 401 || response.status === 403 ? 502 : response.status)
  }

  return json({ ok: true, placement, domain, start_date: startDate, finish_date: finishDate, data })
}
