import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import {
  loginWithGoogle,
  logoutUser,
  subscribeToAuthChanges,
} from "../lib/auth";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function LoginButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      setUser(firebaseUser);
      setAvatarLoadFailed(false);
    });

    return () => unsubscribe();
  }, []);

  const normalizePhotoUrl = (photoUrl: string | null) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith("//")) return `https:${photoUrl}`;
    return photoUrl;
  };

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

  if (!user) {
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

  const initial = (user.displayName || user.email || "U").charAt(0).toUpperCase();
  const avatarSrc = normalizePhotoUrl(user.photoURL);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/5 px-2.5 py-1.5 transition hover:bg-cyan-500/10">
          {avatarSrc && !avatarLoadFailed ? (
            <img
              src={avatarSrc}
              alt="profile"
              className="h-7 w-7 rounded-full object-cover ring-1 ring-cyan-400/30"
              referrerPolicy="no-referrer"
              onError={() => setAvatarLoadFailed(true)}
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/10 text-[10px] font-semibold text-cyan-300">
              {initial}
            </div>
          )}

          <span className="hidden sm:block max-w-[90px] truncate text-xs font-medium text-white">
            {user.displayName || "Account"}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-64 border-cyan-400/20 bg-[#0d1f2a] text-white"
      >
        <DropdownMenuLabel className="space-y-1">
          <p className="truncate text-sm font-medium text-white">
            {user.displayName || "Signed in"}
          </p>
          <p className="truncate text-xs font-normal text-slate-400">
            {user.email}
          </p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-cyan-400/10" />

        <DropdownMenuItem
          onClick={handleLogout}
          disabled={loading}
          className="cursor-pointer text-cyan-300 focus:bg-cyan-500/10 focus:text-cyan-200"
        >
          {loading ? "Signing out..." : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}