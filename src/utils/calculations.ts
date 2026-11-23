import {
  DashboardMetrics,
  DebtComputed,
  DebtRecord,
  DebtStatus,
  OperationItem,
  PaymentRecord,
  Person,
  PersonSummary,
} from '../types/debt';
import { isOverdue } from './format';

const EPSILON = 0.005;

export function roundMoney(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function computeDebts(
  debts: DebtRecord[],
  payments: PaymentRecord[]
): DebtComputed[] {
  const paidByDebt = new Map<string, number>();
  for (const p of payments) {
    paidByDebt.set(p.debtId, roundMoney((paidByDebt.get(p.debtId) ?? 0) + p.amount));
  }

  return debts.map((debt) => {
    const paidAmount = Math.min(debt.amount, paidByDebt.get(debt.id) ?? 0);
    const remainingAmount = Math.max(0, roundMoney(debt.amount - paidAmount));
    let status: DebtStatus = 'unpaid';
    if (remainingAmount <= EPSILON) {
      status = 'paid';
    } else if (paidAmount > EPSILON) {
      status = 'partial';
    }

    return {
      ...debt,
      paidAmount: roundMoney(paidAmount),
      remainingAmount,
      status,
      isOverdue: isOverdue(debt.dueDate, remainingAmount),
    };
  });
}

export function computePersonSummaries(
  people: Person[],
  computedDebts: DebtComputed[],
  payments: PaymentRecord[]
): PersonSummary[] {
  const debtsByPerson = new Map<string, DebtComputed[]>();
  for (const d of computedDebts) {
    const list = debtsByPerson.get(d.personId) ?? [];
    list.push(d);
    debtsByPerson.set(d.personId, list);
  }

  const lastPaymentByPerson = new Map<string, string>();
  for (const p of payments) {
    const prev = lastPaymentByPerson.get(p.personId);
    if (!prev || p.date > prev) {
      lastPaymentByPerson.set(p.personId, p.date);
    }
  }

  return people.map((person) => {
    const personDebts = debtsByPerson.get(person.id) ?? [];

    let lentOriginal = 0;
    let lentPaid = 0;
    let lentRemaining = 0;
    let borrowedOriginal = 0;
    let borrowedPaid = 0;
    let borrowedRemaining = 0;
    let overdueCount = 0;
    let activeDebtCount = 0;
    let lastActivityDate = person.createdAt.slice(0, 10);

    for (const d of personDebts) {
      if (d.direction === 'lent') {
        lentOriginal = roundMoney(lentOriginal + d.amount);
        lentPaid = roundMoney(lentPaid + d.paidAmount);
        lentRemaining = roundMoney(lentRemaining + d.remainingAmount);
      } else {
        borrowedOriginal = roundMoney(borrowedOriginal + d.amount);
        borrowedPaid = roundMoney(borrowedPaid + d.paidAmount);
        borrowedRemaining = roundMoney(borrowedRemaining + d.remainingAmount);
      }

      if (d.remainingAmount > EPSILON) {
        activeDebtCount += 1;
      }
      if (d.isOverdue) {
        overdueCount += 1;
      }
      if (d.date > lastActivityDate) {
        lastActivityDate = d.date;
      }
    }

    const lastPayDate = lastPaymentByPerson.get(person.id);
    if (lastPayDate && lastPayDate > lastActivityDate) {
      lastActivityDate = lastPayDate;
    }

    const totalOriginal = roundMoney(lentOriginal + borrowedOriginal);
    const totalPaid = roundMoney(lentPaid + borrowedPaid);
    const totalRemaining = roundMoney(lentRemaining + borrowedRemaining);
    const netBalance = roundMoney(lentRemaining - borrowedRemaining);

    let status: DebtStatus = 'unpaid';
    if (totalOriginal <= EPSILON) {
      status = 'paid';
    } else if (totalRemaining <= EPSILON) {
      status = 'paid';
    } else if (totalPaid > EPSILON) {
      status = 'partial';
    }

    return {
      person,
      lentOriginal,
      lentPaid,
      lentRemaining,
      borrowedOriginal,
      borrowedPaid,
      borrowedRemaining,
      totalOriginal,
      totalPaid,
      totalRemaining,
      netBalance,
      status,
      hasOverdue: overdueCount > 0,
      overdueCount,
      activeDebtCount,
      totalDebtCount: personDebts.length,
      lastActivityDate,
    };
  });
}

export function computeDashboardMetrics(
  people: Person[],
  computedDebts: DebtComputed[],
  payments: PaymentRecord[]
): DashboardMetrics {
  const personMap = new Map<string, Person>();
  for (const p of people) {
    personMap.set(p.id, p);
  }

  const debtMap = new Map<string, DebtComputed>();
  for (const d of computedDebts) {
    debtMap.set(d.id, d);
  }

  let totalLent = 0;
  let totalLentRepaid = 0;
  let totalLentRemaining = 0;
  let totalBorrowed = 0;
  let totalBorrowedRepaid = 0;
  let totalBorrowedRemaining = 0;
  let overdueDebtsCount = 0;
  const activePeopleIds = new Set<string>();

  for (const d of computedDebts) {
    if (d.direction === 'lent') {
      totalLent = roundMoney(totalLent + d.amount);
      totalLentRepaid = roundMoney(totalLentRepaid + d.paidAmount);
      totalLentRemaining = roundMoney(totalLentRemaining + d.remainingAmount);
    } else {
      totalBorrowed = roundMoney(totalBorrowed + d.amount);
      totalBorrowedRepaid = roundMoney(totalBorrowedRepaid + d.paidAmount);
      totalBorrowedRemaining = roundMoney(totalBorrowedRemaining + d.remainingAmount);
    }

    if (d.remainingAmount > EPSILON) {
      activePeopleIds.add(d.personId);
    }
    if (d.isOverdue) {
      overdueDebtsCount += 1;
    }
  }

  const operations: OperationItem[] = [];

  for (const d of computedDebts) {
    const person = personMap.get(d.personId);
    if (!person) continue;
    operations.push({
      id: `op_debt_${d.id}`,
      kind: 'debt',
      direction: d.direction,
      personId: person.id,
      personName: person.name,
      personAvatar: person.avatarDataUrl,
      debtId: d.id,
      amount: d.amount,
      date: d.date,
      createdAt: d.createdAt,
      notes: d.notes,
    });
  }

  for (const p of payments) {
    const person = personMap.get(p.personId);
    const debt = debtMap.get(p.debtId);
    if (!person || !debt) continue;
    operations.push({
      id: `op_pay_${p.id}`,
      kind: 'payment',
      direction: debt.direction,
      personId: person.id,
      personName: person.name,
      personAvatar: person.avatarDataUrl,
      debtId: p.debtId,
      amount: p.amount,
      date: p.date,
      createdAt: p.createdAt,
      notes: p.notes,
    });
  }

  operations.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt.localeCompare(a.createdAt);
  });

  return {
    totalLent,
    totalLentRepaid,
    totalLentRemaining,
    totalBorrowed,
    totalBorrowedRepaid,
    totalBorrowedRemaining,
    totalRepaid: roundMoney(totalLentRepaid + totalBorrowedRepaid),
    totalRemaining: roundMoney(totalLentRemaining + totalBorrowedRemaining),
    peopleWithDebtsCount: activePeopleIds.size,
    overdueDebtsCount,
    recentOperations: operations.slice(0, 12),
  };
}
