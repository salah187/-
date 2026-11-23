import React, { useEffect, useState } from 'react';
import { Camera, Trash2, X } from 'lucide-react';
import { Person } from '../types/debt';
import { compressImageToDataURL } from '../utils/format';
import { Avatar } from './Avatar';

interface PersonFormModalProps {
  open: boolean;
  editingPerson: Person | null;
  onClose: () => void;
  onSave: (data: { name: string; phone?: string; avatarDataUrl?: string }) => Promise<void> | void;
}

export const PersonFormModal: React.FC<PersonFormModalProps> = ({
  open,
  editingPerson,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editingPerson?.name ?? '');
      setPhone(editingPerson?.phone ?? '');
      setAvatarDataUrl(editingPerson?.avatarDataUrl);
      setError(null);
      setSubmitting(false);
    }
  }, [open, editingPerson]);

  if (!open) return null;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToDataURL(file, 240);
      setAvatarDataUrl(compressed);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل الصورة');
    }
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('يرجى إدخال الاسم الكامل للشخص.');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        name: trimmedName,
        phone: phone.trim() || undefined,
        avatarDataUrl,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ البيانات');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="person-modal-title"
    >
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 sm:hidden" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2
            id="person-modal-title"
            className="text-lg font-bold text-slate-900 dark:text-slate-100"
          >
            {editingPerson ? 'تعديل بيانات الشخص' : 'إضافة شخص جديد'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Optional Avatar */}
          <div className="flex items-center gap-4">
            <Avatar name={name || 'شخص'} src={avatarDataUrl} size="xl" tone="navy" />
            <div className="flex flex-wrap items-center gap-2">
              <label className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer inline-flex items-center gap-2 transition-colors">
                <Camera className="w-4 h-4" />
                <span>{avatarDataUrl ? 'تغيير الصورة' : 'صورة شخصية (اختياري)'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="sr-only"
                />
              </label>
              {avatarDataUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarDataUrl(undefined)}
                  className="min-h-[44px] px-3 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 inline-flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>إزالة</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="person-name-input"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
            >
              الاسم الكامل <span className="text-red-500">*</span>
            </label>
            <input
              id="person-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: أمين بن علي"
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-base focus:outline-none focus:ring-2 focus:ring-[#0F2547] dark:focus:ring-sky-500"
            />
          </div>

          <div>
            <label
              htmlFor="person-phone-input"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
            >
              رقم الهاتف (اختياري)
            </label>
            <input
              id="person-phone-input"
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0550 12 34 56"
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-base text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F2547] dark:focus:ring-sky-500"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[46px] px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[46px] px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#0F2547] hover:bg-[#193766] dark:bg-sky-600 dark:hover:bg-sky-500 text-white transition-colors disabled:opacity-50"
            >
              {submitting ? 'جاري الحفظ...' : editingPerson ? 'حفظ التعديلات' : 'إضافة الشخص'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
