import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { loginWithGoogle, logoutUser, subscribeToAuthChanges } from "../lib/auth";

export default function LoginButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      setUser(firebaseUser);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logoutUser();
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Logout failed");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-500/5 px-3 py-2">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt="profile"
            className="h-9 w-9 rounded-full object-cover ring-1 ring-cyan-400/30"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/10 text-sm font-semibold text-cyan-300">
            {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
          </div>
        )}

        <div className="hidden sm:block">
          <p className="max-w-[140px] truncate text-sm font-medium text-white">
            {user.displayName || "Signed in"}
          </p>
          <p className="max-w-[160px] truncate text-xs text-slate-400">
            {user.email}
          </p>
        </div>

        <button
          onClick={handleLogout}
          disabled={loading}
          className="rounded-full border border-cyan-400/20 bg-transparent px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-cyan-300 transition hover:bg-cyan-500/10 disabled:opacity-50"
        >
          {loading ? "Signing out..." : "Logout"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium uppercase tracking-[0.18em] text-cyan-300 transition hover:bg-cyan-500/20 hover:text-cyan-200 disabled:opacity-50"
    >
      {loading ? "Signing in..." : "Sign in"}
    </button>
  );
}