import React from 'react';
import { AppData } from '../../types';
import { PersonnelRegionalManager } from '../management/PersonnelRegionalManager';
import { FinancialEnforcementManager } from '../management/FinancialEnforcementManager';

interface ManagementProps {
    data: AppData;
    updateData: (data: Partial<AppData>) => void;
    formatMoney: (val: number, sym: string) => string;
    onDirtyChange?: (isDirty: boolean) => void;
    onLogout?: () => void;
}

export const DesktopIdentity: React.FC<ManagementProps> = ({ data, updateData, formatMoney, onDirtyChange, onLogout }) => (
    <PersonnelRegionalManager data={data} updateData={updateData} formatMoney={formatMoney} isCompact={false} onDirtyChange={onDirtyChange} onLogout={onLogout} />
);

export const DesktopControl: React.FC<ManagementProps> = ({ data, updateData, formatMoney }) => (
    <FinancialEnforcementManager data={data} updateData={updateData} formatMoney={formatMoney} isCompact={false} />
);
