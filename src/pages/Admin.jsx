import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AdminUsers from './AdminUsers'
import AdminBalances from './AdminBalances'
import AdminOffers from './AdminOffers'
import AdminRewards from './AdminRewards'
import AdminWithdrawals from './AdminWithdrawals'
import AdminAdsterra from './AdminAdsterra'

export default function Admin({ profile }) {
  const [users, setUsers] = useState([])
  const [usersError, setUsersError] = useState('')
  const [activeTab, setActiveTab] = useState('users')

  useEffect(() => {
    async function loadUsers() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,username,role,level,status,personal_dashboard_link,created_at')
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
        <button type="button" className="ghost" onClick={goToDashboard}>Dashboard User</button>
        <button type="button" className="ghost" onClick={logout}>Logout</button>
      </div>
    </header>
    <section className="hero"><p className="eyebrow">ADMIN PANEL</p><h1>Selamat datang, {profile?.username || 'Admin'}</h1><p className="muted">Kelola user, saldo, withdrawal, offer, reward, dan Adsterra DollarRise dari satu panel.</p></section>
    <section className="admin-tabs" aria-label="Admin navigation">
      <button type="button" className={activeTab === 'users' ? 'admin-tab active' : 'admin-tab'} onClick={() => setActiveTab('users')}>👥 Manajemen User</button>
      <button type="button" className={activeTab === 'balances' ? 'admin-tab active' : 'admin-tab'} onClick={() => setActiveTab('balances')}>💰 Manajemen Saldo</button>
      <button type="button" className={activeTab === 'withdrawals' ? 'admin-tab active' : 'admin-tab'} onClick={() => setActiveTab('withdrawals')}>💸 Manajemen Withdrawal</button>
      <button type="button" className={activeTab === 'offers' ? 'admin-tab active' : 'admin-tab'} onClick={() => setActiveTab('offers')}>🎯 Manajemen Offer</button>
      <button type="button" className={activeTab === 'rewards' ? 'admin-tab active' : 'admin-tab'} onClick={() => setActiveTab('rewards')}>⚙️ Pengaturan Reward</button>
      <button type="button" className={activeTab === 'adsterra' ? 'admin-tab active' : 'admin-tab'} onClick={() => setActiveTab('adsterra')}>📊 Adsterra</button>
    </section>
    {usersError && <div className="error card admin-message">{usersError}</div>}
    {activeTab === 'users' ? <AdminUsers /> : activeTab === 'balances' ? <AdminBalances users={users} /> : activeTab === 'withdrawals' ? <AdminWithdrawals /> : activeTab === 'offers' ? <AdminOffers users={users} /> : activeTab === 'adsterra' ? <AdminAdsterra /> : <AdminRewards />}
  </main>
}
