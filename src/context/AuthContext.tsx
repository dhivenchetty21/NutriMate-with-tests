// Login state: sign up, sign in and sign out with Firebase Auth.
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
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
  /** True once Firebase has been pointed at a real project (see .env). */
  isAuthConfigured: boolean;
  /** True while the initial sign-in state is still being resolved. */
  isLoading: boolean;
  user: User | null;
  /** Name entered at sign-up. Kept separately because Firebase saves it after
   * the account is created, so `user.displayName` is still empty at first. */
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
  // Without Firebase there is no sign-in state to wait for.
  const [isLoading, setIsLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;

    const auth = getAuthInstance();
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setActiveStorageUser(nextUser ? nextUser.uid : null);
      setUser(nextUser);
      setDisplayName(nextUser?.displayName ?? null);
      setIsLoading(false);
    });

    return unsubscribe;
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
    // The local copy is kept on purpose: it is stored per account, and wiping
    // it made a failed cloud read look like a new account (onboarding again).
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
