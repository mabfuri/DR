import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyForm = { username: '', email: '', password: '', role: 'user', level: 'free', status: 'active', exclusiveLink: '', dashboardLink: '' }

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(null)
  const [passwords, setPasswords] = useState({})
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')

  async function loadUsers() {
    setLoading(true)
    const { data, error: loadError } = await supabase.from('profiles').select('id,username,role,level,status,exclusive_link,personal_dashboard_link,created_at').order('created_at', { ascending: false })
    if (loadError) setError(loadError.message)
    else setUsers(data || [])
    setLoading(false)
  }
  useEffect(() => { loadUsers() }, [])

  async function updateUser(id, patch) {
    setSaving(id); setError(''); setNotice('')
    const { error: updateError } = await supabase.from('profiles').update(patch).eq('id', id)
    if (updateError) setError(updateError.message)
    else { setUsers(list => list.map(user => user.id === id ? { ...user, ...patch } : user)); setNotice('Perubahan user berhasil disimpan.') }
    setSaving(null)
  }

  async function resetPassword(user) {
    const password = passwords[user.id] || ''
    if (password.length < 8) return setError('Password baru minimal 8 karakter.')
    setSaving(user.id); setError(''); setNotice('')
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) { setError('Sesi admin tidak ditemukan.'); setSaving(null); return }
    try {
      const response = await fetch('/api/admin/reset-password', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, password }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Gagal mengganti password user.')
      setPasswords(value => ({ ...value, [user.id]: '' })); setNotice(`Password ${user.username || 'user'} berhasil diubah.`)
    } catch (e) { setError(e.message) }
    setSaving(null)
  }

  async function createUser(e) {
    e.preventDefault(); setCreating(true); setError(''); setNotice('')
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) { setError('Sesi admin tidak ditemukan.'); setCreating(false); return }
    try {
      const response = await fetch('/api/admin/create-user', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Gagal membuat user.')
      setShowCreate(false); setForm(emptyForm); setNotice(`User ${result.user?.username || form.username} berhasil dibuat.`); await loadUsers()
    } catch (e) { setError(e.message) }
    setCreating(false)
  }

  const field = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users
    return users.filter(user => [user.username, user.id, user.role, user.level, user.status, user.exclusive_link, user.personal_dashboard_link].some(value => String(value || '').toLowerCase().includes(query)))
  }, [users, search])

  if (loading) return <section className="card"><p>Memuat daftar user...</p></section>

  return <section className="admin-users">
    <div className="card" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
      <div><h2>Manajemen User</h2><p className="muted">Kelola level, status, link, dan password user dari Admin.</p></div>
      <button type="button" onClick={() => { setShowCreate(true); setError(''); setNotice('') }} style={{background:'linear-gradient(135deg,#35d399,#20b981)',color:'#04130d',boxShadow:'0 10px 26px rgba(53,211,153,.16)',whiteSpace:'nowrap'}}>＋ Tambah User</button>
    </div>
    <div className="card admin-user-search" style={{display:'flex',alignItems:'center',gap:10,marginTop:12,padding:'10px 12px',border:'1px solid var(--border)',borderRadius:14,background:'rgba(17,26,43,.62)',boxShadow:'0 12px 30px rgba(0,0,0,.12)'}}>
      <span aria-hidden="true" style={{fontSize:20,lineHeight:1,color:'var(--primary)'}}>⌕</span>
      <input aria-label="Cari user" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari username, ID, role, level, status, atau link..." style={{border:0,boxShadow:'none',background:'transparent',padding:'7px 0',flex:1,minWidth:0,outline:'none'}} />
      {search && <button type="button" onClick={() => setSearch('')} aria-label="Hapus pencarian" style={{padding:'6px 8px',background:'rgba(255,255,255,.05)',color:'#aeb9ca',border:'1px solid var(--border)',borderRadius:8,fontSize:11}}>✕</button>}
      <span style={{fontSize:11,color:'var(--muted)',whiteSpace:'nowrap'}}>{filteredUsers.length}/{users.length}</span>
    </div>
    {error && <div className="error card" style={{padding:14,marginTop:12}}>{error}</div>}
    {notice && <div className="success card" style={{padding:14,marginTop:12}}>{notice}</div>}
    {filteredUsers.length === 0 && <div className="card" style={{padding:20,marginTop:12}}><strong>{search ? 'User tidak ditemukan' : 'Belum ada user'}</strong><p className="muted small">{search ? `Tidak ada user yang cocok dengan “${search}”.` : 'Belum ada data user untuk ditampilkan.'}</p></div>}
    {filteredUsers.map(user => <article className="card user-row" key={user.id}>
      <div><strong>{user.username || 'Tanpa username'}</strong><p className="muted small">{user.id}</p></div>
      <label>Level<select value={user.level || 'free'} disabled={saving === user.id} onChange={e => updateUser(user.id, { level: e.target.value })}><option value="free">Free</option><option value="basic">Basic</option><option value="premium">Premium</option><option value="vip">VIP</option></select></label>
      <label>Status<select value={user.status || 'active'} disabled={saving === user.id} onChange={e => updateUser(user.id, { status: e.target.value })}><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
      <label>Exclusive Link<input defaultValue={user.exclusive_link || ''} disabled={saving === user.id} onBlur={e => updateUser(user.id, { exclusive_link: e.target.value || null })} placeholder="https://..." /></label>
      <label>Dashboard Link<input defaultValue={user.personal_dashboard_link || ''} disabled={saving === user.id} onBlur={e => updateUser(user.id, { personal_dashboard_link: e.target.value || null })} placeholder="https://..." /></label>
      <label>Password Baru<input type="password" minLength="8" value={passwords[user.id] || ''} disabled={saving === user.id} onChange={e => setPasswords(value => ({ ...value, [user.id]: e.target.value }))} placeholder="Minimal 8 karakter" /></label>
      <button disabled={saving === user.id} onClick={() => resetPassword(user)}>🔑 Reset Password</button>
    </article>)}

    {showCreate && <div role="dialog" aria-modal="true" aria-label="Tambah User" style={{position:'fixed',inset:0,zIndex:100,display:'grid',placeItems:'center',padding:18,background:'rgba(0,0,0,.68)',backdropFilter:'blur(8px)'}} onMouseDown={e => e.target === e.currentTarget && !creating && setShowCreate(false)}>
      <form className="card" onSubmit={createUser} style={{width:'min(620px,100%)',maxHeight:'92vh',overflowY:'auto',padding:24}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:18}}><div><p className="eyebrow" style={{margin:'0 0 5px'}}>ADMIN</p><h2 style={{margin:0}}>Tambah User</h2></div><button type="button" className="ghost" disabled={creating} onClick={() => setShowCreate(false)} aria-label="Tutup">✕</button></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:14}}>
          <label style={{display:'grid',gap:7,fontSize:12,fontWeight:750}}>Username<input required minLength="2" maxLength="50" value={form.username} disabled={creating} onChange={e => field('username',e.target.value)} placeholder="Nama user" /></label>
          <label style={{display:'grid',gap:7,fontSize:12,fontWeight:750}}>Email<input required type="email" value={form.email} disabled={creating} onChange={e => field('email',e.target.value)} placeholder="user@email.com" /></label>
          <label style={{display:'grid',gap:7,fontSize:12,fontWeight:750}}>Password<input required type="password" minLength="8" value={form.password} disabled={creating} onChange={e => field('password',e.target.value)} placeholder="Minimal 8 karakter" /></label>
          <label style={{display:'grid',gap:7,fontSize:12,fontWeight:750}}>Role<select value={form.role} disabled={creating} onChange={e => field('role',e.target.value)}><option value="user">User</option><option value="admin">Admin</option></select></label>
          <label style={{display:'grid',gap:7,fontSize:12,fontWeight:750}}>Level<select value={form.level} disabled={creating} onChange={e => field('level',e.target.value)}><option value="free">Free</option><option value="basic">Basic</option><option value="premium">Premium</option><option value="vip">VIP</option></select></label>
          <label style={{display:'grid',gap:7,fontSize:12,fontWeight:750}}>Status<select value={form.status} disabled={creating} onChange={e => field('status',e.target.value)}><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
          <label style={{display:'grid',gap:7,fontSize:12,fontWeight:750}}>Exclusive Link<input type="url" value={form.exclusiveLink} disabled={creating} onChange={e => field('exclusiveLink',e.target.value)} placeholder="https://..." /></label>
          <label style={{display:'grid',gap:7,fontSize:12,fontWeight:750}}>Dashboard Link<input type="url" value={form.dashboardLink} disabled={creating} onChange={e => field('dashboardLink',e.target.value)} placeholder="https://..." /></label>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:9,marginTop:20}}><button type="button" className="ghost" disabled={creating} onClick={() => setShowCreate(false)}>Batal</button><button type="submit" disabled={creating} style={{background:'linear-gradient(135deg,#35d399,#20b981)',color:'#04130d',minWidth:140}}>{creating ? 'Membuat...' : '✓ Buat User'}</button></div>
      </form>
    </div>}
  </section>
}
