/**
 * Browser-side AES-GCM encryption for API keys stored in LocalStorage.
 * Uses Web Crypto API — keys are never stored in plaintext.
 */

const ALGO = 'AES-GCM';
const KEY_USAGE: KeyUsage[] = ['encrypt', 'decrypt'];

// Derive a stable CryptoKey from a passphrase (device-bound fingerprint)
async function deriveKey(): Promise<CryptoKey> {
  // Use a device-stable fingerprint as the passphrase
  const passphrase = `beaverkit-${navigator.userAgent}-${location.origin}`;
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('beaverkit-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGO, length: 256 },
    false,
    KEY_USAGE
  );
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded);
  // Pack iv + ciphertext as base64
  const packed = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  packed.set(iv, 0);
  packed.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...packed));
}

export async function decrypt(encoded: string): Promise<string> {
  const key = await deriveKey();
  const packed = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const iv = packed.slice(0, 12);
  const ciphertext = packed.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}
