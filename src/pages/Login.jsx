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

  return <main className="auth-page premium-landing">
    <div className="landing-orb landing-orb-one" aria-hidden="true" />
    <div className="landing-orb landing-orb-two" aria-hidden="true" />
    <section className="landing-shell">
      <div className="landing-copy">
        <div className="brand landing-brand">DollarRise<span className="brand-dot" /></div>
        <p className="landing-kicker">SMART • SIMPLE • REWARDING</p>
        <h1>Turn your time into <span>opportunity.</span></h1>
        <p className="landing-description">Platform reward modern untuk mengakses exclusive offers, memantau performa, dan mengelola penghasilan Anda dalam satu dashboard.</p>
        <div className="landing-points">
          <div><strong>01</strong><span>Exclusive offers</span></div>
          <div><strong>02</strong><span>Real-time performance</span></div>
          <div><strong>03</strong><span>Simple reward system</span></div>
        </div>
      </div>

      <section className="card auth-card auth-premium landing-login">
        <div className="auth-glow" aria-hidden="true" />
        <div className="login-status"><span /> SYSTEM ONLINE</div>
        <p className="eyebrow">WELCOME BACK</p>
        <h2>Sign in</h2>
        <p className="muted login-subtitle">Masuk untuk melanjutkan ke dashboard DollarRise.</p>
        <form onSubmit={submit}>
          <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="nama@email.com" /></label>
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Masukkan password" /></label>
          {error && <p className="error">{error}</p>}
          <button disabled={loading}>{loading ? 'MEMPROSES...' : 'LOGIN  →'}</button>
        </form>
        <p className="auth-footer muted">Belum punya akun? <Link to="/register">Buat akun</Link></p>
      </section>
    </section>
    <p className="landing-footer">© DollarRise · Your opportunity, your dashboard.</p>
  </main>
}
