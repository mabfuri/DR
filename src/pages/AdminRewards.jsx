import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const money = value => `Rp${Number(value || 0).toLocaleString('id-ID')}`
const order = { free: 1, basic: 2, premium: 3, vip: 4 }
const dailyCap = { free: 0, basic: 0, premium: 10000, vip: 100000 }

export default function AdminRewards() {
  const [settings, setSettings] = useState([])
  const [values, setValues] = useState({})
  const [active, setActive] = useState({})
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    const { data, error } = await supabase.from('reward_settings').select('id,level,reward_amount,is_active')
    if (error) return setError(error.message)
    const rows = [...(data || [])].sort((a, b) => (order[a.level] || 99) - (order[b.level] || 99))
    setSettings(rows)
    setValues(Object.fromEntries(rows.map(r => [r.id, r.reward_amount])))
    setActive(Object.fromEntries(rows.map(r => [r.id, r.is_active])))
  }

  useEffect(() => { load() }, [])

  async function save(row) {
    const level = String(row.level).toLowerCase()
    const amount = Number(values[row.id])
    const cap = dailyCap[level]
    if (!Number.isFinite(amount) || amount < 0) return setError('Nominal reward harus berupa angka 0 atau lebih.')
    if (cap === 0 && amount !== 0) return setError(`${level.toUpperCase()} tidak boleh memiliki reward.`)
    if (cap > 0 && amount > cap) return setError(`Reward ${level.toUpperCase()} tidak boleh melebihi batas harian ${money(cap)}.`)
    setSaving(row.id); setError(''); setNotice('')
    const { error } = await supabase.from('reward_settings').update({ reward_amount: amount, is_active: cap > 0 ? !!active[row.id] : false }).eq('id', row.id)
    if (error) setError(error.message)
    else { setNotice(`Pengaturan ${level.toUpperCase()} berhasil disimpan.`); await load() }
    setSaving(null)
  }

  return <section className="admin-users admin-rewards">
    <div className="card"><h2>Pengaturan Reward</h2><p className="muted">Atur reward klik UNLOCK berdasarkan level user. FREE dan BASIC tidak mendapatkan saldo.</p></div>
    {error && <div className="error card admin-message">{error}</div>}
    {notice && <div className="success card admin-message">{notice}</div>}
    <div className="admin-reward-list">
      {settings.map(row => {
        const level = String(row.level).toLowerCase(); const cap = dailyCap[level]
        return <article className="card admin-reward-row" key={row.id}>
          <div className="admin-reward-main"><div><span className="eyebrow">LEVEL</span><h3>{level.toUpperCase()}</h3></div><div><span className="muted small">Batas harian</span><strong>{cap ? money(cap) : 'Tidak mendapatkan reward'}</strong></div></div>
          <div className="admin-reward-controls">
            <label>Reward per klik<input type="number" min="0" max={cap || 0} step="1" disabled={!cap} value={values[row.id] ?? 0} onChange={e => setValues(v => ({...v,[row.id]:e.target.value}))} /></label>
            <label className="admin-toggle"><input type="checkbox" disabled={!cap} checked={cap > 0 && !!active[row.id]} onChange={e => setActive(v => ({...v,[row.id]:e.target.checked}))} /> Reward aktif</label>
            <button disabled={saving === row.id} onClick={() => save(row)}>{saving === row.id ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </article>
      })}
    </div>
  </section>
}
