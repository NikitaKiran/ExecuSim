import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { Navigate } from "react-router-dom";
import { subscribeToAuthChanges } from "../lib/auth";
import { toast } from "sonner";

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
    toast.error("Please log in to access this page.");  // <-- added
    return <Navigate to="/" replace />;                 // <-- changed
  }

  return children;
}