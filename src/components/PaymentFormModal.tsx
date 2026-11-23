import React, { useEffect, useMemo, useState } from 'react';
import { CheckCheck, X } from 'lucide-react';
import { DebtComputed, Person } from '../types/debt';
import { formatDateAr, formatDZD, getTodayISO } from '../utils/format';
import { roundMoney } from '../utils/calculations';

interface PaymentFormModalProps {
  open: boolean;
  person: Person | null;
  openDebts: DebtComputed[];
  preselectedDebtId?: string;
  onClose: () => void;
  onRecordPayment: (payload: {
    debtId: string; // specific debtId or 'auto_lent' / 'auto_borrowed'
    personId: string;
    amount: number;
    date: string;
    notes?: string;
  }) => Promise<void> | void;
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  open,
  person,
  openDebts,
  preselectedDebtId,
  onClose,
  onRecordPayment,
}) => {
  const [targetId, setTargetId] = useState<string>('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const lentOpen = useMemo(
    () => openDebts.filter((d) => d.direction === 'lent' && d.remainingAmount > 0.005),
    [openDebts]
  );
  const borrowedOpen = useMemo(
    () => openDebts.filter((d) => d.direction === 'borrowed' && d.remainingAmount > 0.005),
    [openDebts]
  );

  const lentRemainingTotal = useMemo(
    () => roundMoney(lentOpen.reduce((s, d) => s + d.remainingAmount, 0)),
    [lentOpen]
  );
  const borrowedRemainingTotal = useMemo(
    () => roundMoney(borrowedOpen.reduce((s, d) => s + d.remainingAmount, 0)),
    [borrowedOpen]
  );

  useEffect(() => {
    if (open) {
      if (preselectedDebtId && openDebts.some((d) => d.id === preselectedDebtId)) {
        setTargetId(preselectedDebtId);
      } else if (openDebts.length === 1) {
        setTargetId(openDebts[0].id);
      } else if (lentOpen.length > 0) {
        setTargetId(lentOpen.length > 1 ? 'auto_lent' : lentOpen[0].id);
      } else if (borrowedOpen.length > 0) {
        setTargetId(borrowedOpen.length > 1 ? 'auto_borrowed' : borrowedOpen[0].id);
      } else {
        setTargetId('');
      }
      setAmountStr('');
      setDate(getTodayISO());
      setNotes('');
      setError(null);
      setSubmitting(false);
    }
  }, [open, preselectedDebtId, openDebts, lentOpen, borrowedOpen]);

  const maxAllowed = useMemo(() => {
    if (targetId === 'auto_lent') return lentRemainingTotal;
    if (targetId === 'auto_borrowed') return borrowedRemainingTotal;
    const found = openDebts.find((d) => d.id === targetId);
    return found ? found.remainingAmount : 0;
  }, [targetId, lentRemainingTotal, borrowedRemainingTotal, openDebts]);

  if (!open || !person) return null;

  const parsedAmount = Number(amountStr.replace(',', '.'));
  const exceedsRemaining =
    Number.isFinite(parsedAmount) && parsedAmount > maxAllowed + 0.005;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!targetId) {
      setError('لا يوجد دين مفتوح للتسديد.');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('يرجى إدخال مبلغ تسديد صحيح أكبر من الصفر.');
      return;
    }

    if (parsedAmount > maxAllowed + 0.005) {
      setError(`لا يمكن تسجيل دفعة أكبر من المبلغ المتبقي (${formatDZD(maxAllowed)}).`);
      return;
    }

    setSubmitting(true);
    try {
      await onRecordPayment({
        debtId: targetId,
        personId: person.id,
        amount: Math.min(maxAllowed, Math.round(parsedAmount * 100) / 100),
        date,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تسجيل الدفعة');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 sm:hidden" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2
              id="payment-modal-title"
              className="text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              تسجيل تسديد دين
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              الشخص: {person.name}
            </p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {openDebts.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-800 dark:text-emerald-200">
              جميع ديون هذا الشخص مسددة بالكامل.
            </div>
          ) : (
            <>
              <div>
                <label
                  htmlFor="payment-target-debt"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  الدين المراد تسديده
                </label>
                <select
                  id="payment-target-debt"
                  value={targetId}
                  onChange={(e) => {
                    setTargetId(e.target.value);
                    setError(null);
                  }}
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2547] dark:focus:ring-sky-500"
                >
                  {lentOpen.length > 1 && (
                    <option value="auto_lent">
                      تسديد من إجمالي ديون لي عنده (المتبقي: {formatDZD(lentRemainingTotal)})
                    </option>
                  )}
                  {borrowedOpen.length > 1 && (
                    <option value="auto_borrowed">
                      تسديد من إجمالي ديون عليّ له (المتبقي: {formatDZD(borrowedRemainingTotal)})
                    </option>
                  )}
                  {openDebts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.direction === 'lent' ? 'لي عنده' : 'عليّ له'} · {formatDateAr(d.date)} · المتبقي: {formatDZD(d.remainingAmount)}
                      {d.notes ? ` (${d.notes})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    المبلغ المتبقي القابل للتسديد
                  </div>
                  <div
                    className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5"
                    dir="ltr"
                  >
                    {formatDZD(maxAllowed)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAmountStr(String(maxAllowed));
                    setError(null);
                  }}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>تسديد كامل</span>
                </button>
              </div>

              <div>
                <label
                  htmlFor="payment-amount"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  قيمة الدفعة (د.ج) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="payment-amount"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0.01"
                    max={maxAllowed}
                    required
                    dir="ltr"
                    value={amountStr}
                    onChange={(e) => {
                      setAmountStr(e.target.value);
                      setError(null);
                    }}
                    placeholder="0"
                    className={`w-full min-h-[50px] pl-16 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border text-slate-900 dark:text-slate-100 text-lg font-bold text-right tabular-nums focus:outline-none focus:ring-2 ${
                      exceedsRemaining
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-[#0F2547] dark:focus:ring-sky-500'
                    }`}
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 dark:text-slate-400 pointer-events-none">
                    د.ج
                  </span>
                </div>
                {exceedsRemaining && (
                  <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                    تنبيه: المبلغ المدخل أكبر من المبلغ المتبقي ({formatDZD(maxAllowed)}).
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="payment-date"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  تاريخ الدفعة <span className="text-red-500">*</span>
                </label>
                <input
                  id="payment-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F2547] dark:focus:ring-sky-500"
                />
              </div>

              <div>
                <label
                  htmlFor="payment-notes"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  ملاحظات الدفعة (اختياري)
                </label>
                <input
                  id="payment-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: دفعة نقدية / تحويل بريدي موب"
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2547] dark:focus:ring-sky-500"
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
                  disabled={submitting || exceedsRemaining}
                  className="min-h-[46px] px-6 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                >
                  {submitting ? 'جاري التسجيل...' : 'تأكيد التسديد'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
