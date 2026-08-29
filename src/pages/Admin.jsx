export default function Admin({ profile }) {
  return <main className="dashboard"><header className="topbar"><div className="brand">DollarRise Admin</div></header><section className="hero"><p className="eyebrow">ADMIN PANEL</p><h1>Selamat datang, {profile?.username}</h1><p className="muted">Halaman ini hanya dapat diakses oleh role admin.</p></section></main>
}
