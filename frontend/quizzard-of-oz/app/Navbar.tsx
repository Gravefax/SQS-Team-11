"use client";

import { useEffect } from "react";
import LoginButton from "@/app/components/login-button/LoginButton";
import useAuthStore from "@/app/stores/authStore";
import { refreshAccessToken, logout } from "@/app/api/auth";

export default function Navbar() {
  const authStore = useAuthStore();
  const credential = authStore.getCredential();
  const isLoggedIn = !!credential;
  const displayName = credential?.username ?? credential?.email ?? "User";

  useEffect(() => {
    let isMounted = true;
    if (authStore.getCredential()) {
      return () => {
        isMounted = false;
      };
    }

    refreshAccessToken()
      .then((res) => {
        if (!isMounted) return;
        authStore.setCredential({
          email: res.email,
          username: res.username ?? res.email,
          expiresAt: res.expires_at,
        });
      })
      .catch(() => {
        /* Ignore missing/expired refresh token */
      });

    return () => {
      isMounted = false;
    };
  }, [authStore]);

  function handleLogout() {
    logout().finally(() => authStore.clearCredential());
  }

  return (
    <header
      className="relative z-10 flex justify-between items-center px-8 py-6"
      style={{ borderBottom: "1px solid rgba(var(--oz-violet-light-rgb), 0.1)" }}
    >
      <div
        className="text-xl font-semibold tracking-widest uppercase"
        style={{
          color: "rgba(var(--oz-violet-text-rgb), 0.65)",
          letterSpacing: "0.22em",
        }}
      >
        Quizzard of Oz
      </div>
      {isLoggedIn ? (
        <button
          onClick={handleLogout}
          className="login-btn px-6 py-2 font-medium rounded-lg"
        >
          {displayName}
        </button>
      ) : (
        <div className="relative">
          <LoginButton />
        </div>
      )}
    </header>
  );
}
