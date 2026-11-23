import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Home,
  Lock,
  Moon,
  Plus,
  PlusCircle,
  Settings,
  Sun,
  Users,
} from 'lucide-react';
import {
  DebtDirection,
  DebtRecord,
  LockConfig,
  MainTab,
  PaymentRecord,
  Person,
  PersonFilterStatus,
  PinLength,
  ThemeMode,
  ToastMessage,
} from './types/debt';
import {
  computeDashboardMetrics,
  computeDebts,
  computePersonSummaries,
  roundMoney,
} from './utils/calculations';
import { generateId, getTodayISO } from './utils/format';
import { exportJSONFile } from './utils/export';
import {
  buildBackupPayload,
  loadAllData,
  loadSettings,
  parseAndValidateBackup,
  replaceAllData,
  saveSettings,
  StoredDataset,
} from './utils/storage';
import {
  checkBiometricSupport,
  loadLockConfig,
  registerBiometricCredential,
  resetLockConfig,
  saveLockConfig,
} from './utils/security';
import { DashboardView } from './components/DashboardView';
import { PeopleView } from './components/PeopleView';
import { PersonDetailView } from './components/PersonDetailView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { PersonFormModal } from './components/PersonFormModal';
import { DebtFormModal } from './components/DebtFormModal';
import { PaymentFormModal } from './components/PaymentFormModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ToastContainer } from './components/ToastContainer';
import { PrintStatement } from './components/PrintStatement';
import { LockScreen } from './components/LockScreen';
import { PinModalMode, PinSetupModal } from './components/PinSetupModal';

