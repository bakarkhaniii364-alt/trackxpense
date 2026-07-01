import { Transaction, AppData, TransactionType } from '../types';

export const generateCSV = (transactions: Transaction[], currency: string) => {
  const headers = ['Date', 'Type', 'Category', 'Amount', 'Currency', 'Note'];
  const rows = transactions.map(t => [
    new Date(t.date).toLocaleDateString(),
    t.type,
    t.category,
    t.amount.toFixed(2),
    currency,
    `"${t.note || ''}"`
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

export const downloadFile = (content: string, fileName: string, contentType: string) => {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
};
