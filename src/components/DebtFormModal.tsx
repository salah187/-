import React, { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Camera, Trash2, UserPlus, Users, X } from 'lucide-react';
import { DebtDirection, Person } from '../types/debt';
import { compressImageToDataURL, getTodayISO } from '../utils/format';
import { Avatar } from './Avatar';

interface DebtFormModalProps {
  open: boolean;
  people: Person[];
  initialPersonId?: string;
  initialDirection?: DebtDirection;
  onClose: () => void;
  onSaveDebt: (payload: {
    existingPersonId?: string;
    newPerson?: { name: string; phone?: string; avatarDataUrl?: string };
    direction: DebtDirection;
    amount: number;
    date: string;
    dueDate?: string;
    notes?: string;
  }) => Promise<void> | void;
}

export const DebtFormModal: React.FC<DebtFormModalProps> = ({
  open,
  people,
  initialPersonId,
  initialDirection = 'lent',
  onClose,
  onSaveDebt,
}) => {
  const [personMode, setPersonMode] = useState<'existing' | 'new'>('new');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAvatar, setNewAvatar] = useState<string | undefined>(undefined);

  const [direction, setDirection] = useState<DebtDirection>(initialDirection);
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const hasPeople = people.length > 0;
      if (initialPersonId && people.some((p) => p.id === initialPersonId)) {
        setPersonMode('existing');
        setSelectedPersonId(initialPersonId);
      } else if (hasPeople) {
        setPersonMode('existing');
        setSelectedPersonId(people[0].id);
      } else {
        setPersonMode('new');
        setSelectedPersonId('');
      }
      setNewName('');
      setNewPhone('');
      setNewAvatar(undefined);
      setDirection(initialDirection);
      setAmountStr('');
      setDate(getTodayISO());
      setDueDate('');
      setNotes('');
      setError(null);
      setSubmitting(false);
    }
  }, [open, initialPersonId, initialDirection, people]);

  if (!open) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToDataURL(file, 240);
      setNewAvatar(compressed);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل الصورة');
    }
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const normalizedAmount = Number(amountStr.replace(',', '.'));
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setError('يرجى إدخال مبلغ مالي صحيح أكبر من الصفر.');
      return;
    }

    if (personMode === 'existing') {
      if (!selectedPersonId) {
        setError('يرجى اختيار الشخص أو إضافة شخص جديد.');
        return;
      }
    } else {
      if (!newName.trim()) {
        setError('يرجى إدخال الاسم الكامل للشخص الجديد.');
        return;
      }
    }

    if (!date) {
      setError('يرجى تحديد تاريخ تسجيل الدين.');
      return;
    }

    setSubmitting(true);
    try {
      await onSaveDebt({
        existingPersonId: personMode === 'existing' ? selectedPersonId : undefined,
        newPerson:
          personMode === 'new'
            ? {
                name: newName.trim(),
                phone: newPhone.trim() || undefined,
                avatarDataUrl: newAvatar,
              }
            : undefined,
        direction,
        amount: Math.round(normalizedAmount * 100) / 100,
        date,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ الدين');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="debt-modal-title"
    >
      <div className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 sm:hidden" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2
            id="debt-modal-title"
            className="text-lg font-bold text-slate-900 dark:text-slate-100"
          >
            تسجيل دين جديد
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
          {/* Debt Type Selection */}
          <div>
            <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              نوع الدين <span className="text-red-500">*</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDirection('lent')}
                className={`min-h-[52px] px-4 py-3 rounded-xl border text-right flex items-center gap-3 transition-all ${
                  direction === 'lent'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100 dark:border-emerald-500 ring-1 ring-emerald-600 dark:ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold">أموال لي عند الشخص</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">أنا أقرضته هذا المبلغ</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDirection('borrowed')}
                className={`min-h-[52px] px-4 py-3 rounded-xl border text-right flex items-center gap-3 transition-all ${
                  direction === 'borrowed'
                    ? 'border-red-600 bg-red-50 text-red-900 dark:bg-red-950/50 dark:text-red-100 dark:border-red-500 ring-1 ring-red-600 dark:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold">أموال عليّ للشخص</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">أنا اقترضت منه هذا المبلغ</div>
                </div>
              </button>
            </div>
          </div>

          {/* Person Selection or New Person */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                الشخص <span className="text-red-500">*</span>
              </span>
              {people.length > 0 && (
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPersonMode('existing')}
                    className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                      personMode === 'existing'
                        ? 'bg-white dark:bg-slate-900 text-[#0F2547] dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>شخص مسجل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPersonMode('new')}
                    className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                      personMode === 'new'
                        ? 'bg-white dark:bg-slate-900 text-[#0F2547] dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>شخص جديد</span>
                  </button>
                </div>
              )}
            </div>

            {personMode === 'existing' && people.length > 0 ? (
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                aria-label="اختر الشخص"
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-base focus:outline-none focus:ring-2 focus:ring-[#0F2547] dark:focus:ring-sky-500"
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.phone ? `(${p.phone})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar name={newName || 'جديد'} src={newAvatar} size="md" />
                  <label className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <Camera className="w-4 h-4" />
                    <span>{newAvatar ? 'تغيير الصورة' : 'صورة شخصية (اختياري)'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="sr-only"
                    />
                  </label>
                  {newAvatar && (
                    <button
                      type="button"
                      onClick={() => setNewAvatar(undefined)}
                      aria-label="إزالة الصورة"
                      className="min-h-[40px] px-2.5 rounded-xl text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="debt-new-name"
                      className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
                    >
                      الاسم الكامل <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="debt-new-name"
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="مثال: كريم بوزيد"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2547] dark:focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="debt-new-phone"
                      className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
                    >
                      رقم الهاتف (اختياري)
                    </label>
                    <input
                      id="debt-new-phone"
                      type="tel"
                      dir="ltr"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="0550 00 00 00"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F2547] dark:focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor="debt-amount"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
            >
              المبلغ المالي (د.ج) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="debt-amount"
                type="number"
                inputMode="decimal"
                step="any"
                min="0.01"
                required
                dir="ltr"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0"
                className="w-full min-h-[50px] pl-16 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-lg font-bold text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F2547] dark:focus:ring-sky-500"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 dark:text-slate-400 pointer-events-none">
                د.ج
              </span>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="debt-date"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
              >
                تاريخ تسجيل الدين <span className="text-red-500">*</span>
              </label>
              <input
                id="debt-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F2547] dark:focus:ring-sky-500"
              />
            </div>
            <div>
              <label
                htmlFor="debt-due-date"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
              >
                تاريخ التسديد المتوقع (اختياري)
              </label>
              <input
                id="debt-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F2547] dark:focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="debt-notes"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
            >
              ملاحظات إضافية (اختياري)
            </label>
            <textarea
              id="debt-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: سلفة مصاريف سيارة أو فاتورة..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2547] dark:focus:ring-sky-500"
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
              {submitting ? 'جاري التسجيل...' : 'حفظ الدين'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
