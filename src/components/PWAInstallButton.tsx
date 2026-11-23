import React, { useState } from 'react';
import { CheckCircle2, Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'card';
  onInstalledToast?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  onInstalledToast,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  const handleActionClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok && onInstalledToast) {
        onInstalledToast();
      }
      return;
    }
    setShowGuideModal(true);
  };

  if (variant === 'compact') {
    if (isInstalled) return null;
    if (!isInstallable && !isIOS) return null;

    return (
      <>
        <button
          type="button"
          onClick={handleActionClick}
          className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0F2547] dark:text-sky-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>تثبيت التطبيق</span>
        </button>

        <InstallGuideModal
          open={showGuideModal}
          isIOS={isIOS}
          onClose={() => setShowGuideModal(false)}
        />
      </>
    );
  }

  // Settings Card Variant
  return (
    <>
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F2547]/10 dark:bg-sky-950/60 text-[#0F2547] dark:text-sky-300 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                تثبيت التطبيق على الهاتف (PWA)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {isInstalled
                  ? 'التطبيق مثبت ويعمل الآن كتطبيق مستقل بدون شريط المتصفح ومع دعم العمل بدون إنترنت.'
                  : 'ثبّت دَيني على شاشة هاتفك ليفتح كتطبيق مستقل بشاشة كاملة بدون شريط المتصفح ويعمل حتى بدون إنترنت.'}
              </p>
            </div>
          </div>

          {isInstalled ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              <span>مثبت على الجهاز</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleActionClick}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#0F2547] hover:bg-[#193766] dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
            >
              <Download className="w-4 h-4" />
              <span>
                {isInstallable ? 'تثبيت التطبيق الآن' : 'طريقة التثبيت على الهاتف'}
              </span>
            </button>
          )}
        </div>
      </section>

      <InstallGuideModal
        open={showGuideModal}
        isIOS={isIOS}
        onClose={() => setShowGuideModal(false)}
      />
    </>
  );
};

interface InstallGuideModalProps {
  open: boolean;
  isIOS: boolean;
  onClose: () => void;
}

const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  open,
  isIOS,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-guide-title"
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3
            id="pwa-guide-title"
            className="text-base font-bold text-slate-900 dark:text-slate-100"
          >
            {isIOS
              ? 'تثبيت دَيني على iPhone / iPad'
              : 'تثبيت دَيني كتطبيق مستقل على الهاتف'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isIOS ? (
          <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed list-decimal list-inside">
            <li>
              تأكد من فتح رابط التطبيق مباشرة في متصفح <strong>Safari</strong>.
            </li>
            <li className="flex items-start gap-2">
              <span>
                اضغط على زر <strong>المشاركة</strong>{' '}
                <Share className="w-4 h-4 inline text-[#0F2547] dark:text-sky-400" />{' '}
                في شريط Safari السفلي.
              </span>
            </li>
            <li>
              مرر للأسفل واختر <strong>إضافة إلى الصفحة الرئيسية (Add to Home Screen)</strong> ثم اضغط <strong>إضافة</strong>.
            </li>
          </ol>
        ) : (
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              لتثبيت التطبيق كأيقونة مستقلة في قائمة تطبيقات هاتفك بدون شريط المتصفح:
            </p>
            <ol className="space-y-2 list-decimal list-inside">
              <li>
                افتح رابط التطبيق في نافذة متصفح مستقلة عبر <strong>Google Chrome</strong> (على Android) أو <strong>Safari</strong> (على iPhone).
              </li>
              <li>
                على Android: افتح قائمة <strong>⋮</strong> ثم اختر{' '}
                <strong>تثبيت التطبيق (Install app)</strong>.
              </li>
              <li>
                سيقوم النظام بتثبيت دَيني في قائمة التطبيقات كأي تطبيق من المتجر وسيعمل حتى بدون إنترنت.
              </li>
            </ol>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] rounded-xl bg-[#0F2547] hover:bg-[#193766] dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-sm font-semibold transition-colors"
        >
          حسناً، فهمت
        </button>
      </div>
    </div>
  );
};
