import App from './App.jsx'
import PublicLp from './pages/PublicLp.jsx'

export default function Root() {
  const path = window.location.pathname.replace(/\/+$/, '')
  return path === '/lp' || path.startsWith('/lp/') ? <PublicLp /> : <App />
}
