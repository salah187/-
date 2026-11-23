import React, { useEffect, useState } from 'react';
import { Delete, Lock, X } from 'lucide-react';
import { PinLength } from '../types/debt';
import { hashPin, verifyPin } from '../utils/security';

export type PinModalMode = 'setup' | 'change' | 'verify';

interface PinSetupModalProps {
  open: boolean;
  mode: PinModalMode;
  title?: string;
  subtitle?: string;
  currentPinLength?: PinLength;
  currentSalt?: string;
  currentHash?: string;
  onClose: () => void;
  onCompleteSetup?: (payload: {
    pinLength: PinLength;
    pinHash: string;
    pinSalt: string;
  }) => Promise<void> | void;
  onCompleteVerify?: () => Promise<void> | void;
}

type Step = 'verify_old' | 'choose_and_enter' | 'confirm_new';

export const PinSetupModal: React.FC<PinSetupModalProps> = ({
  open,
  mode,
  title,
  subtitle,
  currentPinLength = 4,
  currentSalt = '',
  currentHash = '',
  onClose,
  onCompleteSetup,
  onCompleteVerify,
}) => {
  const [step, setStep] = useState<Step>('choose_and_enter');
  const [pinLength, setPinLength] = useState<PinLength>(currentPinLength);
  const [digitsInput, setDigitsInput] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(mode === 'setup' ? 'choose_and_enter' : 'verify_old');
      setPinLength(currentPinLength);
      setDigitsInput('');
      setFirstPin('');
      setError(null);
      setBusy(false);
    }
  }, [open, mode, currentPinLength]);

  const activeTargetLength: PinLength =
    step === 'verify_old' ? currentPinLength : pinLength;

  const processCompletedEntry = async (val: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      if (step === 'verify_old') {
        const valid = await verifyPin(val, currentSalt, currentHash);
        if (!valid) {
          setError('رمز PIN الحالي غير صحيح.');
          setDigitsInput('');
          setBusy(false);
          return;
        }
        if (mode === 'verify') {
          if (onCompleteVerify) await onCompleteVerify();
          onClose();
          return;
        }
        setDigitsInput('');
        setStep('choose_and_enter');
        setBusy(false);
        return;
      }

      if (step === 'choose_and_enter') {
        setFirstPin(val);
        setDigitsInput('');
        setStep('confirm_new');
        setBusy(false);
        return;
      }

      if (step === 'confirm_new') {
        if (val !== firstPin) {
          setError('الرمزان غير متطابقين. حاول مرة أخرى.');
          setDigitsInput('');
          setFirstPin('');
          setStep('choose_and_enter');
          setBusy(false);
          return;
        }
        const { hash, salt } = await hashPin(val);
        if (onCompleteSetup) {
          await onCompleteSetup({ pinLength, pinHash: hash, pinSalt: salt });
        }
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.');
      setDigitsInput('');
      setBusy(false);
    }
  };

  const handleDigit = (d: string) => {
    if (busy) return;
    setError(null);
    if (digitsInput.length >= activeTargetLength) return;
    const next = digitsInput + d;
    setDigitsInput(next);
    if (next.length === activeTargetLength) {
      void processCompletedEntry(next);
    }
  };

  const handleBackspace = () => {
    if (busy) return;
    setError(null);
    setDigitsInput((prev) => prev.slice(0, -1));
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!open) return null;

  const heading =
    title ??
    (mode === 'setup'
      ? 'إعداد رمز PIN لقفل التطبيق'
      : mode === 'change'
      ? 'تغيير رمز PIN'
      : 'التحقق من رمز PIN');

  const promptText =
    step === 'verify_old'
      ? subtitle ?? `أدخل رمز PIN الحالي (${currentPinLength} أرقام)`
      : step === 'choose_and_enter'
      ? `أدخل رمز PIN الجديد (${pinLength} أرقام)`
      : `أعد إدخال رمز PIN الجديد للتأكيد (${pinLength} أرقام)`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-setup-title"
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 sm:hidden" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-[#0F2547] dark:text-sky-400" />
            <h2
              id="pin-setup-title"
              className="text-base font-bold text-slate-900 dark:text-slate-100"
            >
              {heading}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          {/* PIN Length Selector when choosing a new PIN */}
          {step === 'choose_and_enter' && (
            <div className="mb-5 w-full">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 text-center mb-2">
                اختر طول رمز PIN
              </div>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setPinLength(4);
                    setDigitsInput('');
                    setError(null);
                  }}
                  className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors ${
                    pinLength === 4
                      ? 'bg-white dark:bg-slate-900 text-[#0F2547] dark:text-sky-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  4 أرقام
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPinLength(6);
                    setDigitsInput('');
                    setError(null);
                  }}
                  className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors ${
                    pinLength === 6
                      ? 'bg-white dark:bg-slate-900 text-[#0F2547] dark:text-sky-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  6 أرقام
                </button>
              </div>
            </div>
          )}

          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 text-center">
            {promptText}
          </p>

          {/* Dots */}
          <div className="mt-5 flex items-center justify-center gap-3.5" dir="ltr">
            {Array.from({ length: activeTargetLength }).map((_, idx) => {
              const filled = idx < digitsInput.length;
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

          <div className="min-h-[28px] mt-3 flex items-center justify-center">
            {error && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 text-center">
                {error}
              </p>
            )}
          </div>

          {/* Numeric Keypad */}
          <div className="mt-2 w-full max-w-xs grid grid-cols-3 gap-2.5" dir="ltr">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                disabled={busy}
                onClick={() => handleDigit(d)}
                className="min-h-[54px] rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-[0.97] dark:bg-slate-800 dark:hover:bg-slate-700 text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums transition-all"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[54px] rounded-2xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleDigit('0')}
              className="min-h-[54px] rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-[0.97] dark:bg-slate-800 dark:hover:bg-slate-700 text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums transition-all"
            >
              0
            </button>
            <button
              type="button"
              disabled={busy || digitsInput.length === 0}
              onClick={handleBackspace}
              aria-label="مسح رقم"
              className="min-h-[54px] rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors disabled:opacity-40"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
