import { supabase } from './supabase'

export async function getAdsterraStats({ placement, domain = '', startDate = '2020-01-01', finishDate } = {}) {
  const { data: cached, error: cacheError } = await supabase
    .from('offer_adsterra_stats_cache')
    .select('impressions,clicks,ctr,cpm,revenue,updated_at,offer_id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!cacheError && cached) {
    return {
      impressions: Number(cached.impressions || 0),
      clicks: Number(cached.clicks || 0),
      ctr: Number(cached.ctr || 0),
      cpm: Number(cached.cpm || 0),
      revenue: Number(cached.revenue || 0),
      offerId: cached.offer_id,
      updatedAt: cached.updated_at,
      raw: { source: 'offer_adsterra_stats_cache' },
    }
  }

  const { data: activeOffers, error: offerError } = await supabase.rpc('get_active_offers_for_dashboard')
  if (offerError) throw new Error(`Gagal membaca offer aktif: ${offerError.message}`)
  const activeOffer = Array.isArray(activeOffers) ? activeOffers[0] : activeOffers
  const activePlacement = String(activeOffer?.adsterra_placement_id || '').trim()
  if (!activePlacement) throw new Error('Placement ID offer aktif belum diatur.')

  const params = new URLSearchParams()
  params.set('placement', activePlacement)
  params.set('start_date', startDate)
  params.set('finish_date', finishDate || new Date().toISOString().slice(0, 10))
  params.set('group_by', 'placement')

  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) throw new Error('Sesi login tidak ditemukan.')

  const response = await fetch(`/api/adsterra-stats?${params.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const details = data?.details ? ` ${typeof data.details === 'string' ? data.details : JSON.stringify(data.details)}` : ''
    throw new Error(`${data?.error || 'Gagal mengambil statistik Adsterra.'}${details}`)
  }

  const rows = Array.isArray(data?.data?.items) ? data.data.items : Array.isArray(data?.data) ? data.data : []
  const totals = rows.reduce((acc, row) => {
    acc.impressions += Number(row.impressions || 0)
    acc.clicks += Number(row.clicks || 0)
    acc.revenue += Number(row.revenue || 0)
    return acc
  }, { impressions: 0, clicks: 0, revenue: 0 })

  const ctr = totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0
  const cpm = totals.impressions ? (totals.revenue / totals.impressions) * 1000 : 0

  return { impressions: totals.impressions, clicks: totals.clicks, ctr, cpm, revenue: totals.revenue, offerId: activeOffer?.id, raw: data }
}
