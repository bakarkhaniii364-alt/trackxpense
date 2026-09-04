/**
 * TrackXpense Cryptographic Engine
 * Enterprise-grade client-side encryption using the Web Cryptography API (SubtleCrypto).
 * - AES-GCM 256-bit authenticated encryption with randomized 96-bit IV
 * - PBKDF2 key derivation (SHA-256, 100,000 iterations, 128-bit cryptographically secure salt)
 * - Salted PBKDF2-SHA256 vault passcode hashing with timing-safe comparison
 * - Universal runtime support (Browser, Electron, Capacitor, Node/Vitest)
 */

// Universal WebCrypto resolver
function getWebCrypto(): Crypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) return globalThis.crypto;
  if (typeof window !== 'undefined' && window.crypto) return window.crypto;
  throw new Error('Web Cryptography API is unavailable in this environment');
}

// Helper: Convert Uint8Array to Hex string
function toHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: Convert Hex string to Uint8Array
function fromHex(hex: string): Uint8Array {
  const cleanHex = hex.trim();
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Derive an AES-GCM CryptoKey from a passphrase and salt using PBKDF2
async function deriveKey(passphrase: string, salt: Uint8Array, usage: KeyUsage[]): Promise<CryptoKey> {
  const cryptoObj = getWebCrypto();
  const enc = new TextEncoder();
  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    usage
  );
}

export const PrivacyShield = {
  /**
   * Encrypt text with AES-GCM-256 and PBKDF2.
   * Returns formatted ciphertext: PWS2:<salt_hex>:<iv_hex>:<ciphertext_hex>
   */
  encrypt: async (text: string, key: string): Promise<string> => {
    if (!key || !text) return text;
    try {
      const cryptoObj = getWebCrypto();
      if (!cryptoObj?.subtle) {
        return text;
      }
      const salt = cryptoObj.getRandomValues(new Uint8Array(16));
      const iv = cryptoObj.getRandomValues(new Uint8Array(12));
      const cryptoKey = await deriveKey(key, salt, ['encrypt']);

      const encodedText = new TextEncoder().encode(text);
      const ciphertextBuffer = await cryptoObj.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encodedText
      );

      const ciphertext = new Uint8Array(ciphertextBuffer);
      return `PWS2:${toHex(salt)}:${toHex(iv)}:${toHex(ciphertext)}`;
    } catch (err) {
      console.warn('PrivacyShield encryption failed:', err);
      return text;
    }
  },

  /**
   * Decrypt ciphertext.
   * Handles modern PWS2 (AES-GCM-256) and legacy PWS: (XOR) gracefully.
   */
  decrypt: async (cipher: string, key: string): Promise<string> => {
    if (!key || !cipher) return cipher;

    // 1. Handle modern AES-GCM-256 format
    if (cipher.startsWith('PWS2:')) {
      try {
        const parts = cipher.split(':');
        if (parts.length !== 4) return cipher;

        const salt = fromHex(parts[1]);
        const iv = fromHex(parts[2]);
        const ciphertext = fromHex(parts[3]);

        const cryptoObj = getWebCrypto();
        const cryptoKey = await deriveKey(key, salt, ['decrypt']);
        const decryptedBuffer = await cryptoObj.subtle.decrypt(
          { name: 'AES-GCM', iv: iv as any },
          cryptoKey,
          ciphertext as any
        );

        return new TextDecoder().decode(decryptedBuffer);
      } catch (err) {
        console.warn('PrivacyShield AES-GCM decryption failed, key may be incorrect:', err);
        return cipher;
      }
    }

    // 2. Handle legacy XOR format for backward compatibility
    if (cipher.startsWith('PWS:')) {
      try {
        const raw = decodeURIComponent(escape(atob(cipher.substring(4))));
        return Array.from(raw).map((char, i) => 
          String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
        ).join('');
      } catch (e) {
        return cipher;
      }
    }

    return cipher;
  },

  /**
   * Check if a string is encrypted with either modern or legacy format
   */
  isEncrypted: (text: string): boolean => {
    return typeof text === 'string' && (text.startsWith('PWS2:') || text.startsWith('PWS:'));
  }
};

/**
 * Vault Passcode Cryptographic Services
 * Secures the optional device-level lock with PBKDF2-SHA256.
 */
export async function hashVaultPasscode(passcode: string, existingSaltHex?: string): Promise<{ hash: string; salt: string }> {
  const cryptoObj = getWebCrypto();
  const salt = existingSaltHex 
    ? fromHex(existingSaltHex) 
    : cryptoObj.getRandomValues(new Uint8Array(16));

  const enc = new TextEncoder();
  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    enc.encode(passcode),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const hashBits = await cryptoObj.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return {
    hash: toHex(new Uint8Array(hashBits)),
    salt: toHex(salt)
  };
}

/**
 * Timing-safe constant-time string comparison.
 * Prevents timing side-channel attacks by not short-circuiting on mismatch.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verify input passcode against stored hash.
 */
export async function verifyVaultPasscode(
  inputPasscode: string, 
  storedHash: string, 
  saltHex?: string
): Promise<boolean> {
  if (!inputPasscode || !storedHash || !saltHex) return false;

  try {
    const { hash } = await hashVaultPasscode(inputPasscode, saltHex);
    return constantTimeCompare(hash, storedHash);
  } catch {
    return false;
  }
}
