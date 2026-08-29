import AdminUsers from './AdminUsers'

export default function Admin({ profile }) {
  return <main className="dashboard">
    <header className="topbar"><div className="brand">DollarRise Admin</div><span className="badge">ADMIN</span></header>
    <section className="hero"><p className="eyebrow">ADMIN PANEL</p><h1>Selamat datang, {profile?.username || 'Admin'}</h1><p className="muted">Kelola user DollarRise dari panel admin.</p></section>
    <AdminUsers />
  </main>
}
