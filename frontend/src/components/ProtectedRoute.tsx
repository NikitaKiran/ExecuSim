import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { Navigate } from "react-router-dom";
import { subscribeToAuthChanges } from "../lib/auth";

type ProtectedRouteProps = {
  children: JSX.Element;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ padding: "20px" }}>Checking authentication...</div>;
  }

  if (!user) {
        return (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-8 text-center">
              <h2 className="mb-2 text-2xl font-semibold text-white">Login required</h2>
              <p className="text-slate-300">
                You need to sign in to access this page.
              </p>
            </div>
          </div>
        );
  }

  return children;
}