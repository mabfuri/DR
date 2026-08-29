import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(null)
  const [passwords, setPasswords] = useState({})

  async function loadUsers() {
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('profiles')
      .select('id,username,role,level,status,exclusive_link,personal_dashboard_link,created_at')
      .order('created_at', { ascending: false })
    if (loadError) setError(loadError.message)
    else setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  async function updateUser(id, patch) {
    setSaving(id); setError(''); setNotice('')
    const { error: updateError } = await supabase.from('profiles').update(patch).eq('id', id)
    if (updateError) setError(updateError.message)
    else {
      setUsers(list => list.map(user => user.id === id ? { ...user, ...patch } : user))
      setNotice('Perubahan user berhasil disimpan.')
    }
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
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, password })
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Gagal mengganti password user.')
      setPasswords(value => ({ ...value, [user.id]: '' }))
      setNotice(`Password ${user.username || 'user'} berhasil diubah.`)
    } catch (e) { setError(e.message) }
    setSaving(null)
  }

  if (loading) return <section className="card"><p>Memuat daftar user...</p></section>

  return <section className="admin-users">
    <div className="card">
      <h2>Manajemen User</h2>
      <p className="muted">Kelola level, status, link, dan password user dari Admin.</p>
    </div>
    {error && <div className="error card">{error}</div>}
    {notice && <div className="success card">{notice}</div>}
    {users.map(user => <article className="card user-row" key={user.id}>
      <div><strong>{user.username || 'Tanpa username'}</strong><p className="muted small">{user.id}</p></div>
      <label>Level<select value={user.level || 'free'} disabled={saving === user.id} onChange={e => updateUser(user.id, { level: e.target.value })}><option value="free">Free</option><option value="basic">Basic</option><option value="premium">Premium</option><option value="vip">VIP</option></select></label>
      <label>Status<select value={user.status || 'active'} disabled={saving === user.id} onChange={e => updateUser(user.id, { status: e.target.value })}><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
      <label>Exclusive Link<input defaultValue={user.exclusive_link || ''} disabled={saving === user.id} onBlur={e => updateUser(user.id, { exclusive_link: e.target.value || null })} placeholder="https://..." /></label>
      <label>Dashboard Link<input defaultValue={user.personal_dashboard_link || ''} disabled={saving === user.id} onBlur={e => updateUser(user.id, { personal_dashboard_link: e.target.value || null })} placeholder="https://..." /></label>
      <label>Password Baru<input type="password" minLength="8" value={passwords[user.id] || ''} disabled={saving === user.id} onChange={e => setPasswords(value => ({ ...value, [user.id]: e.target.value }))} placeholder="Minimal 8 karakter" /></label>
      <button disabled={saving === user.id} onClick={() => resetPassword(user)}>🔑 Reset Password</button>
    </article>)}
  </section>
}
