import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const money = value => `Rp${Number(value || 0).toLocaleString('id-ID')}`

export default function AdminRewards() {
  const [settings, setSettings] = useState([])
  const [values, setValues] = useState({})
  const [active, setActive] = useState({})
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    const { data, error } = await supabase.from('reward_settings').select('id,level,reward_amount,is_active').order('level')
    if (error) return setError(error.message)
    setSettings(data || [])
    setValues(Object.fromEntries((data || []).map(r => [r.id, r.reward_amount])))
    setActive(Object.fromEntries((data || []).map(r => [r.id, r.is_active])))
  }

  useEffect(() => { load() }, [])

  async function save(row) {
    const amount = Number(values[row.id])
    if (!Number.isFinite(amount) || amount < 0) return setError('Reward harus berupa angka 0 atau lebih.')
    setSaving(row.id); setError(''); setNotice('')
    const { error } = await supabase.from('reward_settings').update({ reward_amount: amount, is_active: !!active[row.id] }).eq('id', row.id)
    if (error) setError(error.message)
    else setNotice(`Reward ${row.level.toUpperCase()} berhasil disimpan.`)
    setSaving(null)
  }

  return <section className="admin-rewards">
    <div className="card"><h2>Pengaturan Reward</h2><p className="muted">Atur nominal reward yang diberikan untuk klik offer berdasarkan level user.</p></div>
    {error && <div className="error card" style={{marginTop:12}}>{error}</div>}
    {notice && <div className="success card" style={{marginTop:12}}>{notice}</div>}
    <div style={{display:'grid',gap:12,marginTop:12}}>
      {settings.map(row => <article className="card" key={row.id} style={{display:'grid',gap:12}}>
        <div><strong>{row.level.toUpperCase()}</strong><p className="muted small">Reward per klik UNLOCK: {money(values[row.id])}</p></div>
        <label>Nominal Reward<input type="number" min="0" step="1" value={values[row.id] ?? ''} onChange={e => setValues(v => ({...v,[row.id]:e.target.value}))} /></label>
        <label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={!!active[row.id]} onChange={e => setActive(v => ({...v,[row.id]:e.target.checked}))} /> Reward aktif</label>
        <button disabled={saving === row.id} onClick={() => save(row)}>{saving === row.id ? 'Menyimpan...' : 'Simpan Pengaturan'}</button>
      </article>)}
    </div>
  </section>
}
