/**
 * AquaPure Admin — Auth Context
 * Provides Firebase Authentication state for the admin panel.
 * Checks user role === 'admin' from Firestore users collection
 * or designated admin email accounts.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AdminAuthState {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AdminAuthState>({
  user: null,
  isAdmin: false,
  loading: true,
  error: null,
  signIn: async () => ({ success: false }),
  signOut: async () => {},
});

export function useAdminAuth() {
  return useContext(AuthContext);
}

function isDesignatedAdmin(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return (
    normalized === 'admin@aquapure.com' ||
    normalized.startsWith('admin@') ||
    normalized.includes('+admin@') ||
    normalized.endsWith('@aquapure.com')
  );
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        let hasAdminRole = isDesignatedAdmin(fbUser.email);
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists() && userDoc.data().role === 'admin') {
            hasAdminRole = true;
          }
        } catch {
          // If Firestore is locked or offline, fallback to designated email check
        }
        setIsAdmin(hasAdminRole);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const creds = await signInWithEmailAndPassword(auth, email, password);
      let hasAdminRole = isDesignatedAdmin(creds.user.email);

      try {
        const userDoc = await getDoc(doc(db, 'users', creds.user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          hasAdminRole = true;
        } else if (hasAdminRole && (!userDoc.exists() || userDoc.data().role !== 'admin')) {
          // Sync role to Firestore if possible
          await setDoc(doc(db, 'users', creds.user.uid), {
            uid: creds.user.uid,
            email: creds.user.email,
            displayName: 'AquaPure Administrator',
            role: 'admin',
            updatedAt: new Date().toISOString(),
          }, { merge: true }).catch(() => {});
        }
      } catch {
        // If Firestore read fails, rely on designated admin status
      }

      if (!hasAdminRole) {
        await fbSignOut(auth);
        setError('Access denied. This account does not have administrator privileges.');
        setLoading(false);
        return { success: false, error: 'Access denied. Not an admin account.' };
      }

      setUser(creds.user);
      setIsAdmin(true);
      setLoading(false);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
