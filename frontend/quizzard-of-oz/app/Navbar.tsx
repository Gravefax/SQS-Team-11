'use client';

import { useState } from 'react';

export default function Navbar() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

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
      <button
        onClick={() => setIsLoginOpen(!isLoginOpen)}
        className="login-btn px-6 py-2 font-medium rounded-lg"
      >
        Login
      </button>
    </header>
  );
}
