import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const money = value => `Rp${Number(value || 0).toLocaleString('id-ID')}`

export default function AdminBalances({ users }) {
  const [balances, setBalances] = useState({})
  const [amounts, setAmounts] = useState({})
  const [notes, setNotes] = useState({})
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [accumulated, setAccumulated] = useState(0)

  async function load() {
    if (!users?.length) {
      setBalances({})
      setAccumulated(0)
      return
    }
    const userIds = users.map(u => u.id)
    const [balanceResult, transactionResult] = await Promise.all([
      supabase.from('balances').select('user_id,balance').in('user_id', userIds),
      supabase.from('balance_transactions').select('type,amount').in('user_id', userIds)
    ])
    if (balanceResult.error) setError(balanceResult.error.message)
    else setBalances(Object.fromEntries((balanceResult.data || []).map(r => [r.user_id, Number(r.balance || 0)])))
    if (transactionResult.error) setError(transactionResult.error.message)
    else setAccumulated((transactionResult.data || []).filter(r => r.type === 'credit').reduce((sum, r) => sum + Number(r.amount || 0), 0))
  }

  useEffect(() => { load() }, [users])

  async function change(user, direction) {
    const amount = Number(amounts[user.id])
    const note = (notes[user.id] || '').trim()
    const current = Number(balances[user.id] || 0)
    if (!Number.isSafeInteger(amount) || amount <= 0) return setError('Jumlah saldo harus berupa angka bulat lebih besar dari 0.')
    if (!note) return setError('Keterangan wajib diisi.')
    if (direction === 'debit' && amount > current) return setError('Saldo tidak boleh menjadi minus.')
    setSaving(user.id); setError(''); setNotice('')
    const next = direction === 'credit' ? current + amount : current - amount

    const { error: be } = await supabase.from('balances').upsert({ user_id: user.id, balance: next }, { onConflict: 'user_id' })
    if (be) { setError(be.message); setSaving(null); return }

    const { error: te } = await supabase.from('balance_transactions').insert({ user_id: user.id, type: direction, amount, balance_before: current, balance_after: next, description: note })
    if (te) {
      await supabase.from('balances').upsert({ user_id: user.id, balance: current }, { onConflict: 'user_id' })
      setError(te.message); setSaving(null); return
    }

    setBalances(v => ({ ...v, [user.id]: next }))
    if (direction === 'credit') setAccumulated(v => v + amount)
    setAmounts(v => ({ ...v, [user.id]: '' }))
    setNotes(v => ({ ...v, [user.id]: '' }))
    setNotice(`Saldo ${user.username || 'user'} berhasil diperbarui.`)
    setSaving(null)
  }

  const summary = useMemo(() => {
    const entries = Object.entries(balances)
    const total = entries.reduce((sum, [, value]) => sum + Number(value || 0), 0)
    const withBalance = entries.filter(([, value]) => Number(value || 0) > 0).length
    const vipIds = new Set((users || []).filter(user => (user.level || '').toLowerCase() === 'vip').map(user => user.id))
    const vipTotal = entries.reduce((sum, [id, value]) => sum + (vipIds.has(id) ? Number(value || 0) : 0), 0)
    return { total, withBalance, vipTotal }
  }, [balances, users])

  return <section className="admin-balances">
    <div className="card"><h2>Manajemen Saldo</h2><p className="muted">Kelola saldo user. Keterangan wajib diisi untuk setiap perubahan.</p></div>

    <div className="admin-balance-stats" style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,marginTop:12}}>
      <div className="card" style={{padding:'14px 15px'}}><span className="muted small">Total Saldo Tersedia</span><strong style={{display:'block',fontSize:22,marginTop:5,overflowWrap:'anywhere'}}>{money(summary.total)}</strong><span className="muted small">Saldo saat ini</span></div>
      <div className="card" style={{padding:'14px 15px'}}><span className="muted small">Akumulasi Saldo</span><strong style={{display:'block',fontSize:22,marginTop:5,overflowWrap:'anywhere'}}>{money(accumulated)}</strong><span className="muted small">Total kredit historis</span></div>
      <div className="card" style={{padding:'14px 15px'}}><span className="muted small">User Bersaldo</span><strong style={{display:'block',fontSize:24,marginTop:5}}>{summary.withBalance}</strong><span className="muted small">Dari {users?.length || 0} user</span></div>
      <div className="card" style={{padding:'14px 15px'}}><span className="muted small">Saldo VIP</span><strong style={{display:'block',fontSize:22,marginTop:5,overflowWrap:'anywhere'}}>👑 {money(summary.vipTotal)}</strong><span className="muted small">Level VIP</span></div>
    </div>

    {error && <div className="error card" style={{marginTop:12}}>{error}</div>}
    {notice && <div className="success card" style={{marginTop:12}}>{notice}</div>}
    {(users || []).map(user => <article className="card user-row" key={user.id}>
      <div><strong>{user.username || 'Tanpa username'}</strong><p>Saldo: <strong>{money(balances[user.id])}</strong></p></div>
      <label>Jumlah<input type="number" min="1" step="1" value={amounts[user.id] || ''} onChange={e => setAmounts(v => ({ ...v, [user.id]: e.target.value }))} /></label>
      <label>Keterangan<input value={notes[user.id] || ''} onChange={e => setNotes(v => ({ ...v, [user.id]: e.target.value }))} placeholder="Keterangan transaksi" /></label>
      <div><button disabled={saving === user.id} onClick={() => change(user, 'credit')}>+ Tambah Saldo</button> <button disabled={saving === user.id} onClick={() => change(user, 'debit')}>− Kurangi Saldo</button></div>
    </article>)}
  </section>
}
