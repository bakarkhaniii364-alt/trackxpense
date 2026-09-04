import React from 'react';
import { Transaction, TransactionType, CategoryItem } from '../../types';
import { NoDataWave } from '../shared/NoDataWave';

interface SankeyChartProps {
    transactions?: Transaction[];
    categories?: CategoryItem[];
}

export const SankeyChart: React.FC<SankeyChartProps> = ({ transactions = [], categories = [] }) => {
    const incomeCats: Record<string, number> = {};
    const expenseCats: Record<string, number> = {};
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
        if (t.type === TransactionType.INCOME) {
            incomeCats[t.category] = (incomeCats[t.category] || 0) + t.amount;
            totalIncome += t.amount;
        } else if (t.type === TransactionType.EXPENSE) {
            expenseCats[t.category] = (expenseCats[t.category] || 0) + t.amount;
            totalExpense += t.amount;
        }
    });

    const savings = Math.max(0, totalIncome - totalExpense);
    const deficit = Math.max(0, totalExpense - totalIncome);
    const sortedIncomes = Object.entries(incomeCats).sort((a,b) => b[1] - a[1]);
    const sortedExpenses = Object.entries(expenseCats).sort((a,b) => b[1] - a[1]);

    if (totalIncome === 0 && totalExpense === 0) {
        return (
            <div className="bg-[var(--bg-surface)] rounded-[8px] p-6 border border-[var(--border-default)]">
                <div className="flex items-center justify-between pb-4">
                    <span className="text-[10px] uppercase font-medium text-[var(--text-muted)] tracking-[0.06em]">
                        CASH FLOW ANALYSIS
                    </span>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">0.00</span>
                </div>
                <NoDataWave height={180} />
            </div>
        );
    }

    const width = 320;
    const height = Math.max(300, Math.max(sortedIncomes.length, sortedExpenses.length) * 40);
    const padding = 20;
    const barWidth = 10;
    const graphHeight = height - (padding * 2);
    const totalFlow = Math.max(totalIncome, totalExpense);
    const scale = totalFlow > 0 ? graphHeight / totalFlow : 0;

    const leftX = padding;
    const rightX = width - padding - barWidth;
    let leftY = padding;
    let rightY = padding;

    const links: React.ReactElement[] = [];
    const nodes: React.ReactElement[] = [];
    const safeCategories = categories || [];

    sortedIncomes.forEach(([name, amount]) => {
        const nodeHeight = amount * scale;
        const color = safeCategories.find(c => c && c.name === name)?.color || '#10b981';
        nodes.push(
            <g key={`l-${name}`}>
                <rect x={leftX} y={leftY} width={barWidth} height={nodeHeight} fill={color} rx={4} />
                <text x={leftX + 14} y={leftY + nodeHeight/2 + 4} className="text-[9px] fill-muted" textAnchor="start">{name}</text>
            </g>
        );
        leftY += nodeHeight + 5;
    });

    if (deficit > 0) {
        const h = deficit * scale;
        nodes.push(
             <g key="deficit">
                <rect x={leftX} y={leftY} width={barWidth} height={h} fill="#ef4444" rx={4} opacity={0.5} />
                <text x={leftX + 14} y={leftY + h/2 + 4} className="text-[9px] fill-rose-500" textAnchor="start">Deficit</text>
            </g>
        );
        leftY += h + 5;
    }

    let linkLeftY = padding; 
    let linkRightY = padding;

    sortedExpenses.forEach(([name, amount]) => {
        const nodeHeight = amount * scale;
        const color = safeCategories.find(c => c && c.name === name)?.color || '#ef4444';
        nodes.push(
            <g key={`r-${name}`}>
                <rect x={rightX} y={linkRightY} width={barWidth} height={nodeHeight} fill={color} rx={4} />
                 <text x={rightX - 6} y={linkRightY + nodeHeight/2 + 4} className="text-[9px] fill-muted" textAnchor="end">{name}</text>
            </g>
        );
        const leftCenter = linkLeftY + (nodeHeight / 2);
        const rightCenter = linkRightY + (nodeHeight / 2);
        links.push(
            <path 
                key={`link-${name}`}
                d={`M ${leftX + barWidth} ${leftCenter} C ${leftX + width/2} ${leftCenter}, ${rightX - width/2} ${rightCenter}, ${rightX} ${rightCenter}`}
                stroke={color}
                strokeWidth={Math.max(1, nodeHeight)}
                fill="none"
                opacity={0.3}
                className="hover:opacity-60 transition-opacity"
            />
        );
        linkLeftY += nodeHeight; 
        linkRightY += nodeHeight + 5; 
    });

    if (savings > 0) {
        const h = savings * scale;
        nodes.push(
            <g key="savings">
                <rect x={rightX} y={linkRightY} width={barWidth} height={h} fill="#10b981" rx={4} />
                <text x={rightX - 6} y={linkRightY + h/2 + 4} className="text-[9px] fill-emerald-500" textAnchor="end">Savings</text>
            </g>
        );
        const leftCenter = linkLeftY + (h / 2);
        const rightCenter = linkRightY + (h / 2);
        links.push(
            <path 
                key="link-savings"
                d={`M ${leftX + barWidth} ${leftCenter} C ${leftX + width/2} ${leftCenter}, ${rightX - width/2} ${rightCenter}, ${rightX} ${rightCenter}`}
                stroke="#10b981"
                strokeWidth={h}
                fill="none"
                opacity={0.3}
            />
        );
    }

    return (
        <div className="overflow-x-auto no-scrollbar animate-in fade-in">
            <svg width={width} height={Math.max(linkRightY, leftY) + 20} className="mx-auto">
                {links}
                {nodes}
            </svg>
        </div>
    );
};
