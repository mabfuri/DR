import { createClient } from '@supabase/supabase-js'

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
function json(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS }) }
function normalizeSlug(value) { return String(value || '').normalize('NFKC').trim().replace(/\s+/g, '').toLowerCase() }
function getSlug(context) { return context.params?.slug || new URL(context.request.url).pathname.split('/').filter(Boolean).pop() || '' }
function getClientIp(request) { return request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown' }
async function sha256(value) { const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('') }

async function getContextData(env, slug) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase server configuration belum lengkap.')
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const normalized = normalizeSlug(slug)
  if (!normalized) return { db, profile: null, offer: null, stats: null }
  const { data: profiles, error: profileError } = await db.from('profiles').select('id,username,status').eq('status', 'active')
  if (profileError) throw new Error(profileError.message)
  const matches = (profiles || []).filter(p => normalizeSlug(p.username) === normalized)
  if (matches.length > 1) throw new Error('URL user tidak unik. Nama user yang digabung menghasilkan duplikat.')
  const profile = matches[0] || null
  if (!profile) return { db, profile: null, offer: null, stats: null }
  const { data: offers, error: offerError } = await db.from('offers').select('id,title,link,status,sort_order,created_at,adsterra_placement_id').eq('user_id', profile.id).eq('status', 'active').order('sort_order', { ascending: true }).order('created_at', { ascending: false }).limit(1)
  if (offerError) throw new Error(offerError.message)
  const offer = offers?.[0] || null
  const { data: allOffers, error: allOffersError } = await db.from('offers').select('id').eq('user_id', profile.id).eq('status', 'active')
  if (allOffersError) throw new Error(allOffersError.message)
  const ids = (allOffers || []).map(row => row.id)
  let stats = null
  if (ids.length) {
    const { data: cacheRows, error: statsError } = await db.from('offer_adsterra_stats_cache').select('impressions,clicks,revenue,updated_at').in('offer_id', ids)
    if (!statsError && cacheRows?.length) {
      const totals = cacheRows.reduce((a, row) => ({ impressions: a.impressions + Number(row.impressions || 0), clicks: a.clicks + Number(row.clicks || 0), revenue: a.revenue + Number(row.revenue || 0) }), { impressions: 0, clicks: 0, revenue: 0 })
      stats = { impressions: totals.impressions, clicks: totals.clicks, ctr: totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0, cpm: totals.impressions ? (totals.revenue / totals.impressions) * 1000 : 0, revenue: totals.revenue, updatedAt: cacheRows.map(r => r.updated_at).sort().pop() || null }
    }
  }
  return { db, profile, offer, stats }
}

export async function onRequestGet(context) {
  try {
    const { profile, offer, stats } = await getContextData(context.env, getSlug(context))
    if (!profile) return json({ error: 'User tidak ditemukan.' }, 404)
    if (!offer) return json({ error: 'Belum ada offer aktif untuk user ini.' }, 404)
    return json({ ok: true, user: { username: profile.username }, offer: { id: offer.id, title: offer.title, link: offer.link }, stats: stats || { impressions: 0, clicks: 0, ctr: 0, cpm: 0, revenue: 0, updatedAt: null } })
  } catch (error) { return json({ error: error?.message || 'Gagal memuat dashboard user.' }, 500) }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context
    const { db, profile, offer } = await getContextData(env, getSlug(context))
    if (!profile) return json({ error: 'User tidak ditemukan.' }, 404)
    if (!offer) return json({ error: 'Belum ada offer aktif untuk user ini.' }, 404)
    const secret = String(env.LP_IP_HASH_SECRET || env.SUPABASE_SERVICE_ROLE_KEY || '')
    const ipHash = await sha256(`${secret}:${getClientIp(request)}`)
    const now = Date.now(); const hourAgo = new Date(now - 60 * 60 * 1000).toISOString(); const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString()
    const [{ count: hourlyCount, error: hourError }, { count: dailyIpCount, error: dayError }] = await Promise.all([
      db.from('lp_clicks').select('id', { count: 'exact', head: true }).eq('offer_id', offer.id).gte('clicked_at', hourAgo),
      db.from('lp_clicks').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('clicked_at', dayAgo)
    ])
    if (hourError || dayError) throw new Error(hourError?.message || dayError?.message)
    if (Number(hourlyCount || 0) >= 10) return json({ allowed: false, reason: '10 klik dalam 1 jam untuk offer ini sudah tercapai.' }, 429)
    if (Number(dailyIpCount || 0) >= 10) return json({ allowed: false, reason: 'IP ini sudah mencapai 10 klik dalam 24 jam.' }, 429)
    const { error: insertError } = await db.from('lp_clicks').insert({ offer_id: offer.id, ip_hash: ipHash })
    if (insertError) throw new Error(insertError.message)
    return json({ allowed: true, link: offer.link, remainingHourly: Math.max(0, 9 - Number(hourlyCount || 0)), remainingIpDaily: Math.max(0, 9 - Number(dailyIpCount || 0)) })
  } catch (error) { return json({ error: error?.message || 'Gagal memproses klik.' }, 500) }
}
