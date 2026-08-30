import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import '../admin-offers.css'

const emptyForm = { userId: '', title: '', link: '', status: 'active', sortOrder: 0 }

export default function AdminOffers({ users }) {
  const [offers, setOffers] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadOffers() {
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('offers')
      .select('id,user_id,title,link,status,sort_order,created_at,profiles(username)')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (loadError) setError(loadError.message)
    else setOffers(data || [])
    setLoading(false)
  }

  useEffect(() => { loadOffers() }, [])

  function startCreate() {
    setEditing(null)
    setForm({ ...emptyForm, userId: users?.[0]?.id || '' })
    setError(''); setNotice('')
  }

  function startEdit(offer) {
    setEditing(offer)
    setForm({ userId: offer.user_id, title: offer.title || '', link: offer.link || '', status: offer.status || 'active', sortOrder: offer.sort_order || 0 })
    setError(''); setNotice('')
  }

  async function saveOffer(e) {
    e.preventDefault()
    if (!form.userId || !form.title.trim() || !form.link.trim()) {
      setError('Pemilik, judul offer, dan link wajib diisi.')
      return
    }
    setSaving(true); setError(''); setNotice('')
    const payload = { user_id: form.userId, title: form.title.trim(), link: form.link.trim(), status: form.status, sort_order: Number(form.sortOrder) || 0 }
    const result = editing
      ? await supabase.from('offers').update(payload).eq('id', editing.id).select('id,user_id,title,link,status,sort_order,created_at,profiles(username)').single()
      : await supabase.from('offers').insert(payload).select('id,user_id,title,link,status,sort_order,created_at,profiles(username)').single()
    if (result.error) setError(result.error.message)
    else {
      setNotice(editing ? 'Offer berhasil diperbarui.' : 'Offer berhasil dibuat.')
      setEditing(null); setForm({ ...emptyForm, userId: users?.[0]?.id || '' })
      await loadOffers()
    }
    setSaving(false)
  }

  async function toggleStatus(offer) {
    setError(''); setNotice('')
    const next = offer.status === 'active' ? 'inactive' : 'active'
    const { error: updateError } = await supabase.from('offers').update({ status: next }).eq('id', offer.id)
    if (updateError) setError(updateError.message)
    else { setNotice(`Offer ${next === 'active' ? 'diaktifkan' : 'dinonaktifkan'}.`); await loadOffers() }
  }

  async function deleteOffer(offer) {
    if (!window.confirm(`Hapus offer “${offer.title}” dari ${offer.profiles?.username || 'user'}?`)) return
    setError(''); setNotice('')
    const { error: deleteError } = await supabase.from('offers').delete().eq('id', offer.id)
    if (deleteError) setError(deleteError.message)
    else { setNotice('Offer berhasil dihapus.'); await loadOffers() }
  }

  return <section className="admin-users admin-offers">
    <div className="card" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
      <div><h2>Manajemen Offer</h2><p className="muted">Atur pemilik, link, status, dan urutan offer yang tampil di Dashboard.</p></div>
      <button type="button" onClick={startCreate}>＋ Tambah Offer</button>
    </div>

    {(error || notice) && <div className={`${error ? 'error' : 'success'} card`} style={{padding:14,marginTop:12}}>{error || notice}</div>}

    <form className="card" onSubmit={saveOffer} style={{marginTop:12,padding:18}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
        <div><p className="eyebrow" style={{margin:'0 0 5px'}}>{editing ? 'EDIT OFFER' : 'OFFER BARU'}</p><h3 style={{margin:0}}>{editing ? 'Edit Offer' : 'Tambah Offer'}</h3></div>
        {editing && <button type="button" className="ghost" onClick={startCreate}>＋ Baru</button>}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12,marginTop:15}}>
        <label>Pemilik Offer<select required value={form.userId} onChange={e => setForm(v => ({...v,userId:e.target.value}))}><option value="">Pilih user</option>{(users || []).map(user => <option key={user.id} value={user.id}>{user.username}</option>)}</select></label>
        <label>Judul Offer<input required value={form.title} onChange={e => setForm(v => ({...v,title:e.target.value}))} placeholder="Exclusive Offer" /></label>
        <label>Link Offer<input required type="url" value={form.link} onChange={e => setForm(v => ({...v,link:e.target.value}))} placeholder="https://..." /></label>
        <label>Status<select value={form.status} onChange={e => setForm(v => ({...v,status:e.target.value}))}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <label>Urutan<input type="number" min="0" step="1" value={form.sortOrder} onChange={e => setForm(v => ({...v,sortOrder:e.target.value}))} /></label>
      </div>
      <button type="submit" disabled={saving} style={{marginTop:15}}>{saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat Offer'}</button>
    </form>

    <div style={{display:'grid',gap:12,marginTop:12}}>
      {loading ? <div className="card"><p>Memuat daftar offer...</p></div> : offers.length === 0 ? <div className="card"><strong>Belum ada offer.</strong><p className="muted small">Buat offer pertama untuk mulai menampilkannya di Dashboard.</p></div> : offers.map(offer => <article className="card" key={offer.id} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:12,alignItems:'center'}}>
        <div style={{minWidth:0}}><strong>{offer.title}</strong><p className="muted small" style={{margin:'5px 0',whiteSpace:'nowrap'}}>OFFER BY <b>{offer.profiles?.username || 'User'}</b> · {offer.status === 'active' ? '🟢 Active' : '⚪ Inactive'} · Urutan {offer.sort_order}</p><a href={offer.link} target="_blank" rel="noreferrer" className="muted small" style={{wordBreak:'break-all'}}>{offer.link}</a></div>
        <div style={{display:'flex',gap:7,flexWrap:'wrap',justifyContent:'flex-end'}}><button type="button" onClick={() => startEdit(offer)}>✏️ Edit</button><button type="button" onClick={() => toggleStatus(offer)}>{offer.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}</button><button type="button" onClick={() => deleteOffer(offer)} style={{background:'rgba(239,68,68,.12)',color:'#fecaca'}}>🗑️ Hapus</button></div>
      </article>)}
    </div>
  </section>
}