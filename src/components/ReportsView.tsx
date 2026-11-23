import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  DashboardMetrics,
  DebtComputed,
  PaymentRecord,
  PersonSummary,
} from '../types/debt';
import { formatDateAr, formatDZD, getTodayISO } from '../utils/format';
import { ExcelSheetData, exportToCSV, exportToXLSX } from '../utils/export';
import { Avatar } from './Avatar';

interface ReportsViewProps {
  metrics: DashboardMetrics;
  summaries: PersonSummary[];
  debts: DebtComputed[];
  payments: PaymentRecord[];
  onOpenPerson: (personId: string) => void;
  onPrintPersonStatement: (personId: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  metrics,
  summaries,
  debts,
  payments,
  onOpenPerson,
  onPrintPersonStatement,
  onNotify,
}) => {
  const [selectedPrintPersonId, setSelectedPrintPersonId] = useState<string>(
    summaries[0]?.person.id ?? ''
  );

  React.useEffect(() => {
    if (
      summaries.length > 0 &&
      !summaries.some((s) => s.person.id === selectedPrintPersonId)
    ) {
      setSelectedPrintPersonId(summaries[0].person.id);
    }
  }, [summaries, selectedPrintPersonId]);

  const totalOriginalAll = metrics.totalLent + metrics.totalBorrowed;
  const recoveryPct =
    totalOriginalAll > 0
      ? Math.round((metrics.totalRepaid / totalOriginalAll) * 100)
      : 0;

  const personMap = new Map(summaries.map((s) => [s.person.id, s.person]));
  const debtMap = new Map(debts.map((d) => [d.id, d]));

  const handleExportCSV = () => {
    if (summaries.length === 0) {
      onNotify('info', 'لا توجد بيانات لتصديرها حالياً.');
      return;
    }

    const headers = [
      'الاسم الكامل',
      'رقم الهاتف',
      'لي عنده (الأصل)',
      'لي عنده (المسدد)',
      'لي عنده (المتبقي)',
      'عليّ له (الأصل)',
      'عليّ له (المسدد)',
      'عليّ له (المتبقي)',
      'إجمالي المتبقي',
      'الحالة',
      'آخر نشاط',
    ];

    const rows = summaries.map((s) => [
      s.person.name,
      s.person.phone || '',
      s.lentOriginal,
      s.lentPaid,
      s.lentRemaining,
      s.borrowedOriginal,
      s.borrowedPaid,
      s.borrowedRemaining,
      s.totalRemaining,
      s.status === 'paid'
        ? 'مسدد بالكامل'
        : s.status === 'partial'
        ? 'مسدد جزئياً'
        : 'غير مسدد',
      s.lastActivityDate,
    ]);

    exportToCSV(headers, rows, `تقرير-ديني-${getTodayISO()}.csv`);
    onNotify('success', 'تم تصدير ملف CSV بنجاح.');
  };

  const handleExportExcel = () => {
    if (summaries.length === 0 && debts.length === 0) {
      onNotify('info', 'لا توجد بيانات لتصديرها حالياً.');
      return;
    }

    const sheets: ExcelSheetData[] = [
      {
        name: 'ملخص الأشخاص',
        headers: [
          'الاسم الكامل',
          'رقم الهاتف',
          'لي عنده (الأصل)',
          'لي عنده (المسدد)',
          'لي عنده (المتبقي)',
          'عليّ له (الأصل)',
          'عليّ له (المسدد)',
          'عليّ له (المتبقي)',
          'إجمالي المتبقي',
          'الحالة',
          'آخر نشاط',
        ],
        rows: summaries.map((s) => [
          s.person.name,
          s.person.phone || '',
          s.lentOriginal,
          s.lentPaid,
          s.lentRemaining,
          s.borrowedOriginal,
          s.borrowedPaid,
          s.borrowedRemaining,
          s.totalRemaining,
          s.status === 'paid'
            ? 'مسدد بالكامل'
            : s.status === 'partial'
            ? 'مسدد جزئياً'
            : 'غير مسدد',
          s.lastActivityDate,
        ]),
      },
      {
        name: 'سجل الديون',
        headers: [
          'الشخص',
          'النوع',
          'المبلغ الأصلي',
          'المسدد',
          'المتبقي',
          'الحالة',
          'تاريخ التسجيل',
          'تاريخ التسديد المتوقع',
          'ملاحظات',
        ],
        rows: debts.map((d) => [
          personMap.get(d.personId)?.name ?? '',
          d.direction === 'lent' ? 'لي عند الشخص' : 'عليّ للشخص',
          d.amount,
          d.paidAmount,
          d.remainingAmount,
          d.status === 'paid'
            ? 'مسدد بالكامل'
            : d.status === 'partial'
            ? 'مسدد جزئياً'
            : 'غير مسدد',
          d.date,
          d.dueDate || '',
          d.notes || '',
        ]),
      },
      {
        name: 'سجل الدفعات',
        headers: ['الشخص', 'نوع الدين', 'قيمة الدفعة', 'تاريخ الدفعة', 'ملاحظات'],
        rows: payments.map((p) => {
          const debt = debtMap.get(p.debtId);
          return [
            personMap.get(p.personId)?.name ?? '',
            debt?.direction === 'borrowed' ? 'عليّ للشخص' : 'لي عند الشخص',
            p.amount,
            p.date,
            p.notes || '',
          ];
        }),
      },
    ];

    exportToXLSX(sheets, `تقرير-ديني-${getTodayISO()}.xlsx`);
    onNotify('success', 'تم تصدير ملف Excel بنجاح.');
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            التقارير والكشوفات المالية
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            تحليل شامل للديون والمبالغ المسترجعة وإمكانية التصدير أو طباعة كشف الحساب
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportExcel}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <FileText className="w-4 h-4" />
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      {/* 3 Core Financial Reports */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Report 1: Total Debts */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              تقرير إجمالي الديون
            </h2>
            <TrendingUp className="w-4 h-4 text-[#0F2547] dark:text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-[#0F2547] dark:text-sky-300 tabular-nums" dir="ltr">
            {formatDZD(totalOriginalAll)}
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">ديون أقرضتها (لي)</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums" dir="ltr">
                {formatDZD(metrics.totalLent)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">ديون اقترضتها (عليّ)</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums" dir="ltr">
                {formatDZD(metrics.totalBorrowed)}
              </span>
            </div>
          </div>
        </div>

        {/* Report 2: Recovered / Paid Amounts */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              تقرير المبالغ المسترجعة والمسددة
            </h2>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums" dir="ltr">
            {formatDZD(metrics.totalRepaid)}
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">مسترجع من القروض</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums" dir="ltr">
                {formatDZD(metrics.totalLentRepaid)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">نسبة التسديد الإجمالية</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {recoveryPct}%
              </span>
            </div>
          </div>
        </div>

        {/* Report 3: Remaining Debts */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              تقرير الديون المتبقية
            </h2>
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums" dir="ltr">
            {formatDZD(metrics.totalRemaining)}
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">متبقي لي / عليّ</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums" dir="ltr">
                {formatDZD(metrics.totalLentRemaining)} / {formatDZD(metrics.totalBorrowedRemaining)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">الديون المتأخرة</span>
              <span className="font-semibold text-red-600 dark:text-red-400 tabular-nums">
                {metrics.overdueDebtsCount}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Print Person Statement Card */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              طباعة كشف حساب الشخص
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              اختر شخصاً لطباعة كشف حساب رسمي يتضمن جميع الديون والدفعات والمبلغ المتبقي
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedPrintPersonId}
              onChange={(e) => setSelectedPrintPersonId(e.target.value)}
              disabled={summaries.length === 0}
              aria-label="اختر الشخص لطباعة كشف الحساب"
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 min-w-[180px]"
            >
              {summaries.length === 0 ? (
                <option value="">لا يوجد أشخاص</option>
              ) : (
                summaries.map((s) => (
                  <option key={s.person.id} value={s.person.id}>
                    {s.person.name}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              disabled={!selectedPrintPersonId}
              onClick={() => onPrintPersonStatement(selectedPrintPersonId)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0F2547] hover:bg-[#193766] dark:bg-sky-600 dark:hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف الحساب</span>
            </button>
          </div>
        </div>
      </section>

      {/* Report by Person */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            تقرير الديون حسب الشخص
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {summaries.length} شخص
          </span>
        </div>

        {summaries.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            لا توجد بيانات أشخاص لعرضها في التقرير.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-5 py-3.5">الشخص</th>
                  <th className="px-4 py-3.5">الأصل الكلي</th>
                  <th className="px-4 py-3.5">المسدد</th>
                  <th className="px-4 py-3.5">المتبقي</th>
                  <th className="px-4 py-3.5">الحالة</th>
                  <th className="px-4 py-3.5">آخر نشاط</th>
                  <th className="px-5 py-3.5 text-left">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {summaries.map((s) => (
                  <tr
                    key={s.person.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => onOpenPerson(s.person.id)}
                        className="flex items-center gap-3 text-right hover:underline"
                      >
                        <Avatar
                          name={s.person.name}
                          src={s.person.avatarDataUrl}
                          size="sm"
                        />
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {s.person.name}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5 font-medium tabular-nums" dir="ltr">
                      {formatDZD(s.totalOriginal)}
                    </td>
                    <td
                      className="px-4 py-3.5 font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums"
                      dir="ltr"
                    >
                      {formatDZD(s.totalPaid)}
                    </td>
                    <td
                      className={`px-4 py-3.5 font-bold tabular-nums ${
                        s.totalRemaining <= 0.005
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                      dir="ltr"
                    >
                      {formatDZD(s.totalRemaining)}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold">
                      {s.totalDebtCount === 0 ? (
                        <span className="text-slate-400">لا توجد ديون</span>
                      ) : s.status === 'paid' ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          مسدد بالكامل
                        </span>
                      ) : s.status === 'partial' ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          مسدد جزئياً
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">غير مسدد</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {formatDateAr(s.lastActivityDate)}
                    </td>
                    <td className="px-5 py-3.5 text-left">
                      <button
                        type="button"
                        onClick={() => onPrintPersonStatement(s.person.id)}
                        aria-label={`طباعة كشف حساب ${s.person.name}`}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>كشف</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
