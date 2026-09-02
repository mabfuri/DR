import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyForm = { username:'', email:'', whatsapp:'', password:'', nik:'', fullName:'', bank:'', accountNumber:'', address:'', sponsor:'', paketJoin:'', ahliWaris:'', role:'user', level:'free', status:'active', dashboardLink:'', adsterraPlacementId:'' }

const fields = [
  ['nik','NIK'], ['full_name','Nama Lengkap'], ['email','Email'], ['whatsapp','WhatsApp'],
  ['bank','Bank'], ['account_number','No. Rekening'], ['address','Alamat'], ['sponsor','Sponsor'],
  ['paket_join','Paket Join'], ['ahli_waris','Ahli Waris']
]

export default function AdminUsers() {
  const [users,setUsers]=useState([]), [loading,setLoading]=useState(true), [error,setError]=useState(''), [notice,setNotice]=useState('')
  const [saving,setSaving]=useState(null), [editingUser,setEditingUser]=useState(null), [editForm,setEditForm]=useState(null), [savingEdit,setSavingEdit]=useState(false)
  const [passwords,setPasswords]=useState({}), [showCreate,setShowCreate]=useState(false), [creating,setCreating]=useState(false), [form,setForm]=useState(emptyForm)
  const [search,setSearch]=useState(''), [statusFilter,setStatusFilter]=useState('all'), [levelFilter,setLevelFilter]=useState('all')

  async function loadUsers(){
    setLoading(true); setError('')
    const {data,error:loadError}=await supabase.from('profiles').select('id,username,email,whatsapp,nik,full_name,bank,account_number,address,sponsor,paket_join,ahli_waris,role,level,status,personal_dashboard_link,adsterra_placement_id,created_at').order('created_at',{ascending:false})
    if(loadError)setError(loadError.message); else setUsers(data||[])
    setLoading(false)
  }
  useEffect(()=>{loadUsers()},[])

  async function updateUser(id,patch){
    setSaving(id); setError(''); setNotice('')
    const {error:updateError}=await supabase.from('profiles').update(patch).eq('id',id)
    if(updateError)setError(updateError.message)
    else{setUsers(list=>list.map(u=>u.id===id?{...u,...patch}:u));setNotice('Perubahan user berhasil disimpan.')}
    setSaving(null)
  }

  function openEdit(user){
    setEditingUser(user)
    setEditForm({username:user.username||'',email:user.email||'',whatsapp:user.whatsapp||'',nik:user.nik||'',fullName:user.full_name||'',bank:user.bank||'',accountNumber:user.account_number||'',address:user.address||'',sponsor:user.sponsor||'',paketJoin:user.paket_join||'',ahliWaris:user.ahli_waris||'',role:user.role||'user',level:user.level||'free',status:user.status||'active',dashboardLink:user.personal_dashboard_link||'',adsterraPlacementId:user.adsterra_placement_id||''})
    setError('');setNotice('')
  }
  function closeEdit(){if(!savingEdit){setEditingUser(null);setEditForm(null)}}

  async function saveEdit(e){
    e.preventDefault(); if(!editingUser||!editForm)return
    if(!editForm.username.trim())return setError('Username wajib diisi.')
    setSavingEdit(true);setError('');setNotice('')
    const patch={username:editForm.username.trim(),email:editForm.email.trim()||null,whatsapp:editForm.whatsapp.trim()||null,nik:editForm.nik.trim()||null,full_name:editForm.fullName.trim()||null,bank:editForm.bank.trim()||null,account_number:editForm.accountNumber.trim()||null,address:editForm.address.trim()||null,sponsor:editForm.sponsor.trim()||null,paket_join:editForm.paketJoin.trim()||null,ahli_waris:editForm.ahliWaris.trim()||null,role:editForm.role,level:editForm.level,status:editForm.status,personal_dashboard_link:editForm.dashboardLink.trim()||null,adsterra_placement_id:editForm.adsterraPlacementId.trim()||null}
    const {error:updateError}=await supabase.from('profiles').update(patch).eq('id',editingUser.id)
    if(updateError)setError(updateError.message)
    else{setUsers(list=>list.map(u=>u.id===editingUser.id?{...u,...patch}:u));setEditingUser(null);setEditForm(null);setNotice(`Profil ${patch.username} berhasil diperbarui.`)}
    setSavingEdit(false)
  }

  async function resetPassword(user){
    const password=passwords[user.id]||''; if(password.length<8)return setError('Password baru minimal 8 karakter.')
    setSaving(user.id);setError('');setNotice('')
    const {data:sessionData}=await supabase.auth.getSession();const token=sessionData.session?.access_token
    if(!token){setError('Sesi admin tidak ditemukan.');setSaving(null);return}
    try{const response=await fetch('/api/admin/reset-password',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({userId:user.id,password})});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Gagal mengganti password user.');setPasswords(v=>({...v,[user.id]:''}));setNotice(`Password ${user.username||'user'} berhasil diubah.`)}catch(e){setError(e.message)}
    setSaving(null)
  }

  async function createUser(e){
    e.preventDefault();setCreating(true);setError('');setNotice('')
    const {data:sessionData}=await supabase.auth.getSession();const token=sessionData.session?.access_token
    if(!token){setError('Sesi admin tidak ditemukan.');setCreating(false);return}
    try{const response=await fetch('/api/admin/create-user',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(form)});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Gagal membuat user.');setShowCreate(false);setForm(emptyForm);setNotice(`User ${result.user?.username||form.username} berhasil dibuat.`);await loadUsers()}catch(e){setError(e.message)}
    setCreating(false)
  }

  const field=(key,value)=>setForm(v=>({...v,[key]:value}))
  const filteredUsers=useMemo(()=>{const q=search.trim().toLowerCase();return users.filter(u=>{const level=(u.level||'free').toLowerCase();const status=statusFilter==='all'||(u.status||'active').toLowerCase()===statusFilter;const lev=levelFilter==='all'||(levelFilter==='member'?['free','basic','premium'].includes(level):level===levelFilter);const hay=[u.username,u.email,u.id,u.nik,u.full_name,u.whatsapp,u.bank,u.account_number,u.address,u.sponsor,u.paket_join,u.ahli_waris,u.role,u.level,u.status].join(' ').toLowerCase();return status&&lev&&(!q||hay.includes(q))})},[users,search,statusFilter,levelFilter])
  const activeCount=users.filter(u=>(u.status||'active')==='active').length, suspendedCount=users.filter(u=>u.status==='suspended').length, vipCount=users.filter(u=>u.level==='vip').length
  const display=(v)=>v===null||v===undefined||String(v).trim()===''?'Belum diisi':String(v)
  const date=(v)=>v?new Date(v).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'}):'—'

  if(loading)return <section className="card"><p>Memuat data member...</p></section>

  return <section className="admin-users">
    <div className="card" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}><div><h2>Manajemen Member</h2><p className="muted">Seluruh data pendaftaran member DollarRise tersimpan dan dapat diperiksa dari sini.</p></div><button type="button" onClick={()=>{setShowCreate(true);setError('');setNotice('')}}>＋ Tambah User</button></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,marginTop:12}}><div className="card"><span className="muted small">Total Member</span><strong style={{display:'block',fontSize:24}}>{users.length}</strong></div><div className="card"><span className="muted small">Active</span><strong style={{display:'block',fontSize:24}}>🟢 {activeCount}</strong></div><div className="card"><span className="muted small">Suspended</span><strong style={{display:'block',fontSize:24}}>🔴 {suspendedCount}</strong></div><div className="card"><span className="muted small">VIP</span><strong style={{display:'block',fontSize:24}}>👑 {vipCount}</strong></div></div>
    <div className="card" style={{display:'flex',gap:10,marginTop:12,flexWrap:'wrap'}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari NIK, nama, email, WA, bank, rekening, sponsor, paket..." style={{flex:1,minWidth:240}}/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">Semua Status</option><option value="active">Active</option><option value="suspended">Suspended</option></select><select value={levelFilter} onChange={e=>setLevelFilter(e.target.value)}><option value="all">Semua Level</option><option value="member">Member</option><option value="vip">VIP</option></select></div>
    {error&&<div className="error card" style={{padding:14,marginTop:12}}>{error}</div>}{notice&&<div className="success card" style={{padding:14,marginTop:12}}>{notice}</div>}
    <div style={{display:'grid',gap:12,marginTop:12}}>{filteredUsers.map(user=><article className="card" key={user.id} style={{overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap',borderBottom:'1px solid var(--border)',paddingBottom:12}}><div><strong style={{fontSize:18}}>{display(user.full_name)}</strong><p className="muted small" style={{margin:'4px 0 0'}}>Username: {display(user.username)} · Daftar: {date(user.created_at)}</p></div><div style={{display:'flex',gap:7,flexWrap:'wrap'}}><span className="badge">{(user.role||'user').toUpperCase()}</span><span className="badge">{(user.level||'free').toUpperCase()}</span><span className="badge">{(user.status||'active').toUpperCase()}</span></div></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,marginTop:14}}>{fields.map(([key,label])=><div key={key} style={{padding:'10px 12px',border:'1px solid var(--border)',borderRadius:10}}><span className="muted small" style={{display:'block',marginBottom:4}}>{label}</span><strong style={{fontSize:13,wordBreak:'break-word',whiteSpace:key==='address'?'pre-wrap':'normal'}}>{display(user[key])}</strong></div>)}</div>
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginTop:14}}><button type="button" onClick={()=>openEdit(user)} disabled={saving===user.id}>✏️ Edit Data</button><select value={user.level||'free'} disabled={saving===user.id} onChange={e=>updateUser(user.id,{level:e.target.value})}><option value="free">Free</option><option value="basic">Basic</option><option value="premium">Premium</option><option value="vip">VIP</option></select><select value={user.status||'active'} disabled={saving===user.id} onChange={e=>updateUser(user.id,{status:e.target.value})}><option value="active">Active</option><option value="suspended">Suspended</option></select><input type="password" minLength="8" value={passwords[user.id]||''} disabled={saving===user.id} onChange={e=>setPasswords(v=>({...v,[user.id]:e.target.value}))} placeholder="Password baru" style={{maxWidth:180}}/><button type="button" disabled={saving===user.id} onClick={()=>resetPassword(user)}>🔑 Reset Password</button></div>
    </article>)}</div>

    {editingUser&&editForm&&<div role="dialog" aria-modal="true" style={{position:'fixed',inset:0,zIndex:100,display:'grid',placeItems:'center',padding:16,background:'rgba(0,0,0,.7)'}}><form className="card" onSubmit={saveEdit} style={{width:'min(760px,100%)',maxHeight:'92vh',overflowY:'auto',padding:22}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><p className="eyebrow">EDIT MEMBER</p><h2>Data Pendaftaran</h2></div><button type="button" className="ghost" onClick={closeEdit}>✕</button></div><div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12}}>{[['username','Username'],['email','Email'],['whatsapp','WhatsApp'],['nik','NIK'],['fullName','Nama Lengkap'],['bank','Bank'],['accountNumber','No. Rekening'],['sponsor','Sponsor'],['paketJoin','Paket Join'],['ahliWaris','Ahli Waris']].map(([key,label])=><label key={key}>{label}<input value={editForm[key]} onChange={e=>setEditForm(v=>({...v,[key]:e.target.value}))}/></label>)}<label>Alamat<textarea rows="3" value={editForm.address} onChange={e=>setEditForm(v=>({...v,address:e.target.value}))}/></label><label>Role<select value={editForm.role} onChange={e=>setEditForm(v=>({...v,role:e.target.value}))}><option value="user">User</option><option value="admin">Admin</option></select></label><label>Level<select value={editForm.level} onChange={e=>setEditForm(v=>({...v,level:e.target.value}))}><option value="free">Free</option><option value="basic">Basic</option><option value="premium">Premium</option><option value="vip">VIP</option></select></label><label>Status<select value={editForm.status} onChange={e=>setEditForm(v=>({...v,status:e.target.value}))}><option value="active">Active</option><option value="suspended">Suspended</option></select></label></div><div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}><button type="button" className="ghost" onClick={closeEdit}>Batal</button><button type="submit" disabled={savingEdit}>{savingEdit?'Menyimpan...':'✓ Simpan'}</button></div></form></div>}

    {showCreate&&<div role="dialog" aria-modal="true" style={{position:'fixed',inset:0,zIndex:100,display:'grid',placeItems:'center',padding:16,background:'rgba(0,0,0,.7)'}}><form className="card" onSubmit={createUser} style={{width:'min(620px,100%)',maxHeight:'92vh',overflowY:'auto',padding:22}}><div style={{display:'flex',justifyContent:'space-between'}}><h2>Tambah User</h2><button type="button" className="ghost" onClick={()=>setShowCreate(false)}>✕</button></div><div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12}}>{[['username','Username'],['email','Email'],['whatsapp','WhatsApp'],['password','Password']].map(([key,label])=><label key={key}>{label}<input type={key==='password'?'password':key==='email'?'email':'text'} required value={form[key]} onChange={e=>field(key,e.target.value)}/></label>)}</div><button type="submit" disabled={creating} style={{marginTop:16}}>{creating?'Membuat...':'✓ Buat User'}</button></form></div>}
  </section>
}
