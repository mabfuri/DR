import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { getProfile, signOut } from './lib/auth'
import Login from './pages/Login'
import Register from './pages/Register'
import Admin from './pages/Admin'
import ProtectedRoute from './components/ProtectedRoute'

const offers = [
  { name: 'Demo User 1', link: '#' },
  { name: 'Demo User 2', link: '#' },
  { name: 'Demo User 3', link: '#' },
]

function ConfigNotice() {
  return <main className="auth-page"><section className="card auth-card">
    <div className="brand">DollarRise</div>
    <h1>Konfigurasi belum lengkap</h1>
    <p className="muted">Aplikasi berhasil dimuat, tetapi Supabase belum terhubung.</p>
    <div className="notice"><strong>Yang diperlukan:</strong><br />VITE_SUPABASE_URL<br />VITE_SUPABASE_ANON_KEY</div>
    <p className="muted small">Tambahkan kedua Environment Variable tersebut di Cloudflare Pages, lalu lakukan redeploy.</p>
  </section></main>
}

function Dashboard({ profile }) {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const offer = offers[index]
  const move = (step) => setIndex(i => (i + step + offers.length) % offers.length)

  async function logout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return <main className="dashboard">
    <header className="topbar">
      <div className="brand">DollarRise</div>
      <div>
        <span className="badge">{profile?.level?.toUpperCase() || 'FREE'}</span>
        {profile?.role === 'admin' && <button className="ghost" onClick={() => navigate('/admin')}>Akses Admin</button>}
        <button className="ghost" onClick={logout}>Logout</button>
      </div>
    </header>
    <section className="hero"><p className="eyebrow">WELCOME BACK</p><h1>{profile?.username || 'User'} Dashboard</h1></section>
    <section className="stats">{['Impressions','Clicks','CTR','CPM','Revenue'].map(label => <div className="stat card" key={label}><span>{label}</span><strong>{label === 'Revenue' ? 'Rp0' : '0'}</strong></div>)}</section>
    <section className="offer card"><p className="muted">OFFER BY</p><h2>{offer.name}</h2><a className="unlock" href={offer.link}>🔒 UNLOCK EXCLUSIVE ACCESS</a><div className="offer-nav"><button onClick={() => move(-1)}>← PREVIOUS OFFER</button><button onClick={() => move(1)}>NEXT OFFER →</button></div></section>
  </main>
}

function AppRoutes({ session, profile }) {
  return <Routes>
    <Route path="/login" element={session ? <Navigate to={profile?.role === 'admin' ? '/admin' : '/'} replace /> : <Login />} />
    <Route path="/register" element={session ? <Navigate to="/" replace /> : <Register />} />
    <Route path="/admin" element={<ProtectedRoute session={session} profile={profile} allowedRoles={['admin']}><Admin profile={profile} /></ProtectedRoute>} />
    <Route path="/" element={<ProtectedRoute session={session} profile={profile} allowedRoles={['user','admin']}><Dashboard profile={profile} /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
  </Routes>
}

function AuthenticatedApp() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session)
      if (data.session) {
        try { setProfile(await getProfile(data.session.user.id)) } catch (error) { console.error('Profile load failed:', error) }
      }
      setLoading(false)
    }
    load()
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        try { setProfile(await getProfile(nextSession.user.id)) } catch (error) { console.error('Profile load failed:', error); setProfile(null) }
      } else setProfile(null)
    })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])

  if (loading) return <main className="auth-page"><section className="card auth-card"><div className="brand">DollarRise</div><p>Memuat...</p></section></main>
  return <BrowserRouter><AppRoutes session={session} profile={profile} /></BrowserRouter>
}

export default function App() {
  return supabase ? <AuthenticatedApp /> : <ConfigNotice />
}
