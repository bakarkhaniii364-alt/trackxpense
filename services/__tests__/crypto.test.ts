import { describe, it, expect } from 'vitest';
import { hashVaultPasscode, verifyVaultPasscode } from '../crypto';

describe('crypto service', () => {
  it('hashes a passcode with randomized salt', async () => {
    const { hash, salt } = await hashVaultPasscode('123456');
    expect(hash).toBeDefined();
    expect(hash.length).toBe(64); // 256 bits = 64 hex chars
    expect(salt).toBeDefined();
    expect(salt.length).toBe(32); // 16 bytes = 32 hex chars
  });

  it('verifies matching passcode successfully', async () => {
    const pin = '894120';
    const { hash, salt } = await hashVaultPasscode(pin);
    const isValid = await verifyVaultPasscode(pin, hash, salt);
    expect(isValid).toBe(true);
  });

  it('rejects incorrect passcode', async () => {
    const pin = '894120';
    const { hash, salt } = await hashVaultPasscode(pin);
    const isWrong = await verifyVaultPasscode('000000', hash, salt);
    expect(isWrong).toBe(false);
  });
});
