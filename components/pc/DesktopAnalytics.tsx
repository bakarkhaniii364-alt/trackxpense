import React from 'react';
import { AppData } from '../../types';
import { AnalyticsView } from '../AnalyticsView';

interface DesktopAnalyticsProps {
  data: AppData;
  updateData?: (d: Partial<AppData>) => void;
  formatMoney: (val: number, sym: string) => string;
}

export const DesktopAnalytics: React.FC<DesktopAnalyticsProps> = ({ data, updateData, formatMoney }) => {
  return (
    <div className="w-full p-2 lg:p-4">
      <AnalyticsView data={data} updateData={updateData} formatMoney={formatMoney} />
    </div>
  );
};
