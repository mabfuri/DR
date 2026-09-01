import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUp } from '../lib/auth'

export default function Register() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault(); setError(''); setMessage(''); setLoading(true)
    try {
      const data = await signUp(email, password, username, whatsapp)
      if (data.session) navigate('/', { replace: true })
      else setMessage('Registrasi berhasil. Silakan cek email untuk konfirmasi akun.')
    } catch (err) { setError(err.message || 'Registrasi gagal.') }
    finally { setLoading(false) }
  }

  return <main className="auth-page"><section className="card auth-card auth-premium">
    <div className="auth-glow" aria-hidden="true" />
    <div className="brand">DollarRise</div>
    <div className="auth-heading"><span className="auth-icon">✦</span><div><p className="eyebrow">GET STARTED</p><h1>Register</h1><p className="muted">Buat akun baru untuk memulai.</p></div></div>
    <form onSubmit={submit}>
      <label>Username<input value={username} onChange={e => setUsername(e.target.value)} minLength={3} required autoComplete="username" placeholder="Username Anda" /></label>
      <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="nama@email.com" /></label>
      <label>Nomor WhatsApp<input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required autoComplete="tel" inputMode="tel" placeholder="08xxxxxxxxxx" /></label>
      <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required autoComplete="new-password" placeholder="Minimal 6 karakter" /></label>
      {error && <p className="error">{error}</p>}{message && <p className="success">{message}</p>}
      <button disabled={loading}>{loading ? 'MEMPROSES...' : 'BUAT AKUN →'}</button>
    </form>
    <p className="auth-footer muted">Sudah punya akun? <Link to="/login">Login</Link></p>
  </section></main>
}
