import {
  AppSettings,
  BackupPayload,
  DebtRecord,
  PaymentRecord,
  Person,
} from '../types/debt';

const DB_NAME = 'dayni_debt_manager_db';
const DB_VERSION = 1;
const SETTINGS_KEY = 'dayni_settings_v1';
const FALLBACK_DATA_KEY = 'dayni_fallback_data_v1';

export interface StoredDataset {
  people: Person[];
  debts: DebtRecord[];
  payments: PaymentRecord[];
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open IndexedDB'));
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('people')) {
        db.createObjectStore('people', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('debts')) {
        db.createObjectStore('debts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('payments')) {
        db.createObjectStore('payments', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function readAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

function saveFallback(data: StoredDataset): void {
  try {
    localStorage.setItem(FALLBACK_DATA_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota errors on fallback mirror
  }
}

function loadFallback(): StoredDataset {
  try {
    const raw = localStorage.getItem(FALLBACK_DATA_KEY);
    if (!raw) return { people: [], debts: [], payments: [] };
    const parsed = JSON.parse(raw) as Partial<StoredDataset>;
    return {
      people: Array.isArray(parsed.people) ? parsed.people : [],
      debts: Array.isArray(parsed.debts) ? parsed.debts : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
    };
  } catch {
    return { people: [], debts: [], payments: [] };
  }
}

export async function loadAllData(): Promise<StoredDataset> {
  try {
    const db = await openDatabase();
    const [people, debts, payments] = await Promise.all([
      readAllFromStore<Person>(db, 'people'),
      readAllFromStore<DebtRecord>(db, 'debts'),
      readAllFromStore<PaymentRecord>(db, 'payments'),
    ]);
    db.close();

    // If IndexedDB is empty but fallback exists (e.g. migration), check fallback
    if (people.length === 0 && debts.length === 0 && payments.length === 0) {
      const fb = loadFallback();
      if (fb.people.length > 0 || fb.debts.length > 0 || fb.payments.length > 0) {
        await replaceAllData(fb);
        return fb;
      }
    }

    return { people, debts, payments };
  } catch {
    return loadFallback();
  }
}

export async function replaceAllData(data: StoredDataset): Promise<void> {
  saveFallback(data);
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['people', 'debts', 'payments'], 'readwrite');
      const peopleStore = tx.objectStore('people');
      const debtsStore = tx.objectStore('debts');
      const paymentsStore = tx.objectStore('payments');

      peopleStore.clear();
      debtsStore.clear();
      paymentsStore.clear();

      for (const p of data.people) peopleStore.put(p);
      for (const d of data.debts) debtsStore.put(d);
      for (const pay of data.payments) paymentsStore.put(pay);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Fallback already saved
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { theme: 'light', currency: 'DZD' };
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
      currency: 'DZD',
    };
  } catch {
    return { theme: 'light', currency: 'DZD' };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage error
  }
}

export function buildBackupPayload(data: StoredDataset): BackupPayload {
  return {
    app: 'Dayni',
    version: 1,
    exportedAt: new Date().toISOString(),
    people: data.people,
    debts: data.debts,
    payments: data.payments,
  };
}

export function parseAndValidateBackup(rawJson: string): StoredDataset {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('الملف المحدد ليس ملف JSON صالحاً.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('بنية ملف النسخة الاحتياطية غير صحيحة.');
  }

  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.people) || !Array.isArray(obj.debts) || !Array.isArray(obj.payments)) {
    throw new Error('ملف النسخة الاحتياطية يفتقد إلى البيانات المطلوبة (الأشخاص أو الديون أو الدفعات).');
  }

  const seenPersonIds = new Set<string>();
  const people: Person[] = [];
  for (const item of obj.people) {
    if (!item || typeof item !== 'object') continue;
    const p = item as Record<string, unknown>;
    if (typeof p.id !== 'string' || typeof p.name !== 'string' || !p.name.trim()) continue;
    if (seenPersonIds.has(p.id)) continue;
    seenPersonIds.add(p.id);
    people.push({
      id: p.id,
      name: p.name.trim(),
      phone: typeof p.phone === 'string' ? p.phone : undefined,
      avatarDataUrl: typeof p.avatarDataUrl === 'string' ? p.avatarDataUrl : undefined,
      createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
      updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : new Date().toISOString(),
    });
  }

  const seenDebtIds = new Set<string>();
  const debts: DebtRecord[] = [];
  for (const item of obj.debts) {
    if (!item || typeof item !== 'object') continue;
    const d = item as Record<string, unknown>;
    const amount = Number(d.amount);
    if (
      typeof d.id !== 'string' ||
      typeof d.personId !== 'string' ||
      !seenPersonIds.has(d.personId) ||
      (d.direction !== 'lent' && d.direction !== 'borrowed') ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      typeof d.date !== 'string'
    ) {
      continue;
    }
    if (seenDebtIds.has(d.id)) continue;
    seenDebtIds.add(d.id);
    debts.push({
      id: d.id,
      personId: d.personId,
      direction: d.direction,
      amount,
      date: d.date,
      dueDate: typeof d.dueDate === 'string' && d.dueDate ? d.dueDate : undefined,
      notes: typeof d.notes === 'string' ? d.notes : undefined,
      createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
      updatedAt: typeof d.updatedAt === 'string' ? d.updatedAt : new Date().toISOString(),
    });
  }

  const seenPaymentIds = new Set<string>();
  const payments: PaymentRecord[] = [];
  for (const item of obj.payments) {
    if (!item || typeof item !== 'object') continue;
    const pay = item as Record<string, unknown>;
    const amount = Number(pay.amount);
    if (
      typeof pay.id !== 'string' ||
      typeof pay.debtId !== 'string' ||
      typeof pay.personId !== 'string' ||
      !seenDebtIds.has(pay.debtId) ||
      !seenPersonIds.has(pay.personId) ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      typeof pay.date !== 'string'
    ) {
      continue;
    }
    if (seenPaymentIds.has(pay.id)) continue;
    seenPaymentIds.add(pay.id);
    payments.push({
      id: pay.id,
      debtId: pay.debtId,
      personId: pay.personId,
      amount,
      date: pay.date,
      notes: typeof pay.notes === 'string' ? pay.notes : undefined,
      createdAt: typeof pay.createdAt === 'string' ? pay.createdAt : new Date().toISOString(),
    });
  }

  return { people, debts, payments };
}
