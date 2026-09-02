import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUp } from '../lib/auth'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '', email: '', whatsapp: '', password: '', nik: '', fullName: '',
    bank: '', accountNumber: '', address: '', sponsor: '', paketJoin: '', ahliWaris: ''
  })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault(); setError(''); setMessage(''); setLoading(true)
    try {
      const data = await signUp(
        form.email,
        form.password,
        form.username,
        form.whatsapp,
        {
          nik: form.nik,
          full_name: form.fullName,
          bank: form.bank,
          account_number: form.accountNumber,
          address: form.address,
          sponsor: form.sponsor,
          paket_join: form.paketJoin,
          ahli_waris: form.ahliWaris,
        }
      )
      if (data.session) navigate('/', { replace: true })
      else setMessage('Registrasi berhasil. Silakan cek email untuk konfirmasi akun.')
    } catch (err) { setError(err.message || 'Registrasi gagal.') }
    finally { setLoading(false) }
  }

  return <main className="auth-page"><section className="card auth-card auth-premium">
    <div className="auth-glow" aria-hidden="true" />
    <div className="brand">DollarRise</div>
    <div className="auth-heading"><span className="auth-icon">✦</span><div><p className="eyebrow">GET STARTED</p><h1>Register</h1><p className="muted">Lengkapi data untuk membuat akun baru.</p></div></div>
    <form onSubmit={submit}>
      <label>Username<input value={form.username} onChange={e => update('username', e.target.value)} minLength={3} required autoComplete="username" placeholder="Username Anda" /></label>
      <label>NIK<input value={form.nik} onChange={e => update('nik', e.target.value.replace(/\D/g, '').slice(0, 16))} inputMode="numeric" maxLength={16} required placeholder="16 digit NIK" /></label>
      <label>Nama Lengkap<input value={form.fullName} onChange={e => update('fullName', e.target.value)} required autoComplete="name" placeholder="Nama lengkap sesuai identitas" /></label>
      <label>Email<input type="email" value={form.email} onChange={e => update('email', e.target.value)} required autoComplete="email" placeholder="nama@email.com" /></label>
      <label>Nomor WhatsApp<input type="tel" value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)} required autoComplete="tel" inputMode="tel" placeholder="08xxxxxxxxxx" /></label>
      <label>Bank<input value={form.bank} onChange={e => update('bank', e.target.value)} required placeholder="Nama bank" /></label>
      <label>No Rek<input value={form.accountNumber} onChange={e => update('accountNumber', e.target.value)} required inputMode="numeric" placeholder="Nomor rekening" /></label>
      <label>Alamat<textarea value={form.address} onChange={e => update('address', e.target.value)} required rows="3" placeholder="Alamat lengkap" /></label>
      <label>Sponsor<input value={form.sponsor} onChange={e => update('sponsor', e.target.value)} required placeholder="Username sponsor" /></label>
      <label>Paket Join<input value={form.paketJoin} onChange={e => update('paketJoin', e.target.value)} required placeholder="Paket yang dipilih" /></label>
      <label>Ahli Waris<input value={form.ahliWaris} onChange={e => update('ahliWaris', e.target.value)} required placeholder="Nama ahli waris" /></label>
      <label>Password<input type="password" value={form.password} onChange={e => update('password', e.target.value)} minLength={6} required autoComplete="new-password" placeholder="Minimal 6 karakter" /></label>
      {error && <p className="error">{error}</p>}{message && <p className="success">{message}</p>}
      <button disabled={loading}>{loading ? 'MEMPROSES...' : 'BUAT AKUN →'}</button>
    </form>
    <p className="auth-footer muted">Sudah punya akun? <Link to="/login">Login</Link></p>
  </section></main>
}
