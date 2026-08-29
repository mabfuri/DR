import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUp } from '../lib/auth'

export default function Register() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault(); setError(''); setMessage(''); setLoading(true)
    try {
      const data = await signUp(email, password, username)
      if (data.session) navigate('/', { replace: true })
      else setMessage('Registrasi berhasil. Silakan cek email untuk konfirmasi akun.')
    } catch (err) { setError(err.message || 'Registrasi gagal.') }
    finally { setLoading(false) }
  }

  return <main className="auth-page"><section className="card auth-card">
    <div className="brand">DollarRise</div><h1>Register</h1><p className="muted">Buat akun baru.</p>
    <form onSubmit={submit}>
      <label>Username<input value={username} onChange={e => setUsername(e.target.value)} minLength={3} required autoComplete="username" /></label>
      <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
      <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required autoComplete="new-password" /></label>
      {error && <p className="error">{error}</p>}{message && <p className="success">{message}</p>}
      <button disabled={loading}>{loading ? 'MEMPROSES...' : 'REGISTER'}</button>
    </form>
    <p className="muted">Sudah punya akun? <Link to="/login">Login</Link></p>
  </section></main>
}
