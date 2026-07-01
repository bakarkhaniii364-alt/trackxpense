/**
 * TrackXpense Privacy Shield (E2EE Utility)
 * Simplified client-side encryption for sensitive fields.
 */

export const PrivacyShield = {
    // Basic reversible obfuscation for POC. 
    // In production, use SubtleCrypto with PBKDF2 derived keys.
    
    encrypt: (text: string, key: string): string => {
        if (!key || !text) return text;
        try {
            const code = Array.from(text).map((char, i) => 
                String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
            ).join('');
            return `PWS:${btoa(unescape(encodeURIComponent(code)))}`;
        } catch (e) {
            return text;
        }
    },

    decrypt: (cipher: string, key: string): string => {
        if (!key || !cipher || !cipher.startsWith('PWS:')) return cipher;
        try {
            const raw = decodeURIComponent(escape(atob(cipher.substring(4))));
            return Array.from(raw).map((char, i) => 
                String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
            ).join('');
        } catch (e) {
            return cipher;
        }
    },

    isEncrypted: (text: string): boolean => {
        return typeof text === 'string' && text.startsWith('PWS:');
    }
};
