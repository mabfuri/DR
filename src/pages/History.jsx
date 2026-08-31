import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function History({ profile }) {
  const navigate = useNavigate()
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadWithdrawals() {
    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from('withdrawals')
      .select('id,amount,payment_method,payment_account,status,created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
    if (queryError) setError(queryError.message)
    setWithdrawals(data || [])
    setLoading(false)
  }

  useEffect(() => { loadWithdrawals() }, [profile.id])

  return <main className="dashboard"><header className="topbar"><div className="brand">DollarRise</div><div><span className="badge">{profile?.level?.toUpperCase() || 'FREE'}</span><button className="ghost" type="button" onClick={() => navigate('/')}>Dashboard</button></div></header><section className="hero"><div className="user-heading"><p className="eyebrow">WITHDRAWAL</p><h1>History</h1><p className="muted">Riwayat semua penarikan saldo Anda.</p></div></section><section className="card withdraw-history" style={{marginTop:24,padding:24}}><div className="history-head"><div><p className="eyebrow">HISTORY</p><h2>Riwayat Penarikan</h2></div><button type="button" className="ghost" onClick={loadWithdrawals} disabled={loading}>{loading ? 'Memuat...' : 'Refresh'}</button></div>{error&&<p className="error small">{error}</p>}{loading?<div className="history-empty muted">Memuat riwayat...</div>:withdrawals.length===0?<div className="history-empty muted">Belum ada riwayat penarikan.</div>:withdrawals.map(w=><div className="withdraw-row" key={w.id}><div><strong>Rp{Number(w.amount).toLocaleString('id-ID')}</strong><span>{w.payment_method} • {w.payment_account} • {new Date(w.created_at).toLocaleString('id-ID')}</span></div><span className={`withdraw-status status-${String(w.status).toLowerCase()}`}>{String(w.status).toUpperCase()}</span></div>)}</section></main>
}
