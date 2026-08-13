import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Transaction, TransactionType } from '../../types';

interface BentoCashFlowProps {
  transactions: Transaction[];
  formatMoney: (val: number, sym: string) => string;
  currencySymbol: string;
  privacyMode: boolean;
}

export const BentoCashFlow: React.FC<BentoCashFlowProps> = ({
  transactions,
  formatMoney,
  currencySymbol,
  privacyMode,
}) => {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  const { chartData, peakIn, peakOut } = useMemo(() => {
    const dateMap: Record<string, { date: string; income: number; expense: number; net: number }> = {};
    
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach((t) => {
      const d = t.date.split('T')[0];
      if (!dateMap[d]) dateMap[d] = { date: d, income: 0, expense: 0, net: 0 };
      if (t.type === TransactionType.INCOME) dateMap[d].income += t.amount;
      else if (t.type === TransactionType.EXPENSE) dateMap[d].expense += t.amount;
      dateMap[d].net = dateMap[d].income - dateMap[d].expense;
    });

    let maxIn = 0;
    let maxInDate = '—';
    let maxOut = 0;
    let maxOutDate = '—';

    const formatted = Object.values(dateMap).map((item) => {
      const dObj = new Date(item.date);
      const label = dObj.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
      if (item.income > maxIn) { maxIn = item.income; maxInDate = label; }
      if (item.expense > maxOut) { maxOut = item.expense; maxOutDate = label; }
      return { ...item, label };
    });

    return {
      chartData: formatted,
      peakIn: { date: maxInDate, amount: maxIn },
      peakOut: { date: maxOutDate, amount: maxOut },
    };
  }, [transactions]);

  const displayMoney = (val: number) => {
    if (privacyMode) return '••••';
    return formatMoney(val, currencySymbol);
  };

  return (
    <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-medium text-[var(--text-secondary)]">
          Cash flow
        </span>

        {/* View Toggle */}
        <div className="tabs">
          <button
            type="button"
            onClick={() => setChartType('area')}
            className={`tab text-[10px] py-0.5 px-2 ${chartType === 'area' ? 'is-active' : ''}`}
          >
            Area
          </button>
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`tab text-[10px] py-0.5 px-2 ${chartType === 'bar' ? 'is-active' : ''}`}
          >
            Bars
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[180px] w-full my-1">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[11px] text-[var(--text-muted)]">
            No transactions in this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={chartData} margin={{ top: 8, right: 0, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="cfInGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="cfOutGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 2" vertical={false} />
                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} orientation="right" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-strong)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: 'var(--text-primary)',
                    padding: '4px 8px',
                  }}
                  formatter={(val: any, name: any) => [
                    displayMoney(Number(val) || 0),
                    name === 'income' ? 'Income' : 'Expense',
                  ]}
                />
                <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={1.5} fill="url(#cfInGrad)" />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={1.5} fill="url(#cfOutGrad)" />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 8, right: 0, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 2" vertical={false} />
                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} orientation="right" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-strong)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: 'var(--text-primary)',
                    padding: '4px 8px',
                  }}
                  formatter={(val: any, name: any) => [
                    displayMoney(Number(val) || 0),
                    name === 'income' ? 'Income' : 'Expense',
                  ]}
                />
                <Bar dataKey="income" fill="#22c55e" radius={[2, 2, 0, 0]} maxBarSize={20} />
                <Bar dataKey="expense" fill="#ef4444" radius={[2, 2, 0, 0]} maxBarSize={20} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer Metrics */}
      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[var(--border-default)] font-mono">
        <span className="text-[var(--text-muted)]">
          Peak In: <span className="text-[var(--text-primary)]">{peakIn.date} ({displayMoney(peakIn.amount)})</span>
        </span>
        <span className="text-[var(--text-muted)]">
          Peak Out: <span className="text-[var(--text-primary)]">{peakOut.date} ({displayMoney(peakOut.amount)})</span>
        </span>
      </div>
    </div>
  );
};
