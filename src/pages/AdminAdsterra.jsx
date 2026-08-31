import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function normalizeRows(payload) {
  const source = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.items) ? payload.items : []
  return source.map(row => ({
    impressions: Number(row.impressions ?? row.Impressions ?? 0) || 0,
    clicks: Number(row.clicks ?? row.Clicks ?? 0) || 0,
    ctr: Number(row.ctr ?? row.CTR ?? 0) || 0,
    cpm: Number(row.cpm ?? row.CPM ?? 0) || 0,
    revenue: Number(row.revenue ?? row.Revenue ?? 0) || 0
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

export default function AdminAdsterra() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [loadingStats, setLoadingStats] = useState(null)
  const [stats, setStats] = useState({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadUsers() {
    setLoading(true); setError('')
    const { data, error: loadError } = await supabase
      .from('profiles')
      .select('id,username,adsterra_domain_id,adsterra_placement_id,status,level')
      .order('username', { ascending: true })
    if (loadError) setError(loadError.message)
    else setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  async function saveAdsterra(user) {
    setSaving(user.id); setError(''); setNotice('')
    const domain = String(user.adsterra_domain_id || '').trim()
    const placement = String(user.adsterra_placement_id || '').trim()
    if (domain && !/^\d+$/.test(domain)) { setError('Domain ID harus berupa angka.'); setSaving(null); return }
    if (placement && !/^\d+$/.test(placement)) { setError('Placement ID harus berupa angka.'); setSaving(null); return }
    const { error: updateError } = await supabase.from('profiles').update({
      adsterra_domain_id: domain || null,
      adsterra_placement_id: placement || null
    }).eq('id', user.id)
    if (updateError) setError(updateError.message)
    else {
      setUsers(list => list.map(item => item.id === user.id ? { ...item, adsterra_domain_id: domain, adsterra_placement_id: placement } : item))
      setNotice(`Konfigurasi Adsterra ${user.username || 'user'} berhasil disimpan.`)
    }
    setSaving(null)
  }

  async function loadStats(user) {
    const domain = String(user.adsterra_domain_id || '').trim()
    const placement = String(user.adsterra_placement_id || '').trim()
    if (!domain) { setError(`Domain ID Adsterra ${user.username || 'user'} belum diisi.`); return }
    if (!placement) { setError(`Placement ID Adsterra ${user.username || 'user'} belum diisi.`); return }
    setLoadingStats(user.id); setError(''); setNotice('')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) throw new Error('Sesi admin tidak ditemukan.')
      const params = new URLSearchParams({ domain, placement })
      const response = await fetch(`/api/adsterra-stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        const details = body?.details ? ` ${typeof body.details === 'string' ? body.details : JSON.stringify(body.details)}` : ''
        throw new Error(`${body?.error || 'Gagal mengambil statistik Adsterra.'}${details}`)
      }
      setStats(current => ({ ...current, [user.id]: summarize(body.data) }))
      setNotice(`Statistik ${user.username || 'user'} berhasil diperbarui.`)
    } catch (err) {
      setError(err?.message || 'Gagal mengambil statistik Adsterra.')
    } finally {
      setLoadingStats(null)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter(user => !q || String(user.username || '').toLowerCase().includes(q) || String(user.adsterra_domain_id || '').includes(q) || String(user.adsterra_placement_id || '').includes(q))
  }, [users, search])

  if (loading) return <section className="card"><p>Memuat konfigurasi Adsterra...</p></section>

  return <section className="admin-users">
    <div className="card">
      <h2>Adsterra Statistics</h2>
      <p className="muted">Domain ID dan Placement ID digunakan bersama untuk Smartlink. API Key Adsterra dipanggil hanya dari Cloudflare Function dan tidak dikirim ke browser. Periode statistik menggunakan seluruh rentang yang didukung endpoint.</p>
    </div>
    <div className="card" style={{marginTop:12,display:'flex',alignItems:'center',gap:10}}>
      <span aria-hidden="true">⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari username, Domain ID atau Placement ID..." style={{flex:1,minWidth:0}} />
      <span className="muted small">{filtered.length}/{users.length}</span>
    </div>
    {error && <div className="error card" style={{padding:14,marginTop:12}}>{error}</div>}
    {notice && <div className="success card" style={{padding:14,marginTop:12}}>{notice}</div>}
    <div style={{display:'grid',gap:10,marginTop:12}}>
      {filtered.map(user => {
        const metric = stats[user.id]
        return <article className="card" key={user.id} style={{display:'grid',gap:12}}>
          <div style={{display:'grid',gridTemplateColumns:'minmax(150px,1fr) minmax(150px,220px) minmax(150px,220px) auto',gap:12,alignItems:'end'}}>
            <div><strong>{user.username || 'Tanpa username'}</strong><p className="muted small" style={{margin:'4px 0 0'}}>{user.status || 'active'} • {(user.level || 'free').toUpperCase()}</p></div>
            <label>Domain ID<input inputMode="numeric" value={user.adsterra_domain_id || ''} onChange={e => setUsers(list => list.map(item => item.id === user.id ? { ...item, adsterra_domain_id: e.target.value.replace(/[^0-9]/g, '') } : item))} placeholder="Contoh: 3419404" /></label>
            <label>Placement ID<input inputMode="numeric" value={user.adsterra_placement_id || ''} onChange={e => setUsers(list => list.map(item => item.id === user.id ? { ...item, adsterra_placement_id: e.target.value.replace(/[^0-9]/g, '') } : item))} placeholder="Contoh: 30659021" /></label>
            <div style={{display:'flex',gap:8}}><button type="button" disabled={saving === user.id} onClick={() => saveAdsterra(user)}>{saving === user.id ? 'MENYIMPAN...' : 'Simpan'}</button><button type="button" className="ghost" disabled={loadingStats === user.id || !user.adsterra_domain_id || !user.adsterra_placement_id} onClick={() => loadStats(user)}>{loadingStats === user.id ? 'MEMUAT...' : 'Statistik'}</button></div>
          </div>
          {metric && <div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:8}}>
            <div className="card"><span className="muted small">Impressions</span><strong>{metric.impressions.toLocaleString('id-ID')}</strong></div>
            <div className="card"><span className="muted small">Clicks</span><strong>{metric.clicks.toLocaleString('id-ID')}</strong></div>
            <div className="card"><span className="muted small">CTR</span><strong>{metric.ctr.toFixed(2)}%</strong></div>
            <div className="card"><span className="muted small">CPM</span><strong>${metric.cpm.toFixed(3)}</strong></div>
            <div className="card"><span className="muted small">Revenue</span><strong>${metric.revenue.toFixed(2)}</strong></div>
          </div>}
        </article>
      })}
    </div>
  </section>
}
