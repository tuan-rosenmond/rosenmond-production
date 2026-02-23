import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { auth } from "../firebase";

const ALLOWED_EMAIL = import.meta.env.VITE_WARBOARD_ALLOWED_EMAIL || "tuan.rosenmond@gmail.com";
const provider = new GoogleAuthProvider();

export type AuthState = "loading" | "unauthenticated" | "authenticated";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<AuthState>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setState("unauthenticated");
        return;
      }

      // Validate email matches allowed user
      if (firebaseUser.email !== ALLOWED_EMAIL) {
        setError(`Access denied. ${firebaseUser.email} is not authorized.`);
        await signOut(auth);
        setUser(null);
        setState("unauthenticated");
        return;
      }

      setUser(firebaseUser);
      setError(null);
      setState("authenticated");
    });
    return unsub;
  }, []);

  const login = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return { user, state, error, login, logout };
}
