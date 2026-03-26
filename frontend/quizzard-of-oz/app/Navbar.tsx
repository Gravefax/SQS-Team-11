'use client';

import { useState } from 'react';
import LoginButton from "@/app/components/login-button/LoginButton";
import useAuthStore from "@/app/stores/authStore";

export default function Navbar() {
  const authStore = useAuthStore();
  const dummyUsername = "DummyUser";
  const isLoggedIn = !!authStore.getCredential();

  function handleLogout() {
    // TODO: Implement real logout
    console.log("TODO: handleLogout");
    authStore.setCredential(null);
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
        Quizzard of Oz
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