type ConfirmState =
  | { kind: 'none' }
  | { kind: 'delete_person'; personId: string; name: string }
  | { kind: 'delete_debt'; debtId: string }
  | { kind: 'delete_payment'; paymentId: string }
  | { kind: 'restore_backup'; data: StoredDataset }
  | { kind: 'clear_all' }
  | { kind: 'forgot_pin_reset' };

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  const [lockConfig, setLockConfig] = useState<LockConfig>(() => loadLockConfig());
  const [isLocked, setIsLocked] = useState<boolean>(() => loadLockConfig().enabled);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [pinModalState, setPinModalState] = useState<{
    open: boolean;
    mode: PinModalMode;
    action?: 'disable_lock' | 'enable_biometric';
  }>({ open: false, mode: 'setup' });
  const lastActivityRef = useRef<number>(Date.now());

  const [theme, setTheme] = useState<ThemeMode>(() => loadSettings().theme);
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [peopleFilterPreset, setPeopleFilterPreset] =
    useState<PersonFilterStatus>('all');

  // Modals state
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [debtModalPersonId, setDebtModalPersonId] = useState<string | undefined>(
    undefined
  );

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentPersonId, setPaymentPersonId] = useState<string | null>(null);
  const [paymentDebtId, setPaymentDebtId] = useState<string | undefined>(undefined);

  const [confirmState, setConfirmState] = useState<ConfirmState>({ kind: 'none' });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [printPersonId, setPrintPersonId] = useState<string | null>(null);

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveSettings({ theme, currency: 'DZD' });
  }, [theme]);

  // Initial load from IndexedDB & biometric capability check
  useEffect(() => {
    let active = true;
    loadAllData()
      .then((dataset) => {
        if (!active) return;
        setPeople(dataset.people);
        setDebts(dataset.debts);
        setPayments(dataset.payments);
        setLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setLoaded(true);
      });

    checkBiometricSupport().then((supported) => {
      if (active) setBiometricSupported(supported);
    });

    return () => {
      active = false;
    };
  }, []);

  // Auto-lock after 5 minutes of inactivity when enabled
  useEffect(() => {
    if (!lockConfig.enabled || lockConfig.autoLockIdleMinutes <= 0 || isLocked) {
      return;
    }

    const idleLimitMs = lockConfig.autoLockIdleMinutes * 60 * 1000;
    lastActivityRef.current = Date.now();

    const recordActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const checkIdle = () => {
      if (Date.now() - lastActivityRef.current >= idleLimitMs) {
        setIsLocked(true);
      }
    };

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkIdle();
      }
    };

    const events: (keyof WindowEventMap)[] = [
      'pointerdown',
      'keydown',
      'touchstart',
      'scroll',
    ];
    for (const ev of events) {
      window.addEventListener(ev, recordActivity, { passive: true });
    }
    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);

    const interval = setInterval(checkIdle, 10000);

    return () => {
      for (const ev of events) {
        window.removeEventListener(ev, recordActivity);
      }
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      clearInterval(interval);
    };
  }, [lockConfig.enabled, lockConfig.autoLockIdleMinutes, isLocked]);

  const notify = useCallback(
    (type: ToastMessage['type'], text: string) => {
      const id = generateId('toast');
      setToasts((prev) => [...prev, { id, type, text }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const persistDataset = useCallback(
    async (nextPeople: Person[], nextDebts: DebtRecord[], nextPayments: PaymentRecord[]) => {
      setPeople(nextPeople);
      setDebts(nextDebts);
      setPayments(nextPayments);
      await replaceAllData({
        people: nextPeople,
        debts: nextDebts,
        payments: nextPayments,
      });
    },
    []
  );

  // Derived computations
  const computedDebts = useMemo(
    () => computeDebts(debts, payments),
    [debts, payments]
  );

  const personSummaries = useMemo(
    () => computePersonSummaries(people, computedDebts, payments),
    [people, computedDebts, payments]
  );

  const dashboardMetrics = useMemo(
    () => computeDashboardMetrics(people, computedDebts, payments),
    [people, computedDebts, payments]
  );

  const selectedPersonSummary = useMemo(
    () => personSummaries.find((s) => s.person.id === selectedPersonId) ?? null,
    [personSummaries, selectedPersonId]
  );

  const selectedPersonDebts = useMemo(
    () => computedDebts.filter((d) => d.personId === selectedPersonId),
    [computedDebts, selectedPersonId]
  );

  const selectedPersonPayments = useMemo(
    () => payments.filter((p) => p.personId === selectedPersonId),
    [payments, selectedPersonId]
  );

  const paymentTargetPerson = useMemo(
    () => people.find((p) => p.id === paymentPersonId) ?? null,
    [people, paymentPersonId]
  );

  const paymentTargetOpenDebts = useMemo(
    () =>
      computedDebts.filter(
        (d) => d.personId === paymentPersonId && d.remainingAmount > 0.005
      ),
    [computedDebts, paymentPersonId]
  );

  // Print statement data
  const printSummary = useMemo(
    () => personSummaries.find((s) => s.person.id === printPersonId) ?? null,
    [personSummaries, printPersonId]
  );
  const printDebts = useMemo(
    () => computedDebts.filter((d) => d.personId === printPersonId),
    [computedDebts, printPersonId]
  );
  const printPayments = useMemo(
    () => payments.filter((p) => p.personId === printPersonId),
    [payments, printPersonId]
  );

  // Handlers
  const handleOpenPerson = (personId: string) => {
    setSelectedPersonId(personId);
    setActiveTab('people');
  };

  const handleSavePerson = async (data: {
    name: string;
    phone?: string;
    avatarDataUrl?: string;
  }) => {
    const now = new Date().toISOString();
    if (editingPerson) {
      const nextPeople = people.map((p) =>
        p.id === editingPerson.id
          ? {
              ...p,
              name: data.name,
              phone: data.phone,
              avatarDataUrl: data.avatarDataUrl,
              updatedAt: now,
            }
          : p
      );
      await persistDataset(nextPeople, debts, payments);
      notify('success', 'تم تحديث بيانات الشخص بنجاح.');
    } else {
      const newPerson: Person = {
        id: generateId('per'),
        name: data.name,
        phone: data.phone,
        avatarDataUrl: data.avatarDataUrl,
        createdAt: now,
        updatedAt: now,
      };
      await persistDataset([newPerson, ...people], debts, payments);
      notify('success', `تمت إضافة "${newPerson.name}" بنجاح.`);
    }
  };

  const handleSaveDebt = async (payload: {
    existingPersonId?: string;
    newPerson?: { name: string; phone?: string; avatarDataUrl?: string };
    direction: DebtDirection;
    amount: number;
    date: string;
    dueDate?: string;
    notes?: string;
  }) => {
    const now = new Date().toISOString();
    let targetPersonId = payload.existingPersonId;
    let nextPeople = people;

    if (!targetPersonId && payload.newPerson) {
      const created: Person = {
        id: generateId('per'),
        name: payload.newPerson.name,
        phone: payload.newPerson.phone,
        avatarDataUrl: payload.newPerson.avatarDataUrl,
        createdAt: now,
        updatedAt: now,
      };
      targetPersonId = created.id;
      nextPeople = [created, ...people];
    }

    if (!targetPersonId) {
      throw new Error('تعذر تحديد الشخص.');
    }

    const newDebt: DebtRecord = {
      id: generateId('debt'),
      personId: targetPersonId,
      direction: payload.direction,
      amount: payload.amount,
      date: payload.date,
      dueDate: payload.dueDate,
      notes: payload.notes,
      createdAt: now,
      updatedAt: now,
    };

    await persistDataset(nextPeople, [newDebt, ...debts], payments);
    notify('success', 'تم تسجيل الدين بنجاح.');
  };

  const handleRecordPayment = async (payload: {
    debtId: string;
    personId: string;
    amount: number;
    date: string;
    notes?: string;
  }) => {
    const now = new Date().toISOString();
    const newPaymentsToAdd: PaymentRecord[] = [];

    if (payload.debtId === 'auto_lent' || payload.debtId === 'auto_borrowed') {
      const targetDir: DebtDirection =
        payload.debtId === 'auto_lent' ? 'lent' : 'borrowed';
      const openList = computedDebts
        .filter(
          (d) =>
            d.personId === payload.personId &&
            d.direction === targetDir &&
            d.remainingAmount > 0.005
        )
        .sort((a, b) => a.date.localeCompare(b.date));

      const totalOpen = roundMoney(
        openList.reduce((sum, d) => sum + d.remainingAmount, 0)
      );
      if (payload.amount > totalOpen + 0.005) {
        throw new Error('قيمة الدفعة أكبر من المبلغ المتبقي.');
      }

      let leftToAllocate = roundMoney(payload.amount);
      for (const d of openList) {
        if (leftToAllocate <= 0.005) break;
        const applied = Math.min(d.remainingAmount, leftToAllocate);
        newPaymentsToAdd.push({
          id: generateId('pay'),
          debtId: d.id,
          personId: payload.personId,
          amount: roundMoney(applied),
          date: payload.date,
          notes: payload.notes,
          createdAt: now,
        });
        leftToAllocate = roundMoney(leftToAllocate - applied);
      }
    } else {
      const targetDebt = computedDebts.find((d) => d.id === payload.debtId);
      if (!targetDebt) {
        throw new Error('الدين المحدد غير موجود.');
      }
      if (payload.amount > targetDebt.remainingAmount + 0.005) {
        throw new Error('قيمة الدفعة أكبر من المبلغ المتبقي على هذا الدين.');
      }
      newPaymentsToAdd.push({
        id: generateId('pay'),
        debtId: targetDebt.id,
        personId: payload.personId,
        amount: roundMoney(payload.amount),
        date: payload.date,
        notes: payload.notes,
        createdAt: now,
      });
    }

    await persistDataset(people, debts, [...newPaymentsToAdd, ...payments]);
    notify('success', 'تم تسجيل الدفعة وتحديث المبلغ المتبقي بنجاح.');
  };

  const handleConfirmAction = async () => {
    if (confirmState.kind === 'delete_person') {
      const pid = confirmState.personId;
      const nextPeople = people.filter((p) => p.id !== pid);
      const nextDebts = debts.filter((d) => d.personId !== pid);
      const nextPayments = payments.filter((p) => p.personId !== pid);
      await persistDataset(nextPeople, nextDebts, nextPayments);
      if (selectedPersonId === pid) {
        setSelectedPersonId(null);
      }
      notify('success', `تم حذف "${confirmState.name}" وجميع سجلاته.`);
    } else if (confirmState.kind === 'delete_debt') {
      const did = confirmState.debtId;
      const nextDebts = debts.filter((d) => d.id !== did);
      const nextPayments = payments.filter((p) => p.debtId !== did);
      await persistDataset(people, nextDebts, nextPayments);
      notify('success', 'تم حذف سجل الدين والدفعات المرتبطة به.');
    } else if (confirmState.kind === 'delete_payment') {
      const payId = confirmState.paymentId;
      const nextPayments = payments.filter((p) => p.id !== payId);
      await persistDataset(people, debts, nextPayments);
      notify('success', 'تم حذف الدفعة وإعادة احتساب المبلغ المتبقي.');
    } else if (confirmState.kind === 'restore_backup') {
      const { data } = confirmState;
      await persistDataset(data.people, data.debts, data.payments);
      setSelectedPersonId(null);
      setActiveTab('dashboard');
      notify('success', 'تمت استعادة النسخة الاحتياطية بنجاح.');
    } else if (confirmState.kind === 'clear_all') {
      await persistDataset([], [], []);
      const cleanLock = resetLockConfig();
      setLockConfig(cleanLock);
      setIsLocked(false);
      setSelectedPersonId(null);
      setActiveTab('dashboard');
      notify('success', 'تم مسح جميع البيانات من الجهاز.');
    } else if (confirmState.kind === 'forgot_pin_reset') {
      await persistDataset([], [], []);
      const cleanLock = resetLockConfig();
      setLockConfig(cleanLock);
      setIsLocked(false);
      setSelectedPersonId(null);
      setActiveTab('dashboard');
      notify('info', 'تمت إعادة ضبط التطبيق ومسح البيانات المحلية بنجاح.');
    }
    setConfirmState({ kind: 'none' });
  };

  // Security & Lock handlers
  const updateLock = useCallback((updater: (prev: LockConfig) => LockConfig) => {
    setLockConfig((prev) => {
      const next = updater(prev);
      saveLockConfig(next);
      return next;
    });
  }, []);

  const handleCompletePinSetup = (payload: {
    pinLength: PinLength;
    pinHash: string;
    pinSalt: string;
  }) => {
    const wasEnabled = lockConfig.enabled;
    updateLock((prev) => ({
      ...prev,
      enabled: true,
      pinLength: payload.pinLength,
      pinHash: payload.pinHash,
      pinSalt: payload.pinSalt,
      failedAttempts: 0,
      lockedUntil: undefined,
    }));
    lastActivityRef.current = Date.now();
    notify(
      'success',
      wasEnabled
        ? 'تم تحديث رمز PIN بنجاح.'
        : `تم تفعيل قفل التطبيق برمز PIN (${payload.pinLength} أرقام).`
    );
  };

  const handlePinVerifiedAction = async () => {
    if (pinModalState.action === 'disable_lock') {
      const clean = resetLockConfig();
      setLockConfig(clean);
      setIsLocked(false);
      notify('info', 'تم تعطيل قفل التطبيق.');
    } else if (pinModalState.action === 'enable_biometric') {
      setBiometricBusy(true);
      try {
        const credentialId = await registerBiometricCredential();
        updateLock((prev) => ({
          ...prev,
          biometricEnabled: true,
          biometricCredentialId: credentialId,
        }));
        notify('success', 'تم تفعيل الفتح السريع بالبصمة بنجاح.');
      } catch (err) {
        notify(
          'error',
          err instanceof Error ? err.message : 'تعذر تفعيل البصمة.'
        );
      } finally {
        setBiometricBusy(false);
      }
    }
  };

  const handleToggleBiometric = () => {
    if (!lockConfig.enabled) return;
    if (lockConfig.biometricEnabled) {
      updateLock((prev) => ({
        ...prev,
        biometricEnabled: false,
        biometricCredentialId: undefined,
      }));
      notify('info', 'تم إيقاف الفتح بالبصمة، يظل رمز PIN مفعلاً.');
      return;
    }
    setPinModalState({
      open: true,
      mode: 'verify',
      action: 'enable_biometric',
    });
  };

  const handleToggleAutoLockIdle = () => {
    updateLock((prev) => {
      const nextMinutes = prev.autoLockIdleMinutes > 0 ? 0 : 5;
      notify(
        'info',
        nextMinutes > 0
          ? 'تم تفعيل القفل التلقائي بعد 5 دقائق من الخمول.'
          : 'تم تعطيل القفل التلقائي عند الخمول.'
      );
      return {
        ...prev,
        autoLockIdleMinutes: nextMinutes,
      };
    });
  };

  const handleLockNow = () => {
    if (!lockConfig.enabled) return;
    setIsLocked(true);
  };

  const handleExportBackup = () => {
    const payload = buildBackupPayload({ people, debts, payments });
    exportJSONFile(payload, `dayni-backup-${getTodayISO()}.json`);
    notify('success', 'تم تصدير النسخة الاحتياطية بنجاح.');
  };

  const handleSelectBackupFile = async (file: File) => {
    try {
      const text = await file.text();
      const validated = parseAndValidateBackup(text);
      setConfirmState({ kind: 'restore_backup', data: validated });
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'تعذر قراءة ملف النسخة الاحتياطية.'
      );
    }
  };

  const handlePrintStatement = (personId: string) => {
    setPrintPersonId(personId);
    setTimeout(() => {
      window.print();
    }, 120);
  };

  const handleNavClick = (tab: MainTab) => {
    if (tab === 'add') {
      setDebtModalPersonId(selectedPersonId ?? undefined);
      setDebtModalOpen(true);
      return;
    }
    if (tab !== 'people') {
      setSelectedPersonId(null);
    } else {
      setSelectedPersonId(null);
      setPeopleFilterPreset('all');
    }
    setActiveTab(tab);
  };

  const confirmDialogProps = (() => {
    switch (confirmState.kind) {
      case 'delete_person':
        return {
          open: true,
          title: 'تأكيد حذف الشخص',
          message: `هل أنت متأكد من حذف "${confirmState.name}"؟ سيتم حذف جميع الديون والدفعات المرتبطة بهذا الشخص نهائياً ولا يمكن التراجع عن ذلك.`,
          confirmLabel: 'نعم، احذف الشخص',
          variant: 'danger' as const,
        };
      case 'delete_debt':
        return {
          open: true,
          title: 'تأكيد حذف الدين',
          message: 'سيتم حذف سجل هذا الدين وجميع الدفعات المسجلة عليه. هل تريد المتابعة؟',
          confirmLabel: 'حذف الدين',
          variant: 'danger' as const,
        };
      case 'delete_payment':
        return {
          open: true,
          title: 'تأكيد حذف الدفعة',
          message: 'سيتم حذف هذه الدفعة وإرجاع قيمتها إلى المبلغ المتبقي على الدين. هل تريد المتابعة؟',
          confirmLabel: 'حذف الدفعة',
          variant: 'danger' as const,
        };
      case 'restore_backup':
        return {
          open: true,
          title: 'تأكيد استعادة النسخة الاحتياطية',
          message: `تحتوي النسخة على ${confirmState.data.people.length} أشخاص و ${confirmState.data.debts.length} دين. سيتم استبدال البيانات الحالية بهذه النسخة، هل تريد المتابعة؟`,
          confirmLabel: 'استعادة البيانات',
          variant: 'primary' as const,
        };
      case 'clear_all':
        return {
          open: true,
          title: 'تحذير: مسح جميع البيانات',
          message: 'سيتم حذف كل الأشخاص والديون والدفعات المحفوظة محلياً نهائياً. تأكد من أنك صدّرت نسخة احتياطية قبل المتابعة.',
          confirmLabel: 'مسح الكل نهائياً',
          variant: 'danger' as const,
        };
      case 'forgot_pin_reset':
        return {
          open: true,
          title: 'إعادة ضبط القفل ومسح البيانات',
          message: 'لحماية خصوصيتك وعدم وجود خادم خارجي، يتطلب تجاوز رمز PIN المنسي مسح جميع البيانات المحلية وإعادة التطبيق لحالته الأولية. هل تريد المتابعة؟',
          confirmLabel: 'نعم، مسح البيانات وإعادة الضبط',
          variant: 'danger' as const,
        };
      default:
        return {
          open: false,
          title: '',
          message: '',
          confirmLabel: 'تأكيد',
          variant: 'danger' as const,
        };
    }
  })();

  if (lockConfig.enabled && isLocked) {
    return (
      <>
        <LockScreen
          lockConfig={lockConfig}
          onUnlockSuccess={() => {
            updateLock((prev) => ({
              ...prev,
              failedAttempts: 0,
              lockedUntil: undefined,
            }));
            lastActivityRef.current = Date.now();
            setIsLocked(false);
          }}
          onFailedAttempt={(nextAttempts, lockedUntil) => {
            updateLock((prev) => ({
              ...prev,
              failedAttempts: nextAttempts,
              lockedUntil,
            }));
          }}
          onRequestForgotPinReset={() =>
            setConfirmState({ kind: 'forgot_pin_reset' })
          }
        />

        <ConfirmDialog
          open={confirmDialogProps.open}
          title={confirmDialogProps.title}
          message={confirmDialogProps.message}
          confirmLabel={confirmDialogProps.confirmLabel}
          variant={confirmDialogProps.variant}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmState({ kind: 'none' })}
        />

        <ToastContainer
          toasts={toasts}
          onDismiss={(id) =>
            setToasts((prev) => prev.filter((t) => t.id !== id))
          }
        />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row no-print">
        {/* Desktop Sidebar (RTL Right Side) */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 px-4 py-6 justify-between">
          <div className="space-y-8">
            <div className="px-3">
              <button
                type="button"
                onClick={() => handleNavClick('dashboard')}
                className="text-right block w-full"
              >
                <span className="text-xl font-bold tracking-tight text-[#0F2547] dark:text-white whitespace-nowrap">
                  دَيني | Dayni
                </span>
              </button>
            </div>

            <nav className="space-y-1.5" aria-label="التنقل الرئيسي">
              <button
                type="button"
                onClick={() => handleNavClick('dashboard')}
                className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'bg-[#0F2547] text-white dark:bg-sky-600'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Home className="w-5 h-5 shrink-0" />
                <span>الرئيسية</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('people')}
                className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors whitespace-nowrap ${
                  activeTab === 'people'
                    ? 'bg-[#0F2547] text-white dark:bg-sky-600'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Users className="w-5 h-5 shrink-0" />
                <span>الأشخاص</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('add')}
                className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors whitespace-nowrap"
              >
                <PlusCircle className="w-5 h-5 shrink-0" />
                <span>إضافة دين</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('reports')}
                className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors whitespace-nowrap ${
                  activeTab === 'reports'
                    ? 'bg-[#0F2547] text-white dark:bg-sky-600'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-5 h-5 shrink-0" />
                <span>التقارير</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('settings')}
                className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors whitespace-nowrap ${
                  activeTab === 'settings'
                    ? 'bg-[#0F2547] text-white dark:bg-sky-600'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Settings className="w-5 h-5 shrink-0" />
                <span>الإعدادات</span>
              </button>
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
            >
              <span>{theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-[#0F2547]" />
              )}
            </button>
          </div>
        </aside>

        {/* Main Content Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile / Tablet Compact Sticky Header (48px) */}
          <header className="lg:hidden sticky top-0 z-30 h-12 px-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => handleNavClick('dashboard')}
              className="text-base font-bold tracking-tight text-[#0F2547] dark:text-white whitespace-nowrap shrink-0"
            >
              دَيني | Dayni
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              {lockConfig.enabled && (
                <button
                  type="button"
                  onClick={handleLockNow}
                  aria-label="قفل التطبيق الآن"
                  title="قفل التطبيق الآن"
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={theme === 'dark' ? 'التبديل للوضع النهاري' : 'التبديل للوضع الليلي'}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('add')}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#0F2547] dark:bg-sky-600 text-white text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة دين</span>
              </button>
            </div>
          </header>

          {/* Desktop Top Header */}
          <header className="hidden lg:flex items-center justify-between gap-8 px-8 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
            <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
              {selectedPersonSummary
                ? `الأشخاص · ${selectedPersonSummary.person.name}`
                : activeTab === 'dashboard'
                ? 'لوحة التحكم الرئيسية'
                : activeTab === 'people'
                ? 'إدارة الأشخاص والديون'
                : activeTab === 'reports'
                ? 'التقارير والكشوفات'
                : 'الإعدادات والنسخ الاحتياطي'}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {lockConfig.enabled && (
                <button
                  type="button"
                  onClick={handleLockNow}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>قفل الآن</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setDebtModalPersonId(selectedPersonId ?? undefined);
                  setDebtModalOpen(true);
                }}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0F2547] hover:bg-[#193766] dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة دين جديد</span>
              </button>
            </div>
          </header>

          {/* Main Viewport */}
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-24 lg:pb-10">
            {!loaded ? (
              <div className="space-y-4">
                <div className="h-36 rounded-2xl bg-slate-200/70 dark:bg-slate-800 animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="h-28 rounded-2xl bg-slate-200/70 dark:bg-slate-800 animate-pulse" />
                  <div className="h-28 rounded-2xl bg-slate-200/70 dark:bg-slate-800 animate-pulse" />
                  <div className="h-28 rounded-2xl bg-slate-200/70 dark:bg-slate-800 animate-pulse" />
                </div>
              </div>
            ) : activeTab === 'dashboard' ? (
              <DashboardView
                metrics={dashboardMetrics}
                summaries={personSummaries}
                onAddDebt={() => {
                  setDebtModalPersonId(undefined);
                  setDebtModalOpen(true);
                }}
                onOpenPerson={handleOpenPerson}
                onViewPeople={(preset = 'all') => {
                  setSelectedPersonId(null);
                  setPeopleFilterPreset(preset);
                  setActiveTab('people');
                }}
              />
            ) : activeTab === 'people' && selectedPersonSummary ? (
              <PersonDetailView
                summary={selectedPersonSummary}
                debts={selectedPersonDebts}
                payments={selectedPersonPayments}
                onBack={() => setSelectedPersonId(null)}
                onAddDebt={() => {
                  setDebtModalPersonId(selectedPersonSummary.person.id);
                  setDebtModalOpen(true);
                }}
                onRecordPayment={(debtId) => {
                  setPaymentPersonId(selectedPersonSummary.person.id);
                  setPaymentDebtId(debtId);
                  setPaymentModalOpen(true);
                }}
                onEditPerson={() => {
                  setEditingPerson(selectedPersonSummary.person);
                  setPersonModalOpen(true);
                }}
                onDeletePerson={() =>
                  setConfirmState({
                    kind: 'delete_person',
                    personId: selectedPersonSummary.person.id,
                    name: selectedPersonSummary.person.name,
                  })
                }
                onDeleteDebt={(debtId) =>
                  setConfirmState({ kind: 'delete_debt', debtId })
                }
                onDeletePayment={(paymentId) =>
                  setConfirmState({ kind: 'delete_payment', paymentId })
                }
                onPrintStatement={() =>
                  handlePrintStatement(selectedPersonSummary.person.id)
                }
              />
            ) : activeTab === 'people' ? (
              <PeopleView
                summaries={personSummaries}
                initialStatusFilter={peopleFilterPreset}
                onOpenPerson={handleOpenPerson}
                onAddPerson={() => {
                  setEditingPerson(null);
                  setPersonModalOpen(true);
                }}
                onAddDebtForPerson={(pid) => {
                  setDebtModalPersonId(pid);
                  setDebtModalOpen(true);
                }}
                onQuickPay={(pid) => {
                  setPaymentPersonId(pid);
                  setPaymentDebtId(undefined);
                  setPaymentModalOpen(true);
                }}
              />
            ) : activeTab === 'reports' ? (
              <ReportsView
                metrics={dashboardMetrics}
                summaries={personSummaries}
                debts={computedDebts}
                payments={payments}
                onOpenPerson={handleOpenPerson}
                onPrintPersonStatement={handlePrintStatement}
                onNotify={notify}
              />
            ) : (
              <SettingsView
                theme={theme}
                peopleCount={people.length}
                debtsCount={debts.length}
                paymentsCount={payments.length}
                lockConfig={lockConfig}
                biometricSupported={biometricSupported}
                biometricBusy={biometricBusy}
                onToggleTheme={setTheme}
                onRequestEnablePin={() =>
                  setPinModalState({ open: true, mode: 'setup' })
                }
                onRequestChangePin={() =>
                  setPinModalState({ open: true, mode: 'change' })
                }
                onRequestDisablePin={() =>
                  setPinModalState({
                    open: true,
                    mode: 'verify',
                    action: 'disable_lock',
                  })
                }
                onToggleBiometric={handleToggleBiometric}
                onToggleAutoLockIdle={handleToggleAutoLockIdle}
                onLockNow={handleLockNow}
                onExportBackup={handleExportBackup}
                onSelectBackupFile={handleSelectBackupFile}
                onRequestClearAll={() => setConfirmState({ kind: 'clear_all' })}
              />
            )}
          </main>
        </div>

        {/* Mobile Bottom Navigation Bar (5 Items) */}
        <nav
          aria-label="شريط التنقل السفلي"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
        >
          <div className="grid grid-cols-5 items-center h-14 px-1">
            <button
              type="button"
              onClick={() => handleNavClick('dashboard')}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                activeTab === 'dashboard'
                  ? 'text-[#0F2547] dark:text-sky-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 font-medium'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px] leading-none whitespace-nowrap">
                الرئيسية
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('people')}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                activeTab === 'people'
                  ? 'text-[#0F2547] dark:text-sky-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 font-medium'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px] leading-none whitespace-nowrap">
                الأشخاص
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('add')}
              className="min-h-[48px] flex flex-col items-center justify-center gap-0.5 text-[#0F2547] dark:text-sky-400 font-bold"
            >
              <span className="w-7 h-7 rounded-lg bg-[#0F2547] dark:bg-sky-600 text-white flex items-center justify-center shadow-xs">
                <Plus className="w-4 h-4" />
              </span>
              <span className="text-[10px] leading-none whitespace-nowrap">
                إضافة دين
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('reports')}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                activeTab === 'reports'
                  ? 'text-[#0F2547] dark:text-sky-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 font-medium'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-[10px] leading-none whitespace-nowrap">
                التقارير
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('settings')}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                activeTab === 'settings'
                  ? 'text-[#0F2547] dark:text-sky-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 font-medium'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-[10px] leading-none whitespace-nowrap">
                الإعدادات
              </span>
            </button>
          </div>
        </nav>
      </div>

      {/* Modals */}
      <PersonFormModal
        open={personModalOpen}
        editingPerson={editingPerson}
        onClose={() => {
          setPersonModalOpen(false);
          setEditingPerson(null);
        }}
        onSave={handleSavePerson}
      />

      <DebtFormModal
        open={debtModalOpen}
        people={people}
        initialPersonId={debtModalPersonId}
        onClose={() => setDebtModalOpen(false)}
        onSaveDebt={handleSaveDebt}
      />

      <PaymentFormModal
        open={paymentModalOpen}
        person={paymentTargetPerson}
        openDebts={paymentTargetOpenDebts}
        preselectedDebtId={paymentDebtId}
        onClose={() => {
          setPaymentModalOpen(false);
          setPaymentPersonId(null);
          setPaymentDebtId(undefined);
        }}
        onRecordPayment={handleRecordPayment}
      />

      <PinSetupModal
        open={pinModalState.open}
        mode={pinModalState.mode}
        subtitle={
          pinModalState.action === 'disable_lock'
            ? `أدخل رمز PIN الحالي (${lockConfig.pinLength} أرقام) لتعطيل القفل`
            : pinModalState.action === 'enable_biometric'
            ? `أدخل رمز PIN الحالي (${lockConfig.pinLength} أرقام) قبل تفعيل البصمة`
            : undefined
        }
        currentPinLength={lockConfig.pinLength}
        currentSalt={lockConfig.pinSalt}
        currentHash={lockConfig.pinHash}
        onClose={() => setPinModalState({ open: false, mode: 'setup' })}
        onCompleteSetup={handleCompletePinSetup}
        onCompleteVerify={handlePinVerifiedAction}
      />

      <ConfirmDialog
        open={confirmDialogProps.open}
        title={confirmDialogProps.title}
        message={confirmDialogProps.message}
        confirmLabel={confirmDialogProps.confirmLabel}
        variant={confirmDialogProps.variant}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmState({ kind: 'none' })}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) =>
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }
      />

      <PrintStatement
        summary={printSummary}
        debts={printDebts}
        payments={printPayments}
      />
    </>
  );
}
