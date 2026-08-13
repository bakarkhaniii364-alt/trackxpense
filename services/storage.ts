
import { AppData, TransactionType, Category, CategoryItem } from '../types';

const DB_NAME = 'ZenWalletDB';
const DB_VERSION = 1;
const STORE_NAME = 'appData';
const DATA_KEY = 'fullState';

const DEFAULT_CATEGORIES: CategoryItem[] = [
    { id: 'cat_salary', name: Category.SALARY, type: TransactionType.INCOME, color: '#10b981', isSystem: true },
    { id: 'cat_gig', name: Category.GIG, type: TransactionType.INCOME, color: '#3b82f6', isSystem: true },
    { id: 'cat_tuition', name: Category.TUITION, type: TransactionType.INCOME, color: '#8b5cf6', isSystem: true },
    { id: 'cat_loan_in', name: Category.LOAN, type: TransactionType.INCOME, color: '#f59e0b', isSystem: true },
    
    { id: 'cat_break', name: Category.BREAKFAST, type: TransactionType.EXPENSE, color: '#fb923c', isSystem: true },
    { id: 'cat_lunch', name: Category.LUNCH, type: TransactionType.EXPENSE, color: '#f97316', isSystem: true },
    { id: 'cat_dinner', name: Category.DINNER, type: TransactionType.EXPENSE, color: '#ea580c', isSystem: true },
    { id: 'cat_fp', name: Category.FOODPANDA, type: TransactionType.EXPENSE, color: '#ef4444', isSystem: true },
    { id: 'cat_snack', name: Category.SNACKS, type: TransactionType.EXPENSE, color: '#fcd34d', isSystem: true },
    { id: 'cat_loan_out', name: Category.LOAN_PAYMENT, type: TransactionType.EXPENSE, color: '#ef4444', isSystem: true },
    { id: 'cat_trans', name: Category.TRANSPORT, type: TransactionType.EXPENSE, color: '#38bdf8', isSystem: true },
    { id: 'cat_shop', name: Category.SHOPPING, type: TransactionType.EXPENSE, color: '#ec4899', isSystem: true },
    { id: 'cat_bill', name: Category.BILLS, type: TransactionType.EXPENSE, color: '#eab308', isSystem: true },
    { id: 'cat_ent', name: Category.ENTERTAINMENT, type: TransactionType.EXPENSE, color: '#a855f7', isSystem: true },
    { id: 'cat_health', name: Category.HEALTH, type: TransactionType.EXPENSE, color: '#10b981', isSystem: true },
    { id: 'cat_other', name: Category.OTHER, type: TransactionType.EXPENSE, color: '#94a3b8', isSystem: true },
    { id: 'cat_transfer', name: Category.TRANSFER, type: TransactionType.EXPENSE, color: '#64748b', isSystem: true },
];

const DEFAULT_DATA: AppData = {
  wallets: [{ id: 'main', name: 'Main Wallet', type: 'STANDARD', color: 'indigo' }],
  transactions: [],
  debts: [],
  categories: DEFAULT_CATEGORIES,
  currentWalletId: 'main',
  settings: {
    theme: 'indigo',
    darkMode: true,
    notificationsEnabled: false,
    expenseReminders: false,
    debtReminders: false,
    privacyMode: false,
    lastOpened: new Date().toISOString(),
    currencySymbol: 'BDT',
    budgetLimits: {},
    hasOnboarded: false,
    vaultPasscode: '',
    isVaultLocked: false,
    stealthModeEnabled: false,
    stealthHotkey: 'Escape',
    hapticsEnabled: true,
    groqApiKey: import.meta.env.VITE_GROQ_API_KEY || '',
    enableAiParsing: true
  },
  profile: {
    name: 'User',
    monthlyGoal: 5000,
    dailyGoal: 0 
  },
  provisions: [],
  lastUsedCategoryMap: {},
  balanceHistory: [],
  templates: [],
  streaks: {},
  recurringRules: []
};

// --- IndexedDB Wrapper ---

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

