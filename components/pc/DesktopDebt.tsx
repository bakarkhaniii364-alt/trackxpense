import React from 'react';
import { DebtView } from '../DebtView';
import { AppData, Transaction } from '../../types';

interface DesktopDebtProps {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
  formatMoney: (val: number, sym: string) => string;
  onSettleTransaction: (t: Transaction) => void;
  onAddPayment: (debtId: string, payment: any) => void;
}

export const DesktopDebt: React.FC<DesktopDebtProps> = (props) => {
  return <DebtView {...props} isDesktop={true} />;
};
