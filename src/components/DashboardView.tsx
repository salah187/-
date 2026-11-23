import React from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Plus,
  Users,
  Wallet,
} from 'lucide-react';
import { DashboardMetrics, PersonSummary } from '../types/debt';
import { formatDateAr, formatDZD } from '../utils/format';
import { Avatar } from './Avatar';

interface DashboardViewProps {
  metrics: DashboardMetrics;
  summaries: PersonSummary[];
  onAddDebt: () => void;
  onOpenPerson: (personId: string) => void;
  onViewPeople: (filterStatus?: 'all' | 'overdue') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  summaries,
  onAddDebt,
  onOpenPerson,
  onViewPeople,
}) => {
  const hasAnyData =
    metrics.totalLent > 0 || metrics.totalBorrowed > 0 || summaries.length > 0;

  return (
    <div className="space-y-6">
      {/* Top Hero Summary Banner */}
      <section className="rounded-2xl bg-[#0F2547] dark:bg-slate-900 border border-[#0F2547] dark:border-slate-800 text-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-xs font-medium text-sky-200/90">
              الملخص المالي العام · الدينار الجزائري
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1.5 tabular-nums" dir="ltr">
              {formatDZD(metrics.totalRemaining)}
            </h2>
            <p className="text-sm text-slate-200 mt-1">
              إجمالي الديون المتبقية النشطة حالياً
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
              <span>
                لي عند الناس:{' '}
                <strong className="text-emerald-300 tabular-nums" dir="ltr">
                  {formatDZD(metrics.totalLentRemaining)}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                عليّ للناس:{' '}
                <strong className="text-rose-300 tabular-nums" dir="ltr">
                  {formatDZD(metrics.totalBorrowedRemaining)}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onAddDebt}
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-white text-[#0F2547] hover:bg-slate-100 font-bold text-sm inline-flex items-center gap-2 transition-colors shadow-xs whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة دين جديد</span>
            </button>
            <button
              type="button"
              onClick={() => onViewPeople('all')}
              className="min-h-[46px] px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Users className="w-4 h-4" />
              <span>قائمة الأشخاص</span>
            </button>
          </div>
        </div>
      </section>

      {/* Overdue Alert Banner (only if overdue debts exist) */}
      {metrics.overdueDebtsCount > 0 && (
        <div className="rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-900 dark:text-red-200">
                تنبيه: لديك {metrics.overdueDebtsCount}{' '}
                {metrics.overdueDebtsCount === 1 ? 'دين متأخر' : 'ديون متأخرة'} عن موعد التسديد
              </h3>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                يمكنك مراجعة الديون المتأخرة ومتابعة تحصيلها أو سدادها.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onViewPeople('overdue')}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
          >
            عرض الديون المتأخرة
          </button>
        </div>
      )}

      {/* KPI Metrics Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Lent */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              أموال أقرضتها للناس
            </span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <div
            className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums"
            dir="ltr"
          >
            {formatDZD(metrics.totalLent)}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            المتبقي:{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums" dir="ltr">
              {formatDZD(metrics.totalLentRemaining)}
            </span>
          </div>
        </div>

        {/* Total Borrowed */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              أموال اقترضتها من الناس
            </span>
            <ArrowDownLeft className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          </div>
          <div
            className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums"
            dir="ltr"
          >
            {formatDZD(metrics.totalBorrowed)}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            المتبقي:{' '}
            <span className="font-semibold text-red-600 dark:text-red-400 tabular-nums" dir="ltr">
              {formatDZD(metrics.totalBorrowedRemaining)}
            </span>
          </div>
        </div>

        {/* Total Repaid */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              إجمالي المبالغ المسددة
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <div
            className="mt-3 text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums"
            dir="ltr"
          >
            {formatDZD(metrics.totalRepaid)}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            مسترجع من القروض والديون
          </div>
        </div>

        {/* Total Remaining */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              إجمالي الديون المتبقية
            </span>
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          </div>
          <div
            className="mt-3 text-xl font-bold text-red-600 dark:text-red-400 tabular-nums"
            dir="ltr"
          >
            {formatDZD(metrics.totalRemaining)}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            إجمالي المبالغ غير المسددة
          </div>
        </div>

        {/* People with Debts */}
        <button
          type="button"
          onClick={() => onViewPeople('all')}
          className="text-right rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-[#0F2547]/40 dark:hover:border-sky-700 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              أشخاص لديهم ديون
            </span>
            <Users className="w-4 h-4 text-[#0F2547] dark:text-sky-400 shrink-0" />
          </div>
          <div className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {metrics.peopleWithDebtsCount}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            من أصل {summaries.length} شخص مسجل
          </div>
        </button>
      </section>

      {/* Recent Financial Operations */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            أحدث العمليات المالية
          </h2>
          {metrics.recentOperations.length > 0 && (
            <button
              type="button"
              onClick={() => onViewPeople('all')}
              className="text-xs font-semibold text-[#0F2547] dark:text-sky-400 hover:underline whitespace-nowrap shrink-0"
            >
              عرض جميع الأشخاص
            </button>
          )}
        </div>

        {!hasAnyData || metrics.recentOperations.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[#0F2547] dark:text-sky-400 flex items-center justify-center mx-auto">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100">
              لا توجد عمليات مسجلة بعد
            </h3>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              ابدأ بتسجيل أول دين لك أو عليك، وستظهر هنا جميع الحركات المالية والمبالغ المتبقية بشكل فوري ومنظم.
            </p>
            <button
              type="button"
              onClick={onAddDebt}
              className="mt-5 min-h-[46px] px-5 py-2.5 rounded-xl bg-[#0F2547] hover:bg-[#193766] dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل أول دين</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {metrics.recentOperations.map((op) => {
              const isPayment = op.kind === 'payment';
              const isLent = op.direction === 'lent';

              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => onOpenPerson(op.personId)}
                  className="w-full px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-right"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Avatar
                      name={op.personName}
                      src={op.personAvatar}
                      size="md"
                      tone={isPayment ? 'green' : isLent ? 'navy' : 'red'}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {op.personName}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>{isPayment ? 'تسديد دفعة' : 'تسجيل دين'}</span>
                        <span aria-hidden="true">·</span>
                        <span>{isLent ? 'لي عنده' : 'عليّ له'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatDateAr(op.date)}</span>
                        {op.notes && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate max-w-[180px] sm:max-w-xs">
                              {op.notes}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <div
                      className={`text-sm sm:text-base font-bold tabular-nums ${
                        isPayment
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isLent
                          ? 'text-[#0F2547] dark:text-sky-300'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                      dir="ltr"
                    >
                      {formatDZD(op.amount)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
