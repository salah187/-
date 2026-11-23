import React, { useCallback, useEffect, useState } from 'react';
import { Delete, Fingerprint, Lock, ShieldAlert } from 'lucide-react';
import { LockConfig } from '../types/debt';
import { verifyBiometricCredential, verifyPin } from '../utils/security';

interface LockScreenProps {
  lockConfig: LockConfig;
  onUnlockSuccess: () => void;
  onFailedAttempt: (nextAttempts: number, lockedUntil?: number) => void;
  onRequestForgotPinReset: () => void;
}

const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 30 * 1000;

export const LockScreen: React.FC<LockScreenProps> = ({
  lockConfig,
  onUnlockSuccess,
  onFailedAttempt,
  onRequestForgotPinReset,
}) => {
  const [entered, setEntered] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const pinLen = lockConfig.pinLength;

  // Cooldown countdown ticker
  useEffect(() => {
    const updateRemaining = () => {
      if (!lockConfig.lockedUntil) {
        setRemainingSeconds(0);
        return;
      }
      const diff = Math.ceil((lockConfig.lockedUntil - Date.now()) / 1000);
      setRemainingSeconds(diff > 0 ? diff : 0);
    };
    updateRemaining();
    const timer = setInterval(updateRemaining, 500);
    return () => clearInterval(timer);
  }, [lockConfig.lockedUntil]);

  const isCoolingDown = remainingSeconds > 0;

  const submitPin = useCallback(
    async (pinValue: string) => {
      if (verifying || isCoolingDown) return;
      setVerifying(true);
      setError(null);

      try {
        const ok = await verifyPin(
          pinValue,
          lockConfig.pinSalt,
          lockConfig.pinHash
        );
        if (ok) {
          setEntered('');
          onUnlockSuccess();
        } else {
          const nextAttempts = lockConfig.failedAttempts + 1;
          if (nextAttempts >= MAX_ATTEMPTS) {
            const until = Date.now() + COOLDOWN_MS;
            onFailedAttempt(0, until);
            setError('تم إدخال رمز غير صحيح 5 مرات. يرجى الانتظار 30 ثانية.');
          } else {
            onFailedAttempt(nextAttempts, undefined);
            setError(
              `رمز PIN غير صحيح (المحاولات المتبقية: ${MAX_ATTEMPTS - nextAttempts}).`
            );
          }
          setEntered('');
        }
      } finally {
        setVerifying(false);
      }
    },
    [
      verifying,
      isCoolingDown,
      lockConfig.pinSalt,
      lockConfig.pinHash,
      lockConfig.failedAttempts,
      onUnlockSuccess,
      onFailedAttempt,
    ]
  );

  const handleDigit = useCallback(
    (digit: string) => {
      if (verifying || isCoolingDown) return;
      setError(null);
      setEntered((prev) => {
        if (prev.length >= pinLen) return prev;
        const next = prev + digit;
        if (next.length === pinLen) {
          void submitPin(next);
        }
        return next;
      });
    },
    [pinLen, verifying, isCoolingDown, submitPin]
  );

  const handleBackspace = useCallback(() => {
    if (verifying || isCoolingDown) return;
    setError(null);
    setEntered((prev) => prev.slice(0, -1));
  }, [verifying, isCoolingDown]);

  // Support physical keyboard entry on desktop
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDigit, handleBackspace]);

  const handleBiometricUnlock = async () => {
    if (!lockConfig.biometricEnabled || !lockConfig.biometricCredentialId || biometricBusy) {
      return;
    }
    setBiometricBusy(true);
    setError(null);
    try {
      const ok = await verifyBiometricCredential(lockConfig.biometricCredentialId);
      if (ok) {
        onUnlockSuccess();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر التحقق بالبصمة، أدخل رمز PIN.'
      );
    } finally {
      setBiometricBusy(false);
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-8 flex flex-col items-center">
        {/* Lock Brand Header */}
        <div className="w-14 h-14 rounded-2xl bg-[#0F2547] dark:bg-sky-600 text-white flex items-center justify-center shadow-sm">
          <Lock className="w-7 h-7" />
        </div>

        <h1 className="mt-4 text-xl font-bold text-[#0F2547] dark:text-white">
          دَيني | Dayni
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 text-center">
          أدخل رمز PIN المكون من {pinLen} أرقام لفتح التطبيق
        </p>

        {/* PIN Dot Indicators */}
        <div
          className="mt-6 flex items-center justify-center gap-3.5"
          dir="ltr"
          aria-label={`تم إدخال ${entered.length} من ${pinLen} أرقام`}
        >
          {Array.from({ length: pinLen }).map((_, idx) => {
            const filled = idx < entered.length;
            return (
              <span
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  filled
                    ? 'bg-[#0F2547] dark:bg-sky-400 scale-110'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Error / Cooldown Message */}
        <div className="min-h-[38px] mt-4 flex items-center justify-center text-center">
          {isCoolingDown ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span className="tabular-nums">
                محاولات كثيرة خاطئة · انتظر {remainingSeconds} ثانية
              </span>
            </div>
          ) : error ? (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              البيانات محمية محلياً على جهازك
            </span>
          )}
        </div>

        {/* Numeric Keypad */}
        <div
          className="mt-3 w-full grid grid-cols-3 gap-3"
          dir="ltr"
        >
          {digits.map((d) => (
            <button
              key={d}
              type="button"
              disabled={isCoolingDown || verifying}
              onClick={() => handleDigit(d)}
              className="min-h-[58px] rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-[0.97] dark:bg-slate-800 dark:hover:bg-slate-700 text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums transition-all disabled:opacity-40"
            >
              {d}
            </button>
          ))}

          {/* Bottom-left: Biometric button (if enabled) or spacer */}
          {lockConfig.biometricEnabled && lockConfig.biometricCredentialId ? (
            <button
              type="button"
              disabled={biometricBusy}
              onClick={handleBiometricUnlock}
              aria-label="الفتح بالبصمة"
              title="الفتح بالبصمة"
              className="min-h-[58px] rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center transition-colors disabled:opacity-40"
            >
              <Fingerprint className="w-6 h-6" />
            </button>
          ) : (
            <div />
          )}

          {/* Zero */}
          <button
            type="button"
            disabled={isCoolingDown || verifying}
            onClick={() => handleDigit('0')}
            className="min-h-[58px] rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-[0.97] dark:bg-slate-800 dark:hover:bg-slate-700 text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums transition-all disabled:opacity-40"
          >
            0
          </button>

          {/* Backspace */}
          <button
            type="button"
            disabled={isCoolingDown || verifying || entered.length === 0}
            onClick={handleBackspace}
            aria-label="مسح رقم"
            className="min-h-[58px] rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Biometric Text CTA */}
        {lockConfig.biometricEnabled && lockConfig.biometricCredentialId && (
          <button
            type="button"
            disabled={biometricBusy}
            onClick={handleBiometricUnlock}
            className="mt-4 min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 inline-flex items-center gap-2 transition-colors"
          >
            <Fingerprint className="w-4 h-4" />
            <span>{biometricBusy ? 'جاري التحقق...' : 'استخدام البصمة للفتح السريع'}</span>
          </button>
        )}

        {/* Forgot PIN */}
        <button
          type="button"
          onClick={onRequestForgotPinReset}
          className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 underline underline-offset-4 transition-colors"
        >
          نسيت رمز PIN؟
        </button>
      </div>
    </div>
  );
};
