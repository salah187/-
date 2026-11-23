import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit3,
  Phone,
  Plus,
  Printer,
  Trash2,
} from 'lucide-react';
import { DebtComputed, PaymentRecord, PersonSummary } from '../types/debt';
import { formatDateAr, formatDZD } from '../utils/format';
import { Avatar } from './Avatar';

interface PersonDetailViewProps {
  summary: PersonSummary;
  debts: DebtComputed[];
  payments: PaymentRecord[];
  onBack: () => void;
  onAddDebt: () => void;
  onRecordPayment: (debtId?: string) => void;
  onEditPerson: () => void;
  onDeletePerson: () => void;
  onDeleteDebt: (debtId: string) => void;
  onDeletePayment: (paymentId: string) => void;
  onPrintStatement: () => void;
}

export const PersonDetailView: React.FC<PersonDetailViewProps> = ({
  summary,
  debts,
  payments,
  onBack,
  onAddDebt,
  onRecordPayment,
  onEditPerson,
  onDeletePerson,
  onDeleteDebt,
  onDeletePayment,
  onPrintStatement,
}) => {
  const { person } = summary;

  const sortedDebts = [...debts].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt.localeCompare(a.createdAt);
  });

  const debtMap = new Map<string, DebtComputed>();
  for (const d of debts) {
    debtMap.set(d.id, d);
  }

  const timeline = [
    ...debts.map((d) => ({
      id: `d_${d.id}`,
      rawId: d.id,
      kind: 'debt' as const,
      direction: d.direction,
      amount: d.amount,
      date: d.date,
      createdAt: d.createdAt,
      notes: d.notes,
      dueDate: d.dueDate,
    })),
    ...payments.map((p) => {
      const debt = debtMap.get(p.debtId);
      return {
        id: `p_${p.id}`,
        rawId: p.id,
        kind: 'payment' as const,
        direction: debt?.direction ?? ('lent' as const),
        amount: p.amount,
        date: p.date,
        createdAt: p.createdAt,
        notes: p.notes,
        dueDate: undefined,
      };
    }),
  ].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt.localeCompare(a.createdAt);
  });

  const hasOpenDebts = summary.totalRemaining > 0.005;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold inline-flex items-center gap-2 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للأشخاص</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPrintStatement}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة كشف الحساب</span>
          </button>
          <button
            type="button"
            onClick={onEditPerson}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            <span>تعديل البيانات</span>
          </button>
          <button
            type="button"
            onClick={onDeletePerson}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50/70 dark:bg-red-950/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/60 text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>حذف الشخص</span>
          </button>
        </div>
      </div>

      {/* Person Profile & Action Card */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar
              name={person.name}
              src={person.avatarDataUrl}
              size="xl"
              tone={hasOpenDebts ? 'navy' : 'green'}
            />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
                {person.name}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                {person.phone ? (
                  <a
                    href={`tel:${person.phone}`}
                    className="inline-flex items-center gap-1.5 text-[#0F2547] dark:text-sky-400 hover:underline font-medium tabular-nums"
                    dir="ltr"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{person.phone}</span>
                  </a>
                ) : (
                  <span>لا يوجد رقم هاتف مسجل</span>
                )}
                <span aria-hidden="true">·</span>
                <span>
                  {summary.totalDebtCount} {summary.totalDebtCount === 1 ? 'دين' : 'ديون'} مسجلة
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onAddDebt}
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#0F2547] hover:bg-[#193766] dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة دين جديد</span>
            </button>
            <button
              type="button"
              disabled={!hasOpenDebts}
              onClick={() => onRecordPayment(undefined)}
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <CreditCard className="w-4 h-4" />
              <span>تسجيل تسديد</span>
            </button>
          </div>
        </div>

        {/* 3 Core Summary Figures */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              إجمالي المبلغ الأصلي
            </div>
            <div
              className="mt-1.5 text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums"
              dir="ltr"
            >
              {formatDZD(summary.totalOriginal)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50">
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              المبلغ الذي تم تسديده
            </div>
            <div
              className="mt-1.5 text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums"
              dir="ltr"
            >
              {formatDZD(summary.totalPaid)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-red-50/60 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/50">
            <div className="text-xs font-semibold text-red-700 dark:text-red-300">
              المبلغ المتبقي
            </div>
            <div
              className={`mt-1.5 text-xl font-bold tabular-nums ${
                summary.totalRemaining <= 0.005
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
              dir="ltr"
            >
              {formatDZD(summary.totalRemaining)}
            </div>
          </div>
        </div>

        {(summary.lentOriginal > 0 || summary.borrowedOriginal > 0) && (
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-slate-300">
            {summary.lentOriginal > 0 && (
              <div>
                <span className="font-semibold text-[#0F2547] dark:text-sky-300">
                  لي عند {person.name}:
                </span>{' '}
                <span>الأصل </span>
                <span className="font-semibold tabular-nums" dir="ltr">
                  {formatDZD(summary.lentOriginal)}
                </span>
                {' · '}
                <span>المتبقي </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums" dir="ltr">
                  {formatDZD(summary.lentRemaining)}
                </span>
              </div>
            )}
            {summary.borrowedOriginal > 0 && (
              <div>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  عليّ لـ {person.name}:
                </span>{' '}
                <span>الأصل </span>
                <span className="font-semibold tabular-nums" dir="ltr">
                  {formatDZD(summary.borrowedOriginal)}
                </span>
                {' · '}
                <span>المتبقي </span>
                <span className="font-bold text-red-600 dark:text-red-400 tabular-nums" dir="ltr">
                  {formatDZD(summary.borrowedRemaining)}
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Individual Debts Breakdown */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            تفاصيل الديون المسجلة
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {sortedDebts.length} {sortedDebts.length === 1 ? 'سجل' : 'سجلات'}
          </span>
        </div>

        {sortedDebts.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            لا توجد ديون مسجلة لهذا الشخص بعد. اضغط على «إضافة دين جديد» للبدء.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedDebts.map((debt) => {
              const progressPct =
                debt.amount > 0
                  ? Math.min(100, Math.round((debt.paidAmount / debt.amount) * 100))
                  : 0;
              const isLent = debt.direction === 'lent';

              return (
                <div key={debt.id} className="p-5 sm:px-6 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
                        <span
                          className={
                            isLent
                              ? 'text-[#0F2547] dark:text-sky-300'
                              : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {isLent ? 'أموال لي عند الشخص' : 'أموال عليّ للشخص'}
                        </span>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                          ·
                        </span>
                        <span
                          className={
                            debt.status === 'paid'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : debt.isOverdue
                              ? 'text-red-600 dark:text-red-400'
                              : debt.status === 'partial'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-600 dark:text-slate-300'
                          }
                        >
                          {debt.status === 'paid'
                            ? 'مسدد بالكامل'
                            : debt.isOverdue
                            ? 'متأخر عن الموعد'
                            : debt.status === 'partial'
                            ? 'مسدد جزئياً'
                            : 'غير مسدد'}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>تاريخ التسجيل: {formatDateAr(debt.date)}</span>
                        {debt.dueDate && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span
                              className={`inline-flex items-center gap-1 ${
                                debt.isOverdue
                                  ? 'text-red-600 dark:text-red-400 font-semibold'
                                  : ''
                              }`}
                            >
                              {debt.isOverdue && <Clock className="w-3 h-3" />}
                              موعد التسديد: {formatDateAr(debt.dueDate)}
                            </span>
                          </>
                        )}
                      </div>
                      {debt.notes && (
                        <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                          ملاحظة: {debt.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right sm:text-left">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          المتبقي من{' '}
                          <span className="tabular-nums" dir="ltr">
                            {formatDZD(debt.amount)}
                          </span>
                        </div>
                        <div
                          className={`text-base font-bold tabular-nums ${
                            debt.remainingAmount <= 0.005
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                          dir="ltr"
                        >
                          {formatDZD(debt.remainingAmount)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {debt.remainingAmount > 0.005 && (
                          <button
                            type="button"
                            onClick={() => onRecordPayment(debt.id)}
                            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                          >
                            تسديد
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteDebt(debt.id)}
                          aria-label="حذف هذا الدين"
                          className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          debt.status === 'paid' ? 'bg-emerald-600' : 'bg-[#0F2547] dark:bg-sky-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums w-10 text-left">
                      {progressPct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Operations & Payment History */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            سجل العمليات والدفعات
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {payments.length} {payments.length === 1 ? 'دفعة' : 'دفعات'}
          </span>
        </div>

        {timeline.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            لا توجد عمليات مسجلة بعد.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {timeline.map((item) => {
              const isPayment = item.kind === 'payment';
              return (
                <div
                  key={item.id}
                  className="px-6 py-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isPayment
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-slate-100 text-[#0F2547] dark:bg-slate-800 dark:text-sky-300'
                      }`}
                    >
                      {isPayment ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <CreditCard className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {isPayment ? 'تسديد دفعة' : 'تسجيل دين'} ·{' '}
                        {item.direction === 'lent' ? 'لي عنده' : 'عليّ له'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span className="tabular-nums">{formatDateAr(item.date)}</span>
                        {item.notes && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{item.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        isPayment
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                      dir="ltr"
                    >
                      {formatDZD(item.amount)}
                    </span>
                    {isPayment && (
                      <button
                        type="button"
                        onClick={() => onDeletePayment(item.rawId)}
                        aria-label="حذف هذه الدفعة"
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
