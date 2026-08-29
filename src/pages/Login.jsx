import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signIn } from '../lib/auth'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Login gagal.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="auth-page"><section className="card auth-card auth-premium">
    <div className="auth-glow" aria-hidden="true" />
    <div className="brand">DollarRise</div>
    <div className="auth-heading"><span className="auth-icon">↗</span><div><p className="eyebrow">WELCOME BACK</p><h1>Login</h1><p className="muted">Masuk ke dashboard Anda.</p></div></div>
    <form onSubmit={submit}>
      <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="nama@email.com" /></label>
      <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Masukkan password" /></label>
      {error && <p className="error">{error}</p>}
      <button disabled={loading}>{loading ? 'MEMPROSES...' : 'LOGIN →'}</button>
    </form>
    <p className="auth-footer muted">Belum punya akun? <Link to="/register">Buat akun</Link></p>
  </section></main>
}
