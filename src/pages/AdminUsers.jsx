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
  const [editingUser, setEditingUser] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')

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

  function openEdit(user) {
    setEditingUser(user)
    setEditForm({ username: user.username || '', role: user.role || 'user', level: user.level || 'free', status: user.status || 'active', exclusiveLink: user.exclusive_link || '', dashboardLink: user.personal_dashboard_link || '' })
    setError(''); setNotice('')
  }

  function closeEdit() {
    if (savingEdit) return
    setEditingUser(null)
    setEditForm(null)
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!editingUser || !editForm) return
    const username = editForm.username.trim()
    if (!username) { setError('Username wajib diisi.'); return }
    setSavingEdit(true); setError(''); setNotice('')
    const patch = { username, role: editForm.role, level: editForm.level, status: editForm.status, exclusive_link: editForm.exclusiveLink.trim() || null, personal_dashboard_link: editForm.dashboardLink.trim() || null }
    const { error: updateError } = await supabase.from('profiles').update(patch).eq('id', editingUser.id)
    if (updateError) setError(updateError.message)
    else {
      setUsers(list => list.map(user => user.id === editingUser.id ? { ...user, ...patch } : user))
      setEditingUser(null); setEditForm(null)
      setNotice(`Profil ${username} berhasil diperbarui.`)
    }
    setSavingEdit(false)
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
    return users.filter(user => {
      const normalizedLevel = (user.level || 'free').toLowerCase()
      const matchesStatus = statusFilter === 'all' || (user.status || 'active').toLowerCase() === statusFilter
      const matchesLevel = levelFilter === 'all' || (levelFilter === 'member' ? ['member', 'free', 'basic', 'premium'].includes(normalizedLevel) : normalizedLevel === levelFilter)
      const matchesSearch = !query || [user.username, user.id, user.role, user.level, user.status, user.exclusive_link, user.personal_dashboard_link].some(value => String(value || '').toLowerCase().includes(query))
      return matchesStatus && matchesLevel && matchesSearch
    })
  }, [users, search, statusFilter, levelFilter])

  const activeCount = users.filter(user => (user.status || 'active').toLowerCase() === 'active').length
  const suspendedCount = users.filter(user => (user.status || '').toLowerCase() === 'suspended').length
  const memberCount = users.filter(user => ['member', 'free', 'basic', 'premium'].includes((user.level || 'free').toLowerCase())).length
  const vipCount = users.filter(user => (user.level || '').toLowerCase() === 'vip').length

  if (loading) return <section className="card"><p>Memuat daftar user...</p></section>

  return <section className="admin-users">
    <div className="card" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
      <div><h2>Manajemen User</h2><p className="muted">Kelola level, status, link, dan password user dari Admin.</p></div>
      <button type="button" onClick={() => { setShowCreate(true); setError(''); setNotice('') }} style={{background:'linear-gradient(135deg,#35d399,#20b981)',color:'#04130d',boxShadow:'0 10px 26px rgba(53,211,153,.16)',whiteSpace:'nowrap'}}>＋ Tambah User</button>
    </div>

    <div className="admin-user-stats" style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,marginTop:12}}>
      <div className="card" style={{padding:'14px 15px'}}><span className="muted small">Total User</span><strong style={{display:'block',fontSize:24,marginTop:4}}>{users.length}</strong><span className="muted small">Semua akun</span></div>
      <div className="card" style={{padding:'14px 15px'}}><span className="muted small">Active</span><strong style={{display:'block',fontSize:24,marginTop:4}}>🟢 {activeCount}</strong><span className="muted small">Akun aktif</span></div>
      <div className="card" style={{padding:'14px 15px'}}><span className="muted small">Suspended</span><strong style={{display:'block',fontSize:24,marginTop:4}}>🔴 {suspendedCount}</strong><span className="muted small">Akun ditangguhkan</span></div>
      <div className="card" style={{padding:'14px 15px'}}><span className="muted small">VIP</span><strong style={{display:'block',fontSize:24,marginTop:4}}>👑 {vipCount}</strong><span className="muted small">Member: {memberCount}</span></div>
    </div>

    <div className="card admin-user-search" style={{display:'flex',alignItems:'center',gap:10,marginTop:12,padding:'10px 12px',border:'1px solid var(--border)',borderRadius:14,background:'rgba(17,26,43,.62)',boxShadow:'0 12px 30px rgba(0,0,0,.12)'}}>
      <span aria-hidden="true" style={{fontSize:20,lineHeight:1,color:'var(--primary)'}}>⌕</span>
      <input aria-label="Cari user" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari username, ID, role, level, status, atau link..." style={{border:0,boxShadow:'none',background:'transparent',padding:'7px 0',flex:1,minWidth:0,outline:'none'}} />
      {search && <button type="button" onClick={() => setSearch('')} aria-label="Hapus pencarian" style={{padding:'6px 8px',background:'rgba(255,255,255,.05)',color:'#aeb9ca',border:'1px solid var(--border)',borderRadius:8,fontSize:11}}>✕</button>}
      <span style={{fontSize:11,color:'var(--muted)',whiteSpace:'nowrap'}}>{filteredUsers.length}/{users.length}</span>
    </div>
    <div className="admin-status-filter" role="group" aria-label="Filter status user" style={{display:'flex',alignItems:'center',gap:7,marginTop:10,overflowX:'auto',paddingBottom:2}}>
      <button type="button" className={statusFilter === 'all' ? 'status-filter active' : 'status-filter'} onClick={() => setStatusFilter('all')}>Semua <span>{users.length}</span></button>
      <button type="button" className={statusFilter === 'active' ? 'status-filter active' : 'status-filter'} onClick={() => setStatusFilter('active')}>🟢 Active <span>{activeCount}</span></button>
      <button type="button" className={statusFilter === 'suspended' ? 'status-filter suspended-active' : 'status-filter'} onClick={() => setStatusFilter('suspended')}>🔴 Suspended <span>{suspendedCount}</span></button>
    </div>
    <div className="admin-level-filter" role="group" aria-label="Filter level user" style={{display:'flex',alignItems:'center',gap:7,marginTop:7,overflowX:'auto',paddingBottom:2}}>
      <button type="button" className={levelFilter === 'all' ? 'status-filter active' : 'status-filter'} onClick={() => setLevelFilter('all')}>Semua Level <span>{users.length}</span></button>
      <button type="button" className={levelFilter === 'member' ? 'status-filter active' : 'status-filter'} onClick={() => setLevelFilter('member')}>👤 Member <span>{memberCount}</span></button>
      <button type="button" className={levelFilter === 'vip' ? 'status-filter vip-active' : 'status-filter'} onClick={() => setLevelFilter('vip')}>👑 VIP <span>{vipCount}</span></button>
    </div>
    {error && <div className="error card" style={{padding:14,marginTop:12}}>{error}</div>}
    {notice && <div className="success card" style={{padding:14,marginTop:12}}>{notice}</div>}
    {filteredUsers.length === 0 && <div className="card" style={{padding:20,marginTop:12}}><strong>{search ? 'User tidak ditemukan' : 'Tidak ada user pada filter ini'}</strong><p className="muted small">{search ? `Tidak ada user yang cocok dengan “${search}”.` : 'Coba pilih filter status atau level lainnya.'}</p></div>}
    {filteredUsers.map(user => <article className="card user-row" key={user.id}>
      <div style={{minWidth:0}}><strong>{user.username || 'Tanpa username'}</strong><p className="muted small">{user.id}</p></div>
      <div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap'}}><span className="muted small">{(user.status || 'active') === 'active' ? '🟢 Active' : '🔴 Suspended'}</span><span className="muted small">{(user.level || '').toLowerCase() === 'vip' ? '👑 VIP' : '👤 Member'}</span></div>
      <button type="button" onClick={() => openEdit(user)} disabled={saving === user.id} style={{whiteSpace:'nowrap'}}>✏️ Edit User</button>
      <label>Level<select value={user.level || 'free'} disabled={saving === user.id} onChange={e => updateUser(user.id, { level: e.target.value })}><option value="free">Free</option><option value="basic">Basic</option><option value="premium">Premium</option><option value="vip">VIP</option></select></label>
      <label>Status<select value={user.status || 'active'} disabled={saving === user.id} onChange={e => updateUser(user.id, { status: e.target.value })}><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
      <label>Exclusive Link<input defaultValue={user.exclusive_link || ''} disabled={saving === user.id} onBlur={e => updateUser(user.id, { exclusive_link: e.target.value || null })} placeholder="https://..." /></label>
      <label>Dashboard Link<input defaultValue={user.personal_dashboard_link || ''} disabled={saving === user.id} onBlur={e => updateUser(user.id, { personal_dashboard_link: e.target.value || null })} placeholder="https://..." /></label>
      <label>Password Baru<input type="password" minLength="8" value={passwords[user.id] || ''} disabled={saving === user.id} onChange={e => setPasswords(value => ({ ...value, [user.id]: e.target.value }))} placeholder="Minimal 8 karakter" /></label>
      <button disabled={saving === user.id} onClick={() => resetPassword(user)}>🔑 Reset Password</button>
    </article>)}

    {editingUser && editForm && <div role="dialog" aria-modal="true" aria-label="Edit User" style={{position:'fixed',inset:0,zIndex:100,display:'grid',placeItems:'center',padding:16,background:'rgba(0,0,0,.68)',backdropFilter:'blur(8px)'}} onMouseDown={e => e.target === e.currentTarget && closeEdit()}>
      <form className="card" onSubmit={saveEdit} style={{width:'min(620px,100%)',maxHeight:'92vh',overflowY:'auto',padding:24,border:'1px solid rgba(255,255,255,.1)',boxShadow:'0 30px 90px rgba(0,0,0,.4)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:20}}>
          <div><p className="eyebrow" style={{margin:'0 0 5px'}}>USER SETTINGS</p><h2 style={{margin:0}}>Edit User</h2><p className="muted small" style={{margin:'5px 0 0',wordBreak:'break-all'}}>{editingUser.id}</p></div>
          <button type="button" className="ghost" disabled={savingEdit} onClick={closeEdit} aria-label="Tutup">✕</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:14}}>
          <label style={{display:'grid',gap:7,fontSize:12,fontWeight:750}}>Username<input required minLength="2" maxLength="50" value={editForm.username} disabled={savingEdit} onChange={e => setEditForm(v => ({...v,username:e.target.value}))} /></label>
          <label style={{display:'grid',gap:7,fontSize:12,fontWeight:750}}>Role<select value={editForm.role} disabled={savingEdit} onChange={e => setEditForm(v => ({...v,role:e.target.value}))}><option value="user">User</option><option value="admin">Admin</option></select></label>
          <label style={{display:'grid',gap:7,fontSize:12,fontWeight:750}}>Level<select value={editForm.level} disabled={savingEdit} onChange={e => setEditForm(v => ({...v,level:e.target.value}))}><option value="free">Free</option><option value="basic">Basic</option><option value="premium">Premium</option><option value="vip">VIP</option></select></label>
          <label style={{display:'grid',gap:7,fontSize:12,fontWeight:750}}>Status<select value={editForm.status} disabled={savingEdit} onChange={e => setEditForm(v => ({...v,status:e.target.value}))}><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
          <label style={{display:'grid',gap:7,fontSize:12,fontWeight:750}}>Exclusive Link<input type="url" value={editForm.exclusiveLink} disabled={savingEdit} onChange={e => setEditForm(v => ({...v,exclusiveLink:e.target.value}))} placeholder="https://..." /></label>
          <label style={{display:'grid',gap:7,fontSize:12,fontWeight:750}}>Dashboard Link<input type="url" value={editForm.dashboardLink} disabled={savingEdit} onChange={e => setEditForm(v => ({...v,dashboardLink:e.target.value}))} placeholder="https://..." /></label>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:9,marginTop:20}}><button type="button" className="ghost" disabled={savingEdit} onClick={closeEdit}>Batal</button><button type="submit" disabled={savingEdit} style={{background:'linear-gradient(135deg,#35d399,#20b981)',color:'#04130d',minWidth:155}}>{savingEdit ? 'Menyimpan...' : '✓ Simpan Perubahan'}</button></div>
      </form>
    </div>}

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
