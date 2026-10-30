/**
 * Firebase's React Native build exports getReactNativePersistence, but its
 * published types leave it out. This declaration adds it so the import type-checks.
 */
import type { Persistence } from 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: unknown): Persistence;
}
