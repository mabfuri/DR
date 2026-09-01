import { supabase } from './supabase'

function metricNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const text = String(value ?? '').trim()
  if (!text) return 0
  const normalized = text.replace(/[$€£%]/g, '').replace(/\s/g, '').replace(/,/g, '')
  const number = Number(normalized)
  return Number.isFinite(number) ? number : 0
}

function metricValue(row, ...keys) {
  for (const key of keys) {
    if (row && row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key]
  }
  return 0
}

function isMetricRow(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const keys = Object.keys(value).map(key => key.toLowerCase())
  return keys.some(key => ['impressions', 'impression', 'clicks', 'click', 'revenue', 'earnings', 'ctr', 'cpm'].includes(key))
}

function collectRows(payload, rows = [], depth = 0) {
  if (depth > 6 || payload == null) return rows
  if (Array.isArray(payload)) {
    payload.forEach(item => collectRows(item, rows, depth + 1))
    return rows
  }
  if (typeof payload !== 'object') return rows
  if (isMetricRow(payload)) {
    rows.push(payload)
    return rows
  }
  Object.values(payload).forEach(value => collectRows(value, rows, depth + 1))
  return rows
}

export async function getAdsterraStats({ offerId, placement, domain = '', startDate = '2020-01-01', finishDate, refresh = false } = {}) {
  const normalizedOfferId = String(offerId || '').trim()
  const normalizedPlacement = String(placement || '').trim()
  if (!normalizedOfferId) throw new Error('Offer aktif tidak ditemukan.')
  if (!normalizedPlacement) throw new Error('Placement ID offer aktif belum diatur.')

  if (!refresh) {
    const { data: cached, error: cacheError } = await supabase
      .from('offer_adsterra_stats_cache')
      .select('impressions,clicks,ctr,cpm,revenue,updated_at,offer_id')
      .eq('offer_id', normalizedOfferId)
      .maybeSingle()

    if (!cacheError && cached) {
      return {
        impressions: metricNumber(cached.impressions),
        clicks: metricNumber(cached.clicks),
        ctr: metricNumber(cached.ctr),
        cpm: metricNumber(cached.cpm),
        revenue: metricNumber(cached.revenue),
        offerId: cached.offer_id,
        updatedAt: cached.updated_at,
        raw: { source: 'offer_adsterra_stats_cache' },
      }
    }
  }

  const params = new URLSearchParams()
  params.set('placement', normalizedPlacement)
  if (domain) params.set('domain', domain)
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

  const rows = collectRows(data?.data ?? data)
  const totals = rows.reduce((acc, row) => {
    acc.impressions += metricNumber(metricValue(row, 'impressions', 'Impressions', 'impression', 'Impression', 'impression_count', 'impressions_count'))
    acc.clicks += metricNumber(metricValue(row, 'clicks', 'Clicks', 'click', 'Click', 'click_count', 'clicks_count'))
    acc.revenue += metricNumber(metricValue(row, 'revenue', 'Revenue', 'earnings', 'Earnings'))
    return acc
  }, { impressions: 0, clicks: 0, revenue: 0 })

  const ctr = totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0
  const cpm = totals.impressions ? (totals.revenue / totals.impressions) * 1000 : 0

  return { impressions: totals.impressions, clicks: totals.clicks, ctr, cpm, revenue: totals.revenue, offerId: normalizedOfferId, raw: data }
}
