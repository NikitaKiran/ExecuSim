import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const token = await result.user.getIdToken();

  return {
    user: result.user,
    token,
  };
}

export async function logoutUser() {
  await signOut(auth);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function getCurrentUserToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
}