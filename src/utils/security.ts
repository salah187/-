import { LockConfig } from '../types/debt';

const LOCK_STORAGE_KEY = 'dayni_lock_v1';

export const DEFAULT_LOCK_CONFIG: LockConfig = {
  enabled: false,
  pinLength: 4,
  pinHash: '',
  pinSalt: '',
  biometricEnabled: false,
  biometricCredentialId: undefined,
  autoLockIdleMinutes: 5,
  failedAttempts: 0,
  lockedUntil: undefined,
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4);
  return base64ToBytes(padded);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function hashPin(
  pin: string,
  existingSalt?: string
): Promise<{ hash: string; salt: string }> {
  const saltBytes = existingSalt
    ? base64ToBytes(existingSalt)
    : crypto.getRandomValues(new Uint8Array(16));
  const salt = bytesToBase64(saltBytes);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes.buffer as ArrayBuffer,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );
    return {
      hash: bytesToBase64(new Uint8Array(derivedBits)),
      salt,
    };
  }

  // Fallback only if subtle crypto is unavailable in a restricted context
  let acc = 2166136261;
  const input = `${salt}:${pin}:dayni`;
  for (let round = 0; round < 2000; round++) {
    for (let i = 0; i < input.length; i++) {
      acc ^= input.charCodeAt(i) + round;
      acc = Math.imul(acc, 16777619);
    }
  }
  return {
    hash: `fb_${(acc >>> 0).toString(16)}`,
    salt,
  };
}

export async function verifyPin(
  pin: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  if (!salt || !expectedHash) return false;
  const { hash } = await hashPin(pin, salt);
  return constantTimeEqual(hash, expectedHash);
}

export function loadLockConfig(): LockConfig {
  try {
    const raw = localStorage.getItem(LOCK_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LOCK_CONFIG };
    const parsed = JSON.parse(raw) as Partial<LockConfig>;
    return {
      enabled: Boolean(parsed.enabled && parsed.pinHash && parsed.pinSalt),
      pinLength: parsed.pinLength === 6 ? 6 : 4,
      pinHash: typeof parsed.pinHash === 'string' ? parsed.pinHash : '',
      pinSalt: typeof parsed.pinSalt === 'string' ? parsed.pinSalt : '',
      biometricEnabled: Boolean(parsed.biometricEnabled && parsed.biometricCredentialId),
      biometricCredentialId:
        typeof parsed.biometricCredentialId === 'string'
          ? parsed.biometricCredentialId
          : undefined,
      autoLockIdleMinutes:
        typeof parsed.autoLockIdleMinutes === 'number' ? parsed.autoLockIdleMinutes : 5,
      failedAttempts:
        typeof parsed.failedAttempts === 'number' && parsed.failedAttempts >= 0
          ? parsed.failedAttempts
          : 0,
      lockedUntil:
        typeof parsed.lockedUntil === 'number' && parsed.lockedUntil > Date.now()
          ? parsed.lockedUntil
          : undefined,
    };
  } catch {
    return { ...DEFAULT_LOCK_CONFIG };
  }
}

export function saveLockConfig(config: LockConfig): void {
  try {
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage write error
  }
}

export function resetLockConfig(): LockConfig {
  const clean = { ...DEFAULT_LOCK_CONFIG };
  saveLockConfig(clean);
  return clean;
}

export async function checkBiometricSupport(): Promise<boolean> {
  try {
    if (
      typeof window === 'undefined' ||
      typeof PublicKeyCredential === 'undefined' ||
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function'
    ) {
      return false;
    }
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerBiometricCredential(): Promise<string> {
  const available = await checkBiometricSupport();
  if (!available) {
    throw new Error('مستشعر البصمة أو التحقق الحيوي غير متوفر في هذا الجهاز أو المتصفح.');
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'دَيني | Dayni',
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: 'dayni-local-user',
          displayName: 'مستخدم دَيني',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error('لم يتم إكمال تسجيل البصمة.');
    }

    return bytesToBase64Url(new Uint8Array(credential.rawId));
  } catch (err) {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError') {
      throw new Error(
        'تم إلغاء طلب البصمة أو أن بيئة المتصفح الحالية لا تسمح باستخدام البصمة. يمكنك الاعتماد على رمز PIN بأمان.'
      );
    }
    if (name === 'SecurityError') {
      throw new Error('لا يمكن تفعيل البصمة في هذا النطاق. استخدم رمز PIN للحماية.');
    }
    throw new Error(
      err instanceof Error ? err.message : 'تعذر تفعيل البصمة على هذا الجهاز.'
    );
  }
}

export async function verifyBiometricCredential(credentialIdB64Url: string): Promise<boolean> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const rawId = base64UrlToBytes(credentialIdB64Url);

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            type: 'public-key',
            id: rawId.buffer as ArrayBuffer,
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return Boolean(assertion);
  } catch (err) {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError') {
      throw new Error('تم إلغاء التحقق بالبصمة. أدخل رمز PIN للمتابعة.');
    }
    throw new Error('تعذر التحقق بالبصمة، يرجى إدخال رمز PIN.');
  }
}
