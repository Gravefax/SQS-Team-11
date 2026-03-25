'use client';

import { useState } from 'react';

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const dummyUsername = "DummyUser";

  function handleLogin() {
    // TODO: Implement real authentication
    console.log("TODO: handleLogin");
    setIsLoggedIn(true);
  }

  function handleLogout() {
    // TODO: Implement real logout
    console.log("TODO: handleLogout");
    setIsLoggedIn(false);
  }

  return (
    <header
      className="relative z-10 flex justify-between items-center px-8 py-6"
      style={{ borderBottom: '1px solid rgba(167, 139, 250, 0.1)' }}
    >
      <div
        className="text-xl font-semibold tracking-widest uppercase"
        style={{ color: 'rgba(196, 181, 253, 0.65)', letterSpacing: '0.22em' }}
      >
        Quizard of Oz
      </div>
      {isLoggedIn ? (
        <button
          onClick={handleLogout}
          className="login-btn px-6 py-2 font-medium rounded-lg"
        >
          {dummyUsername}
        </button>
      ) : (
        <button
          onClick={handleLogin}
          className="login-btn px-6 py-2 font-medium rounded-lg"
        >
          Login
        </button>
      )}
    </header>
  );
}
