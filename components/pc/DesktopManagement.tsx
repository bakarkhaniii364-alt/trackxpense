import React from 'react';
import { AppData } from '../../types';
import { ProfileSettings } from '../management/ProfileSettings';
import { BudgetSettings } from '../management/BudgetSettings';

interface ManagementProps {
    data: AppData;
    updateData: (data: Partial<AppData>) => void;
    formatMoney: (val: number, sym: string) => string;
    onDirtyChange?: (isDirty: boolean) => void;
    onLogout?: () => void;
    initialTab?: 'general' | 'wallets' | 'data_security';
    onTabChange?: (tab: 'general' | 'wallets' | 'data_security') => void;
}

export const DesktopIdentity: React.FC<ManagementProps> = ({ 
    data, 
    updateData, 
    formatMoney, 
    onDirtyChange, 
    onLogout,
    initialTab,
    onTabChange 
}) => (
    <ProfileSettings 
        data={data} 
        updateData={updateData} 
        formatMoney={formatMoney} 
        isCompact={false} 
        onDirtyChange={onDirtyChange} 
        onLogout={onLogout}
        initialTab={initialTab}
        onTabChange={onTabChange}
    />
);

export const DesktopControl: React.FC<ManagementProps> = ({ data, updateData, formatMoney }) => (
    <BudgetSettings data={data} updateData={updateData} formatMoney={formatMoney} isCompact={false} />
);
