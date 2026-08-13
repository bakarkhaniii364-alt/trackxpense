import { AppData, Transaction, TransactionType, Category, Debt, Provision, TransactionTemplate } from '../types';

export const getSampleData = (walletId: string): {
  transactions: Transaction[];
  debts: Debt[];
  provisions: Provision[];
  templates: TransactionTemplate[];
} => {
  const now = new Date();
  
  // Dates relative to current time
  const todayStr = now.toISOString();
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString();
  
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysAgoStr = threeDaysAgo.toISOString();

  const fiveDaysAgo = new Date(now);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const fiveDaysAgoStr = fiveDaysAgo.toISOString();

  const sampleTransactions: Transaction[] = [
    {
      id: 'sample_tx_1',
      amount: 3500,
      type: TransactionType.INCOME,
      category: Category.SALARY,
      date: fiveDaysAgoStr,
      note: 'Monthly Salary Deposit',
      walletId
    },
    {
      id: 'sample_tx_2',
      amount: 145,
      type: TransactionType.EXPENSE,
      category: Category.SHOPPING,
      date: threeDaysAgoStr,
      note: 'Weekly Grocery Run at Supermarket',
      walletId
    },
    {
      id: 'sample_tx_3',
      amount: 15,
      type: TransactionType.EXPENSE,
      category: Category.BREAKFAST,
      date: yesterdayStr,
      note: 'Morning Espresso & Croissant',
      walletId
    },
    {
      id: 'sample_tx_4',
      amount: 65,
      type: TransactionType.EXPENSE,
      category: Category.BILLS,
      date: yesterdayStr,
      note: 'High-speed Fiber Internet Bill',
      walletId
    },
    {
      id: 'sample_tx_5',
      amount: 35,
      type: TransactionType.EXPENSE,
      category: Category.LUNCH,
      date: todayStr,
      note: 'Ramen & Green Tea Lunch Special',
      walletId
    },
    {
      id: 'sample_tx_6',
      amount: 25,
      type: TransactionType.EXPENSE,
      category: Category.TRANSPORT,
      date: todayStr,
      note: 'City Express Transit Fare',
      walletId
    }
  ];

  const sampleDebts: Debt[] = [
    {
      id: 'sample_debt_1',
      person: 'Alex Rivera',
      amount: 50,
      type: 'OWES_ME',
      note: 'Concert ticket advance',
      dueDate: new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0],
      isSettled: false,
      payments: []
    },
    {
      id: 'sample_debt_2',
      person: 'Sam Chen',
      amount: 30,
      type: 'I_OWE',
      note: 'Shared dinner bill',
      dueDate: new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0],
      isSettled: false,
      payments: []
    }
  ];

  const sampleProvisions: Provision[] = [
    {
      id: 'sample_prov_1',
      name: 'Apartment Lease Rent',
      amount: 1200,
      date: new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0]
    },
    {
      id: 'sample_prov_2',
      name: 'Electricity & Gas Reserve',
      amount: 110,
      date: new Date(now.getTime() + 10 * 86400000).toISOString().split('T')[0]
    }
  ];

  const sampleTemplates: TransactionTemplate[] = [
    {
      id: 'sample_tmpl_1',
      name: 'Morning Coffee',
      amount: 5,
      type: TransactionType.EXPENSE,
      category: Category.BREAKFAST,
      note: 'Daily Espresso'
    },
    {
      id: 'sample_tmpl_2',
      name: 'Subway Ride',
      amount: 3,
      type: TransactionType.EXPENSE,
      category: Category.TRANSPORT,
      note: 'Metro Pass'
    }
  ];

  return {
    transactions: sampleTransactions,
    debts: sampleDebts,
    provisions: sampleProvisions,
    templates: sampleTemplates
  };
};

export const seedSampleData = (data: AppData, updateData: (d: Partial<AppData>) => void): void => {
  const currentWalletId = data.currentWalletId || (data.wallets && data.wallets[0]?.id) || 'main';
  const samples = getSampleData(currentWalletId);

  // Merge sample data into existing arrays without overriding existing data
  const updatedTransactions = [...data.transactions, ...samples.transactions];
  const updatedDebts = [...data.debts, ...samples.debts];
  const updatedProvisions = [...(data.provisions || []), ...samples.provisions];
  const updatedTemplates = [...(data.templates || []), ...samples.templates];

  updateData({
    transactions: updatedTransactions,
    debts: updatedDebts,
    provisions: updatedProvisions,
    templates: updatedTemplates
  });
};
