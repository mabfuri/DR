import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AdminUsers from './AdminUsers'
import AdminBalances from './AdminBalances'

export default function Admin({ profile }) {
  const [users, setUsers] = useState([])
  const [usersError, setUsersError] = useState('')

  useEffect(() => {
    async function loadUsers() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,username,role,level,status,exclusive_link,personal_dashboard_link,created_at')
        .order('created_at', { ascending: false })
      if (error) setUsersError(error.message)
      else setUsers(data || [])
    }
    loadUsers()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  function goToDashboard() {
    window.location.href = '/dashboard'
  }

  return <main className="dashboard">
    <header className="topbar">
      <div className="brand">DollarRise Admin</div>
      <div className="topbar-actions">
        <span className="badge">ADMIN</span>
        <button type="button" onClick={goToDashboard}>Dashboard User</button>
        <button type="button" onClick={logout}>Logout</button>
      </div>
    </header>
    <section className="hero"><p className="eyebrow">ADMIN PANEL</p><h1>Selamat datang, {profile?.username || 'Admin'}</h1><p className="muted">Kelola user dan saldo DollarRise dari panel admin.</p></section>
    <AdminUsers />
    {usersError && <div className="error card">{usersError}</div>}
    <AdminBalances users={users} />
  </main>
}
