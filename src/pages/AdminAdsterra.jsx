import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminAdsterra() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadUsers() {
    setLoading(true); setError('')
    const { data, error: loadError } = await supabase.from('profiles').select('id,username,adsterra_placement_id,status,level').order('username', { ascending: true })
    if (loadError) setError(loadError.message)
    else setUsers(data || [])
    setLoading(false)
  }
  useEffect(() => { loadUsers() }, [])

  async function savePlacement(user) {
    setSaving(user.id); setError(''); setNotice('')
    const placement = String(user.adsterra_placement_id || '').trim()
    if (placement && !/^\d+$/.test(placement)) { setError('Placement ID harus berupa angka.'); setSaving(null); return }
    const { error: updateError } = await supabase.from('profiles').update({ adsterra_placement_id: placement || null }).eq('id', user.id)
    if (updateError) setError(updateError.message)
    else { setUsers(list => list.map(item => item.id === user.id ? { ...item, adsterra_placement_id: placement } : item)); setNotice(`Placement ID ${user.username || 'user'} berhasil disimpan.`) }
    setSaving(null)
  }

  const filtered = useMemo(() => { const q = search.trim().toLowerCase(); return users.filter(user => !q || String(user.username || '').toLowerCase().includes(q) || String(user.adsterra_placement_id || '').includes(q)) }, [users, search])

  if (loading) return <section className="card"><p>Memuat konfigurasi Adsterra...</p></section>

  return <section className="admin-users">
    <div className="card">
      <h2>Adsterra Placement</h2>
      <p className="muted">Masukkan Placement ID Adsterra untuk setiap user. API Key tetap tersimpan di sisi server dan tidak ditampilkan di browser.</p>
    </div>
    <div className="card" style={{marginTop:12,display:'flex',alignItems:'center',gap:10}}>
      <span aria-hidden="true">⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari username atau Placement ID..." style={{flex:1,minWidth:0}} />
      <span className="muted small">{filtered.length}/{users.length}</span>
    </div>
    {error && <div className="error card" style={{padding:14,marginTop:12}}>{error}</div>}
    {notice && <div className="success card" style={{padding:14,marginTop:12}}>{notice}</div>}
    <div style={{display:'grid',gap:10,marginTop:12}}>
      {filtered.map(user => <article className="card" key={user.id} style={{display:'grid',gridTemplateColumns:'minmax(150px,1fr) minmax(180px,280px) auto',gap:12,alignItems:'end'}}>
        <div><strong>{user.username || 'Tanpa username'}</strong><p className="muted small" style={{margin:'4px 0 0'}}>{user.status || 'active'} • {(user.level || 'free').toUpperCase()}</p></div>
        <label>Placement ID<input inputMode="numeric" value={user.adsterra_placement_id || ''} onChange={e => setUsers(list => list.map(item => item.id === user.id ? { ...item, adsterra_placement_id: e.target.value.replace(/[^0-9]/g, '') } : item))} placeholder="Contoh: 30659021" /></label>
        <button type="button" disabled={saving === user.id} onClick={() => savePlacement(user)}>{saving === user.id ? 'MENYIMPAN...' : 'Simpan'}</button>
      </article>)}
    </div>
  </section>
}
