'use client';

import { useState } from 'react';
import LoginMenu from '@/app/components/login-menu/LoginMenu';
import LoginButton from "@/app/components/login-button/LoginButton";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginMenuOpen, setIsLoginMenuOpen] = useState(false);
  const dummyUsername = "DummyUser";

  function handleLoginClick() {
    setIsLoginMenuOpen((prev) => !prev);
  }

  function handleLogin() {
    // TODO: Implement real authentication
    console.log("TODO: handleLogin");
    setIsLoginMenuOpen(false);
    setIsLoggedIn(true);
  }

  function handleLogout() {
    // TODO: Implement real logout
    console.log("TODO: handleLogout");
    setIsLoginMenuOpen(false);
    setIsLoggedIn(false);
  }

  return (
    <header
      className="relative z-10 flex justify-between items-center px-8 py-6"
      style={{ borderBottom: '1px solid rgba(var(--oz-violet-light-rgb), 0.1)' }}
    >
      <div
        className="text-xl font-semibold tracking-widest uppercase"
        style={{ color: 'rgba(var(--oz-violet-text-rgb), 0.65)', letterSpacing: '0.22em' }}
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
        <div className="relative">
          <LoginButton />
        </div>
      )}
    </header>
  );
}
