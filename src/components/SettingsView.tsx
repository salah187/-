import React, { useRef } from 'react';
import {
  Clock,
  Download,
  Fingerprint,
  KeyRound,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { LockConfig, ThemeMode } from '../types/debt';

interface SettingsViewProps {
  theme: ThemeMode;
  peopleCount: number;
  debtsCount: number;
  paymentsCount: number;
  lockConfig: LockConfig;
  biometricSupported: boolean;
  biometricBusy: boolean;
  onToggleTheme: (nextTheme: ThemeMode) => void;
  onRequestEnablePin: () => void;
  onRequestChangePin: () => void;
  onRequestDisablePin: () => void;
  onToggleBiometric: () => void;
  onToggleAutoLockIdle: () => void;
  onLockNow: () => void;
  onExportBackup: () => void;
  onSelectBackupFile: (file: File) => void;
  onRequestClearAll: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  peopleCount,
  debtsCount,
  paymentsCount,
  lockConfig,
  biometricSupported,
  biometricBusy,
  onToggleTheme,
  onRequestEnablePin,
  onRequestChangePin,
  onRequestDisablePin,
  onToggleBiometric,
  onToggleAutoLockIdle,
  onLockNow,
  onExportBackup,
  onSelectBackupFile,
  onRequestClearAll,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectBackupFile(file);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          الإعدادات والنسخ الاحتياطي
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          تخصيص المظهر وحماية التطبيق برمز PIN والبصمة وإدارة النسخ الاحتياطية المحلية
        </p>
      </div>

      {/* Appearance / Theme */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          المظهر والعملة
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              وضع العرض
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              اختر بين الوضع النهاري المريح أو الوضع الليلي الداكن
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-start sm:self-center">
            <button
              type="button"
              onClick={() => onToggleTheme('light')}
              className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
                theme === 'light'
                  ? 'bg-white text-[#0F2547] shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>نهاري</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleTheme('dark')}
              className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-900 text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>ليلي</span>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-300">العملة المعتمدة</span>
          <span className="font-bold text-[#0F2547] dark:text-sky-300">
            الدينار الجزائري (DZD · د.ج)
          </span>
        </div>
      </section>

      {/* Security & App Lock */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F2547]/10 dark:bg-sky-950/60 text-[#0F2547] dark:text-sky-300 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                الأمان وقفل التطبيق
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {lockConfig.enabled
                  ? `القفل مفعل برمز PIN من ${lockConfig.pinLength} أرقام`
                  : 'احمِ بياناتك المالية برمز PIN (4 أو 6 أرقام) مع دعم البصمة'}
              </p>
            </div>
          </div>

          {lockConfig.enabled ? (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onLockNow}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0F2547] hover:bg-[#193766] dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>قفل الآن</span>
              </button>
              <button
                type="button"
                onClick={onRequestDisablePin}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-red-200 dark:border-red-900/70 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition-colors whitespace-nowrap"
              >
                تعطيل القفل
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onRequestEnablePin}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#0F2547] hover:bg-[#193766] dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap self-start sm:self-center"
            >
              <KeyRound className="w-4 h-4" />
              <span>تفعيل قفل التطبيق</span>
            </button>
          )}
        </div>

        {lockConfig.enabled && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            {/* Change PIN */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  رمز الدخول (PIN)
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  الرمز الحالي مكون من {lockConfig.pinLength} أرقام ومشفر محلياً
                </div>
              </div>
              <button
                type="button"
                onClick={onRequestChangePin}
                className="min-h-[40px] px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors self-start sm:self-center whitespace-nowrap"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>تغيير رمز PIN</span>
              </button>
            </div>

            {/* Biometric Quick Unlock */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Fingerprint className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    الفتح السريع بالبصمة / Face ID
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {biometricSupported
                      ? lockConfig.biometricEnabled
                        ? 'مفعلة على هذا الجهاز بجانب رمز PIN الأساسي'
                        : 'متاحة على هذا الجهاز كخيار فتح سريع مع بقاء رمز PIN احتياطياً'
                      : 'غير مدعومة في المتصفح الحالي؛ يمكنك الاعتماد على رمز PIN'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={biometricBusy || (!biometricSupported && !lockConfig.biometricEnabled)}
                onClick={onToggleBiometric}
                className={`min-h-[40px] px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors self-start sm:self-center whitespace-nowrap disabled:opacity-50 ${
                  lockConfig.biometricEnabled
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {biometricBusy
                  ? 'جاري التحقق...'
                  : lockConfig.biometricEnabled
                  ? 'مفعلة · إيقاف'
                  : 'تفعيل البصمة'}
              </button>
            </div>

            {/* Idle Auto-Lock (5 minutes) */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Clock className="w-5 h-5 text-[#0F2547] dark:text-sky-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    القفل التلقائي بعد 5 دقائق من الخمول
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    يقفل التطبيق تلقائياً عند تركه دون استخدام لمدة 5 دقائق
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleAutoLockIdle}
                className={`min-h-[40px] px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors self-start sm:self-center whitespace-nowrap ${
                  lockConfig.autoLockIdleMinutes > 0
                    ? 'bg-[#0F2547] dark:bg-sky-600 text-white'
                    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {lockConfig.autoLockIdleMinutes > 0 ? 'مفعل (5 دقائق)' : 'معطل'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Storage & Privacy */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              التخزين المحلي والخصوصية
            </h2>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 mt-1">
              جميع بياناتك محفوظة محلياً داخل متصفحك على هذا الجهاز (IndexedDB) ولا يتم إرسال أي معلومات مالية إلى خوادم خارجية.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {peopleCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              الأشخاص
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {debtsCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              الديون
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {paymentsCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              الدفعات
            </div>
          </div>
        </div>
      </section>

      {/* Backup & Restore */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          النسخ الاحتياطي والاستعادة
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          احتفظ بنسخة احتياطية بصيغة JSON لنقل بياناتك إلى هاتف آخر أو استعادتها لاحقاً.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onExportBackup}
            className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#0F2547] hover:bg-[#193766] dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>تصدير نسخة احتياطية</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[46px] px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold inline-flex items-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>استيراد نسخة احتياطية</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="sr-only"
          />
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 p-6 shadow-xs space-y-3">
        <h2 className="text-base font-bold text-red-700 dark:text-red-400">
          إعادة ضبط البيانات
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          حذف جميع الأشخاص والديون وسجل الدفعات نهائياً من هذا الجهاز. يُنصح بتصدير نسخة احتياطية قبل الحذف.
        </p>
        <button
          type="button"
          onClick={onRequestClearAll}
          disabled={peopleCount === 0 && debtsCount === 0 && paymentsCount === 0}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>مسح جميع البيانات</span>
        </button>
      </section>
    </div>
  );
};
