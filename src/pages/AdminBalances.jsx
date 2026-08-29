import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminBalances({ users }) {
  const [balances, setBalances] = useState({})
  const [amounts, setAmounts] = useState({})
  const [notes, setNotes] = useState({})
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    async function load() {
      if (!users?.length) return
      const { data, error: e } = await supabase.from('balances').select('user_id,balance').in('user_id', users.map(u => u.id))
      if (e) setError(e.message)
      else setBalances(Object.fromEntries((data || []).map(r => [r.user_id, Number(r.balance || 0)])))
    }
    load()
  }, [users])

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

    const { error: te } = await supabase.from('balance_transactions').insert({
      user_id: user.id,
      type: direction,
      amount,
      balance_before: current,
      balance_after: next,
      description: note
    })
    if (te) {
      // Restore the previous balance if the audit transaction cannot be recorded.
      await supabase.from('balances').upsert({ user_id: user.id, balance: current }, { onConflict: 'user_id' })
      setError(te.message); setSaving(null); return
    }

    setBalances(v => ({ ...v, [user.id]: next }))
    setAmounts(v => ({ ...v, [user.id]: '' }))
    setNotes(v => ({ ...v, [user.id]: '' }))
    setNotice(`Saldo ${user.username || 'user'} berhasil diperbarui.`)
    setSaving(null)
  }

  return <section className="admin-balances">
    <div className="card"><h2>Manajemen Saldo</h2><p className="muted">Tambah atau kurangi saldo. Keterangan wajib diisi.</p></div>
    {error && <div className="error card">{error}</div>}
    {notice && <div className="success card">{notice}</div>}
    {(users || []).map(user => <article className="card user-row" key={user.id}>
      <div><strong>{user.username || 'Tanpa username'}</strong><p>Saldo: <strong>Rp{Number(balances[user.id] || 0).toLocaleString('id-ID')}</strong></p></div>
      <label>Jumlah<input type="number" min="1" step="1" value={amounts[user.id] || ''} onChange={e => setAmounts(v => ({ ...v, [user.id]: e.target.value }))} /></label>
      <label>Keterangan<input value={notes[user.id] || ''} onChange={e => setNotes(v => ({ ...v, [user.id]: e.target.value }))} placeholder="Keterangan transaksi" /></label>
      <div><button disabled={saving === user.id} onClick={() => change(user, 'credit')}>+ Tambah Saldo</button> <button disabled={saving === user.id} onClick={() => change(user, 'debit')}>− Kurangi Saldo</button></div>
    </article>)}
  </section>
}
