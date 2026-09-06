
import { AppData, TransactionType, Category, CategoryItem } from '../types';

const DB_NAME = 'TrackXpenseDB';
const DB_VERSION = 1;
const STORE_NAME = 'appData';
const DATA_KEY = 'fullState';

const DEFAULT_CATEGORIES: CategoryItem[] = [
    { id: 'cat_salary', name: Category.SALARY, type: TransactionType.INCOME, color: '#5b9a7d', isSystem: true },
    { id: 'cat_gig', name: Category.GIG, type: TransactionType.INCOME, color: '#6b8db5', isSystem: true },
    { id: 'cat_tuition', name: Category.TUITION, type: TransactionType.INCOME, color: '#8b7db5', isSystem: true },
    { id: 'cat_loan_in', name: Category.LOAN, type: TransactionType.INCOME, color: '#b5944e', isSystem: true },
    
    { id: 'cat_break', name: Category.BREAKFAST, type: TransactionType.EXPENSE, color: '#b58b5e', isSystem: true },
    { id: 'cat_lunch', name: Category.LUNCH, type: TransactionType.EXPENSE, color: '#b57a4e', isSystem: true },
    { id: 'cat_dinner', name: Category.DINNER, type: TransactionType.EXPENSE, color: '#a5694e', isSystem: true },
    { id: 'cat_fp', name: Category.FOOD_DELIVERY, type: TransactionType.EXPENSE, color: '#a56b6b', isSystem: true },
    { id: 'cat_snack', name: Category.SNACKS, type: TransactionType.EXPENSE, color: '#b5a55e', isSystem: true },
    { id: 'cat_loan_out', name: Category.LOAN_PAYMENT, type: TransactionType.EXPENSE, color: '#a56b6b', isSystem: true },
    { id: 'cat_trans', name: Category.TRANSPORT, type: TransactionType.EXPENSE, color: '#6b9ab5', isSystem: true },
    { id: 'cat_shop', name: Category.SHOPPING, type: TransactionType.EXPENSE, color: '#a56b8b', isSystem: true },
    { id: 'cat_bill', name: Category.BILLS, type: TransactionType.EXPENSE, color: '#a59a4e', isSystem: true },
    { id: 'cat_ent', name: Category.ENTERTAINMENT, type: TransactionType.EXPENSE, color: '#8b6ba5', isSystem: true },
    { id: 'cat_health', name: Category.HEALTH, type: TransactionType.EXPENSE, color: '#5b9a7d', isSystem: true },
    { id: 'cat_other', name: Category.OTHER, type: TransactionType.EXPENSE, color: '#7a8595', isSystem: true },
    { id: 'cat_transfer', name: Category.TRANSFER, type: TransactionType.EXPENSE, color: '#5e6b7a', isSystem: true },
];

const LEGACY_MUTED_COLOR_MAP: Record<string, string> = {
  '#10b981': '#5b9a7d',
  '#3b82f6': '#6b8db5',
  '#8b5cf6': '#8b7db5',
  '#f59e0b': '#b5944e',
  '#fb923c': '#b58b5e',
  '#f97316': '#b57a4e',
  '#ea580c': '#a5694e',
  '#ef4444': '#a56b6b',
  '#fcd34d': '#b5a55e',
  '#38bdf8': '#6b9ab5',
  '#ec4899': '#a56b8b',
  '#eab308': '#a59a4e',
  '#a855f7': '#8b6ba5',
  '#94a3b8': '#7a8595',
  '#64748b': '#5e6b7a'
};

const DEFAULT_DATA: AppData = {
  wallets: [{ id: 'main', name: 'Main Wallet', type: 'STANDARD', color: 'amber' }],
  transactions: [],
  debts: [],
  categories: DEFAULT_CATEGORIES,
  currentWalletId: 'main',
  settings: {
    theme: 'amber',
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
    groqApiKey: '', // Key is managed server-side; not stored on client
    enableAiParsing: false,
    keepLastMessageOnTop: true
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

// Legacy jargon cleansing deprecated - preserve user's genuine names
export const sanitizeJargon = (data: AppData): AppData => data;

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
            const lsData = localStorage.getItem('trackxpense_state') || localStorage.getItem('zenwallet_v4_data');
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
        const rawWallets = result.wallets || DEFAULT_DATA.wallets;
        const migratedWallets = rawWallets.map((w: any) => ({ 
            ...w, 
            type: w.type || 'STANDARD',
            color: (!w.color || w.color === 'indigo') ? 'amber' : w.color
        }));

        const rawSettings = { ...DEFAULT_DATA.settings, ...result.settings };
        const migratedSettings = {
            ...rawSettings,
            theme: (!rawSettings.theme || rawSettings.theme === 'indigo') ? 'amber' : rawSettings.theme,
            enableAiParsing: Boolean(result.settings?.enableAiParsing),
            keepLastMessageOnTop: result.settings?.keepLastMessageOnTop !== undefined ? Boolean(result.settings.keepLastMessageOnTop) : true
        };

        const mergedData: AppData = {
          ...DEFAULT_DATA,
          ...result,
          wallets: migratedWallets,
          categories: (result.categories && result.categories.length > 0 ? result.categories : DEFAULT_CATEGORIES).map((c: any) => ({
            ...c,
            color: LEGACY_MUTED_COLOR_MAP[c.color] || c.color
          })),
          transactions: (result.transactions || []).map((t: any, idx: number) => ({
            ...t,
            id: t.id ? String(t.id) : `tx_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`
          })),
          debts: result.debts || [],
          settings: migratedSettings,
          profile: { ...DEFAULT_DATA.profile, ...result.profile },
          provisions: result.provisions || [],
          lastUsedCategoryMap: result.lastUsedCategoryMap || {},
          balanceHistory: result.balanceHistory || [],
          templates: result.templates || [],
          streaks: result.streaks || {},
          recurringRules: result.recurringRules || []
        };

        if (isMigration || !result.wallets || !result.transactions || result.settings?.theme === 'indigo') {
            saveAppData(mergedData);
        }

        resolve(mergedData);
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
  try {
      const activeWallet = data.wallets.find(w => w.id === data.currentWalletId);
      const activeTheme = (activeWallet?.color && activeWallet.color !== 'indigo') ? activeWallet.color : (data.settings?.theme && data.settings.theme !== 'indigo' ? data.settings.theme : 'amber');
      localStorage.setItem('trackxpense_state', JSON.stringify({
          settings: {
              ...data.settings,
              theme: activeTheme
          }, // Only save settings for quick boot
          profile: data.profile 
      }));
  } catch (e) {}

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, DATA_KEY);

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
      localStorage.removeItem('trackxpense_state');
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

export const wipeAllSiteData = async (): Promise<void> => {
  try {
    await clearAppData();
  } catch (e) {}
  try {
    localStorage.clear();
  } catch (e) {}
  try {
    sessionStorage.clear();
  } catch (e) {}
  window.location.reload();
};

