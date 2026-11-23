import React, { useMemo, useState } from 'react';
import {
  ArrowDownUp,
  ChevronLeft,
  Clock,
  Phone,
  Plus,
  Search,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  PersonFilterDirection,
  PersonFilterStatus,
  PersonSortBy,
  PersonSummary,
} from '../types/debt';
import { formatDateAr, formatDZD } from '../utils/format';
import { Avatar } from './Avatar';

interface PeopleViewProps {
  summaries: PersonSummary[];
  initialStatusFilter?: PersonFilterStatus;
  onOpenPerson: (personId: string) => void;
  onAddPerson: () => void;
  onAddDebtForPerson: (personId?: string) => void;
  onQuickPay: (personId: string) => void;
}

const STATUS_LABELS: Record<PersonFilterStatus, string> = {
  all: 'الكل',
  unpaid: 'غير مسدد',
  partial: 'مسدد جزئياً',
  paid: 'مسدد بالكامل',
  overdue: 'متأخرة',
};

const DIRECTION_LABELS: Record<PersonFilterDirection, string> = {
  all: 'الكل',
  lent: 'لي عندهم',
  borrowed: 'عليّ لهم',
};

export const PeopleView: React.FC<PeopleViewProps> = ({
  summaries,
  initialStatusFilter = 'all',
  onOpenPerson,
  onAddPerson,
  onAddDebtForPerson,
  onQuickPay,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PersonFilterStatus>(initialStatusFilter);
  const [directionFilter, setDirectionFilter] = useState<PersonFilterDirection>('all');
  const [sortBy, setSortBy] = useState<PersonSortBy>('largest_debt');

  // Sync if user navigates via Dashboard "Overdue" button
  React.useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const list = summaries.filter((s) => {
      if (q) {
        const matchName = s.person.name.toLowerCase().includes(q);
        const matchPhone = (s.person.phone ?? '').toLowerCase().includes(q);
        if (!matchName && !matchPhone) return false;
      }

      if (directionFilter === 'lent' && s.lentOriginal <= 0) return false;
      if (directionFilter === 'borrowed' && s.borrowedOriginal <= 0) return false;

      if (statusFilter === 'unpaid') {
        if (s.totalDebtCount === 0 || s.status !== 'unpaid') return false;
      } else if (statusFilter === 'partial') {
        if (s.totalDebtCount === 0 || s.status !== 'partial') return false;
      } else if (statusFilter === 'paid') {
        if (s.totalDebtCount === 0 || s.status !== 'paid') return false;
      } else if (statusFilter === 'overdue') {
        if (!s.hasOverdue) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'largest_debt') {
        if (b.totalRemaining !== a.totalRemaining) {
          return b.totalRemaining - a.totalRemaining;
        }
        return b.lastActivityDate.localeCompare(a.lastActivityDate);
      }
      if (sortBy === 'recent') {
        return b.lastActivityDate.localeCompare(a.lastActivityDate);
      }
      return a.person.name.localeCompare(b.person.name, 'ar');
    });

    return list;
  }, [summaries, search, statusFilter, directionFilter, sortBy]);

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            الأشخاص والديون
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            اضغط على اسم أي شخص لعرض سجل العمليات الكامل أو تسجيل دفعة
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onAddPerson}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>شخص جديد</span>
          </button>
          <button
            type="button"
            onClick={() => onAddDebtForPerson(undefined)}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0F2547] hover:bg-[#193766] dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة دين</span>
          </button>
        </div>
      </div>

      {/* Search & Filters Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف..."
              className="w-full min-h-[44px] pr-10 pl-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F2547] dark:focus:ring-sky-500"
            />
          </div>

          {/* Direction Filter */}
          <div className="md:col-span-3">
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value as PersonFilterDirection)}
              aria-label="تصفية حسب نوع الدين"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F2547] dark:focus:ring-sky-500"
            >
              {(Object.keys(DIRECTION_LABELS) as PersonFilterDirection[]).map((k) => (
                <option key={k} value={k}>
                  النوع: {DIRECTION_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Select */}
          <div className="md:col-span-3 relative">
            <ArrowDownUp className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as PersonSortBy)}
              aria-label="ترتيب الأشخاص"
              className="w-full min-h-[44px] pr-10 pl-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0F2547] dark:focus:ring-sky-500"
            >
              <option value="largest_debt">ترتيب: أكبر دين</option>
              <option value="recent">ترتيب: أحدث عملية</option>
              <option value="name">ترتيب: الاسم (أ-ي)</option>
            </select>
          </div>
        </div>

        {/* Status Filter Segmented Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(Object.keys(STATUS_LABELS) as PersonFilterStatus[]).map((statusKey) => {
            const active = statusFilter === statusKey;
            return (
              <button
                key={statusKey}
                type="button"
                onClick={() => setStatusFilter(statusKey)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? statusKey === 'overdue'
                      ? 'bg-red-600 text-white'
                      : 'bg-[#0F2547] dark:bg-sky-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {STATUS_LABELS[statusKey]}
              </button>
            );
          })}
        </div>
      </div>

      {/* People List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100">
            {summaries.length === 0
              ? 'لم تقم بإضافة أي شخص بعد'
              : 'لا توجد نتائج مطابقة للبحث أو التصفية'}
          </h3>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {summaries.length === 0
              ? 'أضف شخصاً جديداً أو سجّل ديناً مباشرة لبدء المتابعة.'
              : 'جرّب تغيير كلمات البحث أو إعادة ضبط فلاتر الحالة.'}
          </p>
          {summaries.length === 0 ? (
            <button
              type="button"
              onClick={() => onAddDebtForPerson(undefined)}
              className="mt-5 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0F2547] dark:bg-sky-600 text-white text-sm font-semibold inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة دين جديد</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setDirectionFilter('all');
              }}
              className="mt-4 min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              إعادة ضبط الفلاتر
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-xs overflow-hidden">
          {filtered.map((s) => {
            const statusText =
              s.totalDebtCount === 0
                ? 'لا توجد ديون'
                : s.status === 'paid'
                ? 'مسدد بالكامل'
                : s.status === 'partial'
                ? 'مسدد جزئياً'
                : 'غير مسدد';

            const statusColor =
              s.totalDebtCount === 0
                ? 'text-slate-500 dark:text-slate-400'
                : s.status === 'paid'
                ? 'text-emerald-600 dark:text-emerald-400'
                : s.hasOverdue
                ? 'text-red-600 dark:text-red-400'
                : s.status === 'partial'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400';

            return (
              <div
                key={s.person.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onOpenPerson(s.person.id)}
                  className="flex items-center gap-3.5 min-w-0 flex-1 text-right"
                >
                  <Avatar
                    name={s.person.name}
                    src={s.person.avatarDataUrl}
                    size="md"
                    tone={
                      s.totalRemaining <= 0.005
                        ? 'green'
                        : s.lentRemaining >= s.borrowedRemaining
                        ? 'navy'
                        : 'red'
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                        {s.person.name}
                      </span>
                      {s.hasOverdue && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          <span>متأخر</span>
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className={`font-semibold ${statusColor}`}>{statusText}</span>
                      {s.person.phone && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 tabular-nums" dir="ltr">
                            <Phone className="w-3 h-3" />
                            {s.person.phone}
                          </span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>آخر نشاط: {formatDateAr(s.lastActivityDate)}</span>
                    </div>
                  </div>
                </button>

                <div className="flex items-center justify-between sm:justify-end gap-3 pr-14 sm:pr-0 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenPerson(s.person.id)}
                    className="text-right sm:text-left"
                  >
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {s.lentRemaining > 0 && s.borrowedRemaining > 0
                        ? 'المتبقي الكلي'
                        : s.lentRemaining > 0
                        ? 'لي عنده (متبقي)'
                        : s.borrowedRemaining > 0
                        ? 'عليّ له (متبقي)'
                        : 'المتبقي'}
                    </div>
                    <div
                      className={`text-base font-bold tabular-nums ${
                        s.totalRemaining <= 0.005
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : s.borrowedRemaining > s.lentRemaining
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-[#0F2547] dark:text-sky-300'
                      }`}
                      dir="ltr"
                    >
                      {formatDZD(s.totalRemaining)}
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {s.totalRemaining > 0.005 && (
                      <button
                        type="button"
                        onClick={() => onQuickPay(s.person.id)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                      >
                        تسديد
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenPerson(s.person.id)}
                      aria-label={`عرض تفاصيل ${s.person.name}`}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
