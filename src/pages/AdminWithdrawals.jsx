import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([])
  const [status, setStatus] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    let query = supabase.from('withdrawals').select('id,user_id,amount,payment_method,payment_account,beneficiary_name,status,created_at').order('created_at', { ascending: false }).limit(100)
    if (status !== 'all') query = query.eq('status', status)
    const { data, error: queryError } = await query
    if (queryError) { setError(queryError.message); setWithdrawals([]); setLoading(false); return }
    const rows = data || []
    const ids = [...new Set(rows.map(row => row.user_id).filter(Boolean))]
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('id,username,level').in('id', ids)
      const byId = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      setWithdrawals(rows.map(row => ({ ...row, profile: byId[row.user_id] || null })))
    } else setWithdrawals(rows)
    setLoading(false)
  }, [status])

  useEffect(() => { load() }, [load])

  async function approve(id) {
    if (!window.confirm('Setujui penarikan ini?')) return
    setBusyId(id); setError(''); setNotice('')
    const { error: rpcError } = await supabase.rpc('approve_withdrawal', { p_withdrawal_id: id })
    if (rpcError) setError(rpcError.message)
    else { setNotice('Penarikan berhasil disetujui.'); await load() }
    setBusyId('')
  }

  async function reject(id) {
    if (!window.confirm('Tolak penarikan ini dan kembalikan saldo user?')) return
    setBusyId(id); setError(''); setNotice('')
    const { error: rpcError } = await supabase.rpc('reject_withdrawal', { p_withdrawal_id: id })
    if (rpcError) setError(rpcError.message)
    else { setNotice('Penarikan ditolak dan saldo user dikembalikan.'); await load() }
    setBusyId('')
  }

  return <section className="admin-balances">
    <div className="card">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
        <div><h2>Manajemen Withdrawal</h2><p className="muted small">Periksa dan proses permintaan tarik saldo user.</p></div>
        <div style={{display:'flex',gap:8}}><select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter status"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="paid">Paid</option><option value="all">Semua</option></select><button type="button" className="ghost" onClick={load}>Refresh</button></div>
      </div>
    </div>
    {error && <div className="error card admin-message">{error}</div>}
    {notice && <div className="success card admin-message">{notice}</div>}
    {loading ? <div className="card admin-message">Memuat withdrawal...</div> : withdrawals.length === 0 ? <div className="card admin-message muted">Tidak ada withdrawal pada status ini.</div> : withdrawals.map(w => <div className="user-row card" key={w.id}>
      <div><strong>{w.profile?.username || w.user_id}</strong><p className="muted small">{w.profile?.level?.toUpperCase() || 'USER'} • {new Date(w.created_at).toLocaleString('id-ID')}</p></div>
      <div><label>Nominal<input readOnly value={`Rp${Number(w.amount).toLocaleString('id-ID')}`} /></label></div>
      <div><label>Pembayaran<input readOnly value={`${w.payment_method} • ${w.payment_account}`} /></label></div>
      <div><label>Atas Nama<input readOnly value={w.beneficiary_name || '-'} /></label></div>
      <div><label>Status<input readOnly value={String(w.status).toUpperCase()} /></label></div>
      {w.status === 'pending' && <div><button type="button" onClick={() => approve(w.id)} disabled={busyId === w.id}>{busyId === w.id ? 'MEMPROSES...' : '✓ APPROVE'}</button><button type="button" onClick={() => reject(w.id)} disabled={busyId === w.id}>✕ REJECT</button></div>}
    </div>)}
  </section>
}
