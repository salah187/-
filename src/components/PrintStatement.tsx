import React from 'react';
import { DebtComputed, PaymentRecord, PersonSummary } from '../types/debt';
import { formatDateAr, formatDZD, getTodayISO } from '../utils/format';

interface PrintStatementProps {
  summary: PersonSummary | null;
  debts: DebtComputed[];
  payments: PaymentRecord[];
}

export const PrintStatement: React.FC<PrintStatementProps> = ({
  summary,
  debts,
  payments,
}) => {
  if (!summary) return null;

  const debtMap = new Map<string, DebtComputed>();
  for (const d of debts) {
    debtMap.set(d.id, d);
  }

  const timeline = [
    ...debts.map((d) => ({
      id: `d_${d.id}`,
      date: d.date,
      createdAt: d.createdAt,
      kind: 'debt' as const,
      direction: d.direction,
      amount: d.amount,
      notes: d.notes || '',
      dueDate: d.dueDate,
    })),
    ...payments.map((p) => {
      const debt = debtMap.get(p.debtId);
      return {
        id: `p_${p.id}`,
        date: p.date,
        createdAt: p.createdAt,
        kind: 'payment' as const,
        direction: debt?.direction ?? ('lent' as const),
        amount: p.amount,
        notes: p.notes || '',
        dueDate: undefined,
      };
    }),
  ].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.createdAt.localeCompare(b.createdAt);
  });

  return (
    <div className="print-only p-8 text-slate-900 bg-white" dir="rtl">
      <div className="flex items-start justify-between border-b-2 border-[#0F2547] pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2547]">كشف حساب مالي شخصي</h1>
          <p className="text-sm text-slate-600 mt-1">تطبيق دَيني | Dayni لإدارة الديون الشخصية</p>
        </div>
        <div className="text-left text-xs text-slate-600">
          <div>تاريخ الطباعة: {formatDateAr(getTodayISO())}</div>
          <div>العملة: الدينار الجزائري (DZD)</div>
        </div>
      </div>

      <div className="mb-6 p-4 rounded-xl border border-slate-300 bg-slate-50">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">الاسم الكامل: </span>
            <span className="font-bold text-slate-900">{summary.person.name}</span>
          </div>
          <div>
            <span className="text-slate-500">رقم الهاتف: </span>
            <span className="font-semibold tabular-nums" dir="ltr">
              {summary.person.phone || 'غير مسجل'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 rounded-xl border border-slate-300">
          <div className="text-xs text-slate-500">إجمالي المبلغ الأصلي</div>
          <div className="text-lg font-bold tabular-nums mt-1 text-slate-900" dir="ltr">
            {formatDZD(summary.totalOriginal)}
          </div>
        </div>
        <div className="p-3 rounded-xl border border-slate-300">
          <div className="text-xs text-slate-500">المبلغ المسدد</div>
          <div className="text-lg font-bold tabular-nums mt-1 text-emerald-700" dir="ltr">
            {formatDZD(summary.totalPaid)}
          </div>
        </div>
        <div className="p-3 rounded-xl border border-slate-300">
          <div className="text-xs text-slate-500">المبلغ المتبقي</div>
          <div className="text-lg font-bold tabular-nums mt-1 text-red-700" dir="ltr">
            {formatDZD(summary.totalRemaining)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
        <div className="p-3 rounded-xl border border-slate-200">
          <div className="font-semibold text-slate-700 mb-1">أموال لي عند {summary.person.name}</div>
          <div>الأصل: {formatDZD(summary.lentOriginal)} · المسدد: {formatDZD(summary.lentPaid)} · المتبقي: {formatDZD(summary.lentRemaining)}</div>
        </div>
        <div className="p-3 rounded-xl border border-slate-200">
          <div className="font-semibold text-slate-700 mb-1">أموال عليّ لـ {summary.person.name}</div>
          <div>الأصل: {formatDZD(summary.borrowedOriginal)} · المسدد: {formatDZD(summary.borrowedPaid)} · المتبقي: {formatDZD(summary.borrowedRemaining)}</div>
        </div>
      </div>

      <h2 className="text-base font-bold text-[#0F2547] mb-3">سجل العمليات والدفعات</h2>
      <table className="w-full text-sm border-collapse border border-slate-300">
        <thead>
          <tr className="bg-[#0F2547] text-white">
            <th className="p-2.5 text-right border border-slate-300">التاريخ</th>
            <th className="p-2.5 text-right border border-slate-300">نوع العملية</th>
            <th className="p-2.5 text-right border border-slate-300">التصنيف</th>
            <th className="p-2.5 text-right border border-slate-300">المبلغ</th>
            <th className="p-2.5 text-right border border-slate-300">ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          {timeline.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-4 text-center text-slate-500 border border-slate-300">
                لا توجد عمليات مسجلة لهذا الشخص.
              </td>
            </tr>
          ) : (
            timeline.map((item) => (
              <tr key={item.id} className="border-b border-slate-200">
                <td className="p-2.5 border border-slate-300 tabular-nums">
                  {formatDateAr(item.date)}
                </td>
                <td className="p-2.5 border border-slate-300 font-medium">
                  {item.kind === 'debt' ? 'تسجيل دين' : 'تسديد دفعة'}
                </td>
                <td className="p-2.5 border border-slate-300">
                  {item.direction === 'lent' ? 'لي عند الشخص' : 'عليّ للشخص'}
                </td>
                <td className="p-2.5 border border-slate-300 font-bold tabular-nums" dir="ltr">
                  {formatDZD(item.amount)}
                </td>
                <td className="p-2.5 border border-slate-300 text-slate-600">
                  {item.notes || (item.dueDate ? `استحقاق: ${formatDateAr(item.dueDate)}` : '—')}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
