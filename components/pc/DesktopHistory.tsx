import React from 'react';
import { HistoryView } from '../HistoryView';
import { AppData, Transaction } from '../../types';

interface DesktopHistoryProps {
  data: AppData;
  updateData?: (d: Partial<AppData>) => void;
  onRequestDelete: (id: string) => void;
  formatMoney: (val: number, sym: string) => string;
  onEditTransaction: (t: Transaction) => void;
}

export const DesktopHistory: React.FC<DesktopHistoryProps> = (props) => {
  return <HistoryView {...props} isDesktop={true} />;
};
