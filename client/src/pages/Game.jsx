import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame } from '../game/PhaserGame.js';

export default function Game() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const game = createGame('phaser-container');
    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  function handleLogout() {
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/');
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#0f0f1a' }}>
      <div id="phaser-container" style={{ width: '100%', height: '100%' }} />
      <div className="game-ui">
        <button className="btn btn-danger" onClick={handleLogout}>
          Logout
        </button>
      </div>
      <div className="game-hint">WASD or Arrow Keys to move</div>
    </div>
  );
}
