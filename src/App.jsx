import { useState } from 'react';

const offers = [
  { name: 'Demo User 1', link: '#' },
  { name: 'Demo User 2', link: '#' },
  { name: 'Demo User 3', link: '#' },
];

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [index, setIndex] = useState(0);
  const offer = offers[index];

  if (!loggedIn) {
    return (
      <main className="auth-page">
        <section className="card auth-card">
          <div className="brand">DollarRise</div>
          <h1>Welcome back</h1>
          <p className="muted">Sign in to access your dashboard.</p>
          <form onSubmit={(e) => { e.preventDefault(); setLoggedIn(true); }}>
            <label>Username or Email<input required placeholder="Enter username or email" /></label>
            <label>Password<input required type="password" placeholder="Enter password" /></label>
            <button type="submit">LOGIN</button>
          </form>
          <button className="link-button" type="button">Forgot password?</button>
        </section>
      </main>
    );
  }

  const move = (step) => setIndex((index + step + offers.length) % offers.length);

  return (
    <main className="dashboard">
      <header className="topbar"><div className="brand">DollarRise</div><button className="ghost" onClick={() => setLoggedIn(false)}>Logout</button></header>
      <section className="hero"><p className="eyebrow">WELCOME BACK</p><h1>User Dashboard</h1><span className="badge">PREMIUM</span></section>
      <section className="stats">
        {['Impressions','Clicks','CTR','CPM','Revenue'].map((label) => <div className="stat card" key={label}><span>{label}</span><strong>{label === 'Revenue' ? 'Rp0' : '0'}</strong></div>)}
      </section>
      <section className="offer card">
        <p className="muted">OFFER BY</p><h2>{offer.name}</h2>
        <a className="unlock" href={offer.link}>🔒 UNLOCK EXCLUSIVE ACCESS</a>
        <div className="offer-nav"><button onClick={() => move(-1)}>← PREVIOUS OFFER</button><button onClick={() => move(1)}>NEXT OFFER →</button></div>
      </section>
    </main>
  );
}
