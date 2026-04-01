"use client";

import { useEffect } from "react";
import LoginButton from "@/app/components/login-button/LoginButton";
import UserMenu from "@/app/components/user-menu/UserMenu";
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
      className="relative z-30 flex justify-between items-center px-8 py-6"
      style={{ borderBottom: "1px solid rgba(var(--oz-violet-light-rgb), 0.1)" }}
    >
      <a
        href="/"
        className="text-xl font-semibold tracking-widest uppercase"
        style={{
          color: "rgba(var(--oz-violet-text-rgb), 0.65)",
          letterSpacing: "0.22em",
          textDecoration: "none",
          transition: "color 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(var(--oz-violet-text-rgb), 1)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(var(--oz-violet-text-rgb), 0.65)")}
      >
        Quizzard of Oz
      </a>
      {isLoggedIn ? (
        <UserMenu displayName={displayName} onLogout={handleLogout} />
      ) : (
        <div className="relative">
          <LoginButton />
        </div>
      )}
    </header>
  );
}
