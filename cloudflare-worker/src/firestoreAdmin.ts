/**
 * Small Firestore REST client for the Worker, signed in as a Firebase service
 * account using Web Crypto (the Firebase Admin SDK doesn't run on Workers).
 * Lets the scheduled job refresh the shared tracked items.
 * Needs FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY as
 * Worker secrets. If they are missing, this file is never used.
 */

export interface FirebaseAdminEnv {
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
}

export function isFirebaseAdminConfigured(
  env: FirebaseAdminEnv,
): env is Required<FirebaseAdminEnv> {
  return Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);
}

function base64UrlEncodeBytes(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeString(str: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(str));
}

// Turn escaped "\n" sequences in the private key back into real newlines.
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalised = pem.replace(/\\n/g, '\n');
  const base64 = normalised
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// Reuse the access token for the rest of this run instead of requesting a new one each call.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(env: Required<FirebaseAdminEnv>): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const claims = {
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  };

  const unsigned =
    `${base64UrlEncodeString(JSON.stringify(header))}.` +
    base64UrlEncodeString(JSON.stringify(claims));

  const keyData = pemToArrayBuffer(env.FIREBASE_PRIVATE_KEY);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsigned),
  );

  const jwt = `${unsigned}.${base64UrlEncodeBytes(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`Firebase token exchange failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

// --- Firestore REST value conversion --------------------------------------
// The REST API tags every value by type (stringValue, mapValue, ...). These
// convert between that format and plain JavaScript values.

type FirestoreValue = Record<string, unknown>;

function decodeValue(value: FirestoreValue | undefined): unknown {
  if (!value) return undefined;
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('stringValue' in value) return value.stringValue;
  if ('arrayValue' in value) {
    const values = (value.arrayValue as { values?: FirestoreValue[] })?.values ?? [];
    return values.map(decodeValue);
  }
  if ('mapValue' in value) {
    const mapFields = (value.mapValue as { fields?: Record<string, FirestoreValue> })?.fields ?? {};
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(mapFields)) {
      out[key] = decodeValue(v);
    }
    return out;
  }
  return undefined;
}

function encodeValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } };
  }
  if (typeof value === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      fields[key] = encodeValue(v);
    }
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

export type FirestoreDocument = {
  /** Document id (a user's uid for the households collection). */
  id: string;
  fields: Record<string, unknown>;
};

/** Lists every document in a collection as plain objects, following pages. */
export async function listCollection(
  env: Required<FirebaseAdminEnv>,
  collection: string,
): Promise<FirestoreDocument[]> {
  const token = await getAccessToken(env);
  const base = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}`;

  const docs: FirestoreDocument[] = [];
  let pageToken: string | undefined;
  let safety = 0;

  do {
    const url = new URL(base);
    url.searchParams.set('pageSize', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      throw new Error(`Firestore list failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as {
      documents?: { name: string; fields?: Record<string, FirestoreValue> }[];
      nextPageToken?: string;
    };

    for (const doc of data.documents ?? []) {
      const id = doc.name.split('/').pop() ?? '';
      const fields: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(doc.fields ?? {})) {
        fields[key] = decodeValue(value);
      }
      docs.push({ id, fields });
    }

    pageToken = data.nextPageToken;
    safety += 1;
  } while (pageToken && safety < 20);

  return docs;
}

/** Updates only the given fields of one document. */
export async function patchDocumentFields(
  env: Required<FirebaseAdminEnv>,
  collection: string,
  docId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const token = await getAccessToken(env);
  const url = new URL(
    `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`,
  );
  for (const path of Object.keys(fields)) {
    url.searchParams.append('updateMask.fieldPaths', path);
  }

  const encodedFields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(fields)) {
    encodedFields[key] = encodeValue(value);
  }

  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: encodedFields }),
  });

  if (!res.ok) {
    throw new Error(`Firestore patch failed for ${docId}: ${res.status} ${await res.text()}`);
  }
}
