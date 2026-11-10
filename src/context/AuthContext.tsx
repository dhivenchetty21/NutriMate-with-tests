import {
  User,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { clearDynamicRecipes } from '../data/recipes';
import { getAuthInstance, isAuthConfigured } from '../services/firebase';
import { setActiveStorageUser } from '../services/storage';

type AuthContextValue = {
  /** True once Firebase is configured (see .env). */
  isAuthConfigured: boolean;
  /** True while the saved session is being restored. */
  isLoading: boolean;
  user: User | null;
  /** Name entered at sign-up. Firebase sets it after the account is created, so it is kept here.
   * as well as on `user`. */
  displayName: string | null;
  error: string | null;
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyAuthError(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: unknown }).code) : '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with that email already exists. Try signing in instead.';
    case 'auth/invalid-email':
      return 'That email address doesn’t look right.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error — check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isAuthConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  // Without Firebase config there is nothing to wait for, so no loading gate.
  const [isLoading, setIsLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;

    const auth = getAuthInstance();
    if (!auth) {
      console.warn('[auth] no auth instance, continuing signed out');
      setIsLoading(false);
      return;
    }

    console.log('[auth] waiting for first auth state');
    // If Firebase never answers, stop waiting and show Login instead of a spinner.
    const failsafe = setTimeout(() => {
      console.warn('[auth] no response after 8s, continuing signed out');
      setIsLoading(false);
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      clearTimeout(failsafe);
      console.log('[auth] state:', nextUser ? 'signed in' : 'signed out');
      setActiveStorageUser(nextUser ? nextUser.uid : null);
      setUser(nextUser);
      setDisplayName(nextUser?.displayName ?? null);
      setIsLoading(false);
    });

    return () => {
      clearTimeout(failsafe);
      unsubscribe();
    };
  }, [configured]);

  async function signUp(name: string, email: string, password: string): Promise<boolean> {
    const auth = getAuthInstance();
    if (!auth) return false;

    setError(null);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) {
        await updateFirebaseProfile(credential.user, { displayName: name.trim() });
        setDisplayName(name.trim());
      }
      return true;
    } catch (err) {
      setError(friendlyAuthError(err));
      return false;
    }
  }

  async function signIn(email: string, password: string): Promise<boolean> {
    const auth = getAuthInstance();
    if (!auth) return false;

    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch (err) {
      setError(friendlyAuthError(err));
      return false;
    }
  }

  async function signOut(): Promise<void> {
    const auth = getAuthInstance();
    if (!auth) return;
    await firebaseSignOut(auth);
    clearDynamicRecipes();
    // The local cache is kept on sign-out. It is stored per user (see storage.ts),
    // so the next account cannot see it and this account's data survives a failed sync.
  }

  function clearError() {
    setError(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthConfigured: configured,
      isLoading,
      user,
      displayName,
      error,
      signUp,
      signIn,
      signOut,
      clearError,
    }),
    [configured, isLoading, user, displayName, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}