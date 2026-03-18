import { Link } from 'react-router-dom';

export default function Home() {
  const loggedIn = !!localStorage.getItem('token');

  return (
    <>
      <nav className="navbar">
        <span className="navbar-brand">TopDown Arena</span>
        <div className="navbar-links">
          {loggedIn ? (
            <Link to="/game" className="btn btn-primary">Play Now</Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline">Login</Link>
              <Link to="/register" className="btn btn-primary">Sign Up Free</Link>
            </>
          )}
        </div>
      </nav>

      <section className="hero">
        <h1>Battle in Real Time</h1>
        <p>
          A fast-paced multiplayer top-down arena. Dodge, chase, and outlast
          other players in a shared world.
        </p>
        <div className="hero-cta">
          <Link to="/register" className="btn btn-primary btn-lg">Get Started</Link>
          <Link to="/login" className="btn btn-outline btn-lg">Login</Link>
        </div>
      </section>

      <div className="ad-banner">
        Advertisement Placeholder — 728x90 Leaderboard
      </div>

      <section className="features">
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="icon">⚡</div>
            <h3>Real-Time Multiplayer</h3>
            <p>Socket.IO-powered server keeps all players in sync at 20 ticks per second.</p>
          </div>
          <div className="feature-card">
            <div className="icon">🔒</div>
            <h3>Secure Accounts</h3>
            <p>Passwords hashed with bcrypt. Sessions use signed JWTs — no cookies to steal.</p>
          </div>
          <div className="feature-card">
            <div className="icon">🗺️</div>
            <h3>Open World Map</h3>
            <p>Explore a large scrolling map with a smooth camera following your character.</p>
          </div>
        </div>
      </section>

      <div className="ad-banner">
        Advertisement Placeholder — 300x250 Medium Rectangle
      </div>

      <footer className="footer">
        &copy; {new Date().getFullYear()} TopDown Arena. All rights reserved.
      </footer>
    </>
  );
}
