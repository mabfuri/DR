import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function History({ profile }) {
  const navigate = useNavigate()
  const [withdrawals, setWithdrawals] = useState([])
  const [rewards, setRewards] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadHistory() {
    setLoading(true)
    setError('')
    const [withdrawalResult, rewardResult] = await Promise.all([
      supabase.from('withdrawals').select('id,amount,payment_method,payment_account,status,created_at').eq('user_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('balance_transactions').select('id,amount,type,description,created_at').eq('user_id', profile.id).eq('type', 'credit').order('created_at', { ascending: false })
    ])
    if (withdrawalResult.error || rewardResult.error) setError(withdrawalResult.error?.message || rewardResult.error?.message || 'Gagal memuat history.')
    setWithdrawals(withdrawalResult.data || [])
    setRewards(rewardResult.data || [])
    setLoading(false)
  }

  useEffect(() => { loadHistory() }, [profile.id])

  const history = useMemo(() => {
    const rows = []
    if (filter !== 'withdrawal') rewards.forEach(r => rows.push({ id: `reward-${r.id}`, kind: 'reward', date: r.created_at, amount: Number(r.amount || 0), title: 'Reward Klik', detail: r.description || 'Reward dari klik offer', status: 'BERHASIL' }))
    if (filter !== 'reward') withdrawals.forEach(w => rows.push({ id: `withdrawal-${w.id}`, kind: 'withdrawal', date: w.created_at, amount: -Number(w.amount || 0), title: 'Penarikan Saldo', detail: `${w.payment_method} • ${w.payment_account}`, status: String(w.status || '').toUpperCase() }))
    return rows.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [rewards, withdrawals, filter])

  return <main className="dashboard"><header className="topbar"><div className="brand">DollarRise</div><div><span className="badge">{profile?.level?.toUpperCase() || 'FREE'}</span><button className="ghost" type="button" onClick={() => navigate('/')}>Dashboard</button></div></header><section className="hero"><div className="user-heading"><p className="eyebrow">ACCOUNT ACTIVITY</p><h1>History</h1><p className="muted">Riwayat reward klik dan penarikan saldo Anda.</p></div></section><section className="card withdraw-history" style={{marginTop:24,padding:24}}><div className="history-head"><div><p className="eyebrow">HISTORY</p><h2>Aktivitas Saldo</h2></div><button type="button" className="ghost" onClick={loadHistory} disabled={loading}>{loading ? 'Memuat...' : 'Refresh'}</button></div><div className="history-filters" style={{display:'flex',gap:8,flexWrap:'wrap',margin:'16px 0'}}><button type="button" className="ghost" onClick={() => setFilter('all')} aria-pressed={filter==='all'}>SEMUA</button><button type="button" className="ghost" onClick={() => setFilter('reward')} aria-pressed={filter==='reward'}>REWARD</button><button type="button" className="ghost" onClick={() => setFilter('withdrawal')} aria-pressed={filter==='withdrawal'}>PENARIKAN</button></div>{error&&<p className="error small">{error}</p>}{loading?<div className="history-empty muted">Memuat history...</div>:history.length===0?<div className="history-empty muted">Belum ada aktivitas saldo.</div>:history.map(item=><div className="withdraw-row" key={item.id}><div><strong>{item.amount >= 0 ? '+' : '-'}Rp{Math.abs(item.amount).toLocaleString('id-ID')}</strong><span>{item.title} • {item.detail} • {new Date(item.date).toLocaleString('id-ID')}</span></div><span className={`withdraw-status ${item.kind==='reward' ? 'status-approved' : `status-${String(item.status).toLowerCase()}`}`}>{item.status}</span></div>)}</section></main>
}