export const sanitizeJargon = (data: AppData): AppData => {
  const sanitized = { ...data };
  if (sanitized.profile?.name && /sovereign/i.test(sanitized.profile.name)) {
    sanitized.profile.name = 'User';
  }
  if (sanitized.wallets) {
    sanitized.wallets = sanitized.wallets.map((w: any) => {
      if (w.name && /sovereign/i.test(w.name)) {
        return { ...w, name: w.name.replace(/sovereign\s*/gi, '') || 'Main Wallet' };
      }
      return w;
    });
  }
  return sanitized;
};

export const getAppData = async (): Promise<AppData> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(DATA_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        let result = request.result;
        let isMigration = false;
        
        // Fallback to LocalStorage for migration if IndexedDB is empty
        if (!result) {
            const lsData = localStorage.getItem('zenwallet_v4_data');
            if (lsData) {
                try {
                    result = JSON.parse(lsData);
                    isMigration = true;
                } catch (e) {}
            }
        }

        if (!result) {
            resolve(DEFAULT_DATA);
            return;
        }

        // Robust merge logic
        const mergedData: AppData = {
          ...DEFAULT_DATA,
          ...result,
          wallets: (result.wallets || DEFAULT_DATA.wallets).map((w: any) => ({ 
              ...w, 
              type: w.type || 'STANDARD' 
          })),
          categories: result.categories && result.categories.length > 0 ? result.categories : DEFAULT_CATEGORIES,
          transactions: result.transactions || [],
          debts: result.debts || [],
          settings: { ...DEFAULT_DATA.settings, ...result.settings },
          profile: { ...DEFAULT_DATA.profile, ...result.profile },
          provisions: result.provisions || [],
          lastUsedCategoryMap: result.lastUsedCategoryMap || {},
          balanceHistory: result.balanceHistory || [],
          templates: result.templates || [],
          streaks: result.streaks || {},
          recurringRules: result.recurringRules || []
        };

        // Cleanse legacy jargon
        const cleansedData = sanitizeJargon(mergedData);

        // If we migrated or handled incomplete data, sync it back to DB
        if (isMigration || !result.wallets || !result.transactions || /sovereign/i.test(result.profile?.name || '') || (result.wallets || []).some((w: any) => /sovereign/i.test(w.name || ''))) {
            saveAppData(cleansedData);
        }

        resolve(cleansedData);
      };
    });
  } catch (error) {
    console.error("DB Error:", error);
    return DEFAULT_DATA;
  }
};

export const saveAppData = async (data: AppData): Promise<void> => {
  // We still update localStorage for the theme-loader in index.html, 
  // but main data lives in IndexedDB
  const sanitizedData = sanitizeJargon(data);
  try {
      const activeWallet = sanitizedData.wallets.find(w => w.id === sanitizedData.currentWalletId);
      const activeTheme = activeWallet?.color || 'indigo';
      localStorage.setItem('zenwallet_v4_data', JSON.stringify({
          settings: {
              ...sanitizedData.settings,
              theme: activeTheme
          }, // Only save settings for quick boot
          profile: sanitizedData.profile 
      }));
  } catch (e) {}

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(sanitizedData, DATA_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error("DB Save Error:", error);
  }
};

export const addToSyncQueue = async (item: { table: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', payload: any }): Promise<void> => {
    try {
        const db = await openDB();
        const transaction = db.transaction('syncQueue', 'readwrite');
        const store = transaction.objectStore('syncQueue');
        await store.add({ ...item, timestamp: Date.now() });
    } catch (e) {
        console.error("Sync Queue Error:", e);
    }
};

export const getSyncQueue = async (): Promise<any[]> => {
    try {
        const db = await openDB();
        const transaction = db.transaction('syncQueue', 'readonly');
        const store = transaction.objectStore('syncQueue');
        return new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
        });
    } catch (e) {
        return [];
    }
};

export const removeFromSyncQueue = async (id: number): Promise<void> => {
    try {
        const db = await openDB();
        const transaction = db.transaction('syncQueue', 'readwrite');
        const store = transaction.objectStore('syncQueue');
        await store.delete(id);
    } catch (e) {}
};

export const clearAppData = async (): Promise<void> => {
  try {
      localStorage.removeItem('zenwallet_v4_data');
  } catch (e) {}
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME, 'syncQueue'], 'readwrite');
    await transaction.objectStore(STORE_NAME).delete(DATA_KEY);
    await transaction.objectStore('syncQueue').clear();
  } catch (error) {
    console.error("DB Clear Error:", error);
  }
};
