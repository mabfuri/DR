import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

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

function normalizeRows(payload) {
  return collectRows(payload).map(row => ({
    impressions: metricNumber(metricValue(row, 'impressions', 'Impressions', 'impression', 'Impression', 'impression_count', 'impressions_count')),
    clicks: metricNumber(metricValue(row, 'clicks', 'Clicks', 'click', 'Click', 'click_count', 'clicks_count')),
    ctr: metricNumber(metricValue(row, 'ctr', 'CTR', 'click_through_rate')),
    cpm: metricNumber(metricValue(row, 'cpm', 'CPM', 'cost_per_mille')),
    revenue: metricNumber(metricValue(row, 'revenue', 'Revenue', 'earnings', 'Earnings'))
  }))
}

function summarize(payload) {
  const rows = normalizeRows(payload)
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0)
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0)
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0)
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
  const cpm = impressions > 0 ? (revenue / impressions) * 1000 : 0
  return { impressions, clicks, ctr, cpm, revenue }
}

const emptyMetric = { impressions: 0, clicks: 0, ctr: 0, cpm: 0, revenue: 0 }

export default function AdminAdsterra() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [refreshProgress, setRefreshProgress] = useState({ done: 0, total: 0 })
  const [stats, setStats] = useState({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadUsers() {
    setLoading(true); setError('')
    const { data, error: loadError } = await supabase
      .from('profiles')
      .select('id,username,adsterra_placement_id,status,level')
      .order('username', { ascending: true })
    if (loadError) setError(loadError.message)
    else setUsers(data || [])
    setLoading(false)
  }

  async function loadCachedStats() {
    const { data, error: statsError } = await supabase
      .from('adsterra_stats_cache')
      .select('user_id,impressions,clicks,ctr,cpm,revenue,updated_at')
    if (statsError) return
    const mapped = {}
    ;(data || []).forEach(row => { mapped[row.user_id] = { ...row, impressions: metricNumber(row.impressions), clicks: metricNumber(row.clicks), ctr: metricNumber(row.ctr), cpm: metricNumber(row.cpm), revenue: metricNumber(row.revenue) } })
    setStats(mapped)
  }

  useEffect(() => { loadUsers(); loadCachedStats() }, [])

  async function getFreshStats(user, token) {
    const placement = String(user.adsterra_placement_id || '').trim()
    if (!placement) throw new Error(`Placement ID Adsterra ${user.username || 'user'} belum diisi.`)
    const params = new URLSearchParams({ placement })
    const response = await fetch(`/api/adsterra-stats?${params.toString()}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      const details = body?.details ? ` ${typeof body.details === 'string' ? body.details : JSON.stringify(body.details)}` : ''
      throw new Error(`${body?.error || 'Gagal mengambil statistik Adsterra.'}${details}`)
    }
    return summarize(body.data ?? body)
  }

  async function refreshAllStats() {
    if (refreshingAll) return
    setRefreshingAll(true)
    setRefreshProgress({ done: 0, total: users.length })
    setError('')
    setNotice('')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) throw new Error('Sesi admin tidak ditemukan.')
      const usersWithPlacement = users.filter(user => String(user.adsterra_placement_id || '').trim())
      const skipped = users.length - usersWithPlacement.length
      setRefreshProgress({ done: 0, total: usersWithPlacement.length })
      const freshStats = {}
      let successCount = 0
      const failedUsers = []
      for (const user of usersWithPlacement) {
        try {
          const metric = await getFreshStats(user, token)
          const updatedAt = new Date().toISOString()
          const { error: saveError } = await supabase.from('adsterra_stats_cache').upsert({ user_id: user.id, ...metric, updated_at: updatedAt }, { onConflict: 'user_id' })
          if (saveError) throw new Error(saveError.message)
          freshStats[user.id] = { ...metric, updated_at: updatedAt }
          successCount += 1
        } catch (err) {
          failedUsers.push(`${user.username || 'user'}: ${err?.message || 'gagal'}`)
        } finally {
          setRefreshProgress(current => ({ ...current, done: current.done + 1 }))
        }
      }
      setStats(current => ({ ...current, ...freshStats }))
      const parts = [`${successCount} member berhasil diperbarui`]
      if (skipped > 0) parts.push(`${skipped} member dilewati karena Placement ID belum diisi`)
      if (failedUsers.length > 0) parts.push(`${failedUsers.length} member gagal diperbarui`)
      setNotice(`Statistik Adsterra fresh selesai. ${parts.join(' • ')}.`)
      if (failedUsers.length > 0) setError(`Gagal: ${failedUsers.join(' | ')}`)
    } catch (err) {
      setError(err?.message || 'Gagal memperbarui statistik Adsterra.')
    } finally {
      setRefreshingAll(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter(user => !q || String(user.username || '').toLowerCase().includes(q) || String(user.adsterra_placement_id || '').includes(q))
  }, [users, search])

  if (loading) return <section className="card"><p>Memuat konfigurasi Adsterra...</p></section>

  return <section className="admin-users">
    <div className="card">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
        <div>
          <h2 style={{marginBottom:4}}>Adsterra Statistics</h2>
          <p className="muted" style={{margin:0}}>Placement ID digunakan untuk Smartlink. API Key Adsterra dipanggil hanya dari Cloudflare Function dan tidak dikirim ke browser.</p>
        </div>
        <button type="button" className="ghost" onClick={refreshAllStats} disabled={refreshingAll || users.length === 0}>
          {refreshingAll ? `MEMUAT ${refreshProgress.done}/${refreshProgress.total}...` : '↻ Fresh Statistik Semua Member'}
        </button>
      </div>
    </div>
    <div className="card" style={{marginTop:12,display:'flex',alignItems:'center',gap:10}}><span aria-hidden="true">⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari username atau Placement ID..." style={{flex:1,minWidth:0}} /><span className="muted small">{filtered.length}/{users.length}</span></div>
    {error && <div className="error card" style={{padding:14,marginTop:12}}>{error}</div>}
    {notice && <div className="success card" style={{padding:14,marginTop:12}}>{notice}</div>}
    <div style={{display:'grid',gap:10,marginTop:12}}>
      {filtered.map(user => {
        const metric = stats[user.id] || emptyMetric
        return <article className="card" key={user.id} style={{display:'grid',gap:12}}>
          <div>
            <strong>{user.username || 'Tanpa username'}</strong>
            <p className="muted small" style={{margin:'4px 0 0'}}>{user.status || 'active'} • {(user.level || 'free').toUpperCase()} • Placement ID: {user.adsterra_placement_id || 'Belum diatur'}</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:8}}>
            <div className="card"><span className="muted small">Impressions</span><strong>{metric.impressions.toLocaleString('id-ID')}</strong></div>
            <div className="card"><span className="muted small">Clicks</span><strong>{metric.clicks.toLocaleString('id-ID')}</strong></div>
            <div className="card"><span className="muted small">CTR</span><strong>{metric.ctr.toFixed(2)}%</strong></div>
            <div className="card"><span className="muted small">CPM</span><strong>${metric.cpm.toFixed(3)}</strong></div>
            <div className="card"><span className="muted small">Revenue</span><strong>${metric.revenue.toFixed(2)}</strong></div>
          </div>
          {stats[user.id]?.updated_at && <span className="muted small">Diperbarui: {new Date(stats[user.id].updated_at).toLocaleString('id-ID')}</span>}
        </article>
      })}
    </div>
  </section>
}
