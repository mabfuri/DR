import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { getProfile, signOut } from './lib/auth'
import Login from './pages/Login'
import Register from './pages/Register'
import Admin from './pages/Admin'
import ProtectedRoute from './components/ProtectedRoute'
import './hero-tweaks.css'

function ConfigNotice() {
  return <main className="auth-page"><section className="card auth-card"><div className="brand">DollarRise</div><h1>Konfigurasi belum lengkap</h1><p className="muted">Aplikasi berhasil dimuat, tetapi Supabase belum terhubung.</p><div className="notice"><strong>Yang diperlukan:</strong><br />VITE_SUPABASE_URL<br />VITE_SUPABASE_ANON_KEY</div><p className="muted small">Tambahkan kedua Environment Variable tersebut di Cloudflare Pages, lalu lakukan redeploy.</p></section></main>
}

function Dashboard({ profile }) {
  const navigate = useNavigate()
  const [offers, setOffers] = useState([])
  const [index, setIndex] = useState(0)
  const [offerError, setOfferError] = useState('')
  const [balance, setBalance] = useState(0)
  const [accumulated, setAccumulated] = useState(0)
  const [rewardNotice, setRewardNotice] = useState('')
  const [rewarding, setRewarding] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      const [{ data: offersData, error: offersErr }, { data: balanceData, error: balanceErr }, { data: txData, error: txErr }] = await Promise.all([
        supabase.from('offers').select('id,title,link,user_id,sort_order,profiles(username)').eq('status','active').order('sort_order',{ascending:true}).order('created_at',{ascending:false}),
        supabase.from('balances').select('balance').eq('user_id',profile.id).maybeSingle(),
        supabase.from('balance_transactions').select('amount,type,description').eq('user_id',profile.id).eq('type','credit')
      ])
      if (!mounted) return
      if (offersErr) setOfferError(offersErr.message); else { setOffers(offersData || []); setIndex(0) }
      if (!balanceErr) setBalance(Number(balanceData?.balance || 0))
      if (!txErr) setAccumulated((txData || []).reduce((sum,r) => sum + Number(r.amount || 0), 0))
    }
    load()
    return () => { mounted = false }
  }, [profile.id])

  const offer = offers[index]
  const move = step => setIndex(i => offers.length ? (i + step + offers.length) % offers.length : 0)

  async function unlockOffer() {
    if (!offer || rewarding) return
    setRewarding(true); setRewardNotice('')
    const { data, error } = await supabase.rpc('claim_offer_reward', { p_offer_id: offer.id })
    if (error) setRewardNotice(error.message)
    else {
      const result = Array.isArray(data) ? data[0] : data
      if (result?.rewarded) {
        setBalance(Number(result.new_balance || 0))
        setAccumulated(v => v + Number(result.reward_amount || 0))
        setRewardNotice(`Reward ${Number(result.reward_amount || 0).toLocaleString('id-ID')} berhasil ditambahkan ke saldo.`)
      } else if (Number(result?.daily_limit || 0) === 0) setRewardNotice('Level Anda tidak mendapatkan reward klik.')
      else setRewardNotice(`Batas reward hari ini telah tercapai: Rp${Number(result?.daily_limit || 0).toLocaleString('id-ID')}.`)
    }
    setRewarding(false)
    window.open(offer.link, '_blank', 'noopener,noreferrer')
  }

  async function logout() { await signOut(); navigate('/login',{replace:true}) }

  const stats = [['Impressions','0'],['Clicks','0'],['CTR','0'],['CPM','0'],['Revenue','Rp0']]
  return <main className="dashboard"><header className="topbar"><div className="brand">DollarRise</div><div><span className="badge">{profile?.level?.toUpperCase() || 'FREE'}</span>{profile?.role === 'admin' && <button className="ghost" onClick={() => navigate('/admin')}>Akses Admin</button>}<button className="ghost" onClick={logout}>Logout</button></div></header>
    <section className="hero"><div className="user-balance-row"><div className="user-heading" style={{display:'block',minWidth:'max-content'}}><p className="eyebrow" style={{margin:'0 0 4px'}}>WELCOME BACK</p><h1>{profile?.username || 'User'}</h1></div><div className="balance-card" aria-label="Informasi saldo"><div className="balance-item"><span>Saldo Tersedia</span><strong>Rp{balance.toLocaleString('id-ID')}</strong></div><div className="balance-divider" aria-hidden="true"/><div className="balance-item"><span>Akumulasi Saldo</span><strong>Rp{accumulated.toLocaleString('id-ID')}</strong></div><button className="withdraw-button" type="button">TARIK SALDO</button></div></div></section>
    <section className="offer card"><p className="muted offer-label">OFFER BY</p><h2>{offer ? (offer.profiles?.username || 'User') : 'Belum ada offer aktif'}</h2>{offer && <p className="muted small" style={{marginTop:-8}}>{offer.title}</p>}{offerError && <p className="error small">{offerError}</p>}{rewardNotice && <p className="muted small">{rewardNotice}</p>}<div className="offer-nav"><button className="offer-prev" disabled={offers.length < 2} onClick={() => move(-1)}>← PREVIOUS OFFER</button>{offer ? <button className="unlock" disabled={rewarding} onClick={unlockOffer}>🔒 {rewarding ? 'MEMPROSES...' : 'UNLOCK EXCLUSIVE ACCESS'}</button> : <span className="unlock" aria-disabled="true">🔒 BELUM TERSEDIA</span>}<button className="offer-next" disabled={offers.length < 2} onClick={() => move(1)}>NEXT OFFER →</button></div><div className="performance">{stats.map(([label,value]) => <div className="stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section></main>
}

function AppRoutes({ session, profile }) { return <Routes><Route path="/login" element={session ? <Navigate to={profile?.role === 'admin' ? '/admin' : '/'} replace /> : <Login />} /><Route path="/register" element={session ? <Navigate to="/" replace /> : <Register />} /><Route path="/admin" element={<ProtectedRoute session={session} profile={profile} allowedRoles={['admin']}><Admin profile={profile}/></ProtectedRoute>} /><Route path="/" element={<ProtectedRoute session={session} profile={profile} allowedRoles={['user','admin']}><Dashboard profile={profile}/></ProtectedRoute>} /><Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} /></Routes> }

function AuthenticatedApp() { const [session,setSession]=useState(null); const [profile,setProfile]=useState(null); const [loading,setLoading]=useState(true); useEffect(()=>{let mounted=true; async function load(){const {data}=await supabase.auth.getSession(); if(!mounted)return; setSession(data.session); if(data.session){try{setProfile(await getProfile(data.session.user.id))}catch(error){console.error('Profile load failed:',error)}} setLoading(false)} load(); const {data:listener}=supabase.auth.onAuthStateChange(async(_event,nextSession)=>{setSession(nextSession);if(nextSession){try{setProfile(await getProfile(nextSession.user.id))}catch(error){console.error('Profile load failed:',error);setProfile(null)}}else setProfile(null)}); return()=>{mounted=false;listener.subscription.unsubscribe()}},[]); if(loading)return <main className="auth-page"><section className="card auth-card"><div className="brand">DollarRise</div><p>Memuat...</p></section></main>; return <BrowserRouter><AppRoutes session={session} profile={profile}/></BrowserRouter> }
export default function App(){return supabase?<AuthenticatedApp/>:<ConfigNotice/>}
