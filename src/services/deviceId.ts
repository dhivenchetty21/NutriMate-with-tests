import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * A random id created once per install and saved in AsyncStorage. It is the
 * storage key only when nobody is signed in; signed-in users use their uid.
 */

const DEVICE_ID_KEY = 'mealplanner.deviceId.v1';

function generateId(): string {
  // Random UUID-style string; hard to guess, no extra library needed.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

let cachedId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;

  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    cachedId = existing;
    return existing;
  }

  const id = generateId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  cachedId = id;
  return id;
}
