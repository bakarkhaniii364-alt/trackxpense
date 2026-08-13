import React from 'react';
import { AppData } from '../../types';
import { StreakDisplay } from './StreakDisplay';
import { LocalAdvisor } from './LocalAdvisor';

interface IntelligenceRunwayProps {
    data: AppData;
    formatMoney: (val: number, sym: string) => string;
}

export const IntelligenceRunway: React.FC<IntelligenceRunwayProps> = ({ data, formatMoney }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LocalAdvisor data={data} formatMoney={formatMoney} />
            <StreakDisplay data={data} />
        </div>
    );
};
