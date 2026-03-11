// AES-256-GCM encryption for sensitive fields (transaction descriptions)
// Uses WebCrypto API - available in Cloudflare Workers
// Backward compatible: unencrypted values (no "enc:" prefix) pass through as-is

const ENC_PREFIX = 'enc:';

// Derive a 256-bit AES key from any passphrase string using SHA-256
async function getKey(passphrase) {
  const encoded = new TextEncoder().encode(passphrase);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

// Encrypt a plaintext string. Returns "enc:<base64>" or original if no key.
export async function encrypt(text, passphrase) {
  if (!text || !passphrase) return text;
  try {
    const key = await getKey(passphrase);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);
    const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

    // Concatenate iv (12 bytes) + ciphertext, then base64-encode
    const combined = new Uint8Array(12 + cipherBuf.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(cipherBuf), 12);
    return ENC_PREFIX + btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.error('encrypt() failed — storing plaintext. Check ENCRYPTION_KEY:', err.message);
    return text; // fallback: store plaintext
  }
}

// Decrypt a value. Returns original plaintext or pass-through for old unencrypted data.
export async function decrypt(text, passphrase) {
  if (!text) return text;
  if (!text.startsWith(ENC_PREFIX)) return text; // old plaintext — pass through
  if (!passphrase) return text; // no key configured
  try {
    const combined = Uint8Array.from(atob(text.slice(ENC_PREFIX.length)), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const key = await getKey(passphrase);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch {
    return text; // decryption failed — return raw value rather than crashing
  }
}
