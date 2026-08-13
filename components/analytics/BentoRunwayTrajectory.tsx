import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AppData, TransactionType } from '../../types';

interface BentoRunwayTrajectoryProps {
  data: AppData;
  formatMoney: (val: number, sym: string) => string;
  currencySymbol: string;
  privacyMode: boolean;
  currentBalance: number;
}

export const BentoRunwayTrajectory: React.FC<BentoRunwayTrajectoryProps> = ({
  data,
  formatMoney,
  currencySymbol,
  privacyMode,
  currentBalance,
}) => {
  const { trajectoryData, dailyBurn, day30Balance } = useMemo(() => {
    const expenses = data.transactions.filter((t) => t.type === TransactionType.EXPENSE);
    const uniqueDays = new Set(expenses.map((t) => t.date.split('T')[0]));
    const totalSpent = expenses.reduce((s, t) => s + t.amount, 0);
    const avgDailyBurn = totalSpent / Math.max(uniqueDays.size, 1);

    const traj = [...Array(30)].map((_, i) => {
      const projected = Math.max(0, currentBalance - avgDailyBurn * (i + 1));
      return {
        day: `D${i + 1}`,
        balance: projected,
      };
    });

    return {
      trajectoryData: traj,
      dailyBurn: avgDailyBurn,
      day30Balance: traj[29]?.balance || 0,
    };
  }, [data.transactions, currentBalance]);

  const displayMoney = (val: number) => {
    if (privacyMode) return '••••';
    return formatMoney(val, currencySymbol);
  };

  return (
    <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[13px] font-medium text-[var(--text-secondary)]">
            Runway forecast
          </span>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            30-day model
          </span>
        </div>

        {/* Sparkline Canvas */}
        <div className="h-[120px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trajectoryData} margin={{ top: 5, right: 0, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="bentoTrajGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 2" vertical={false} />
              <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} interval={6} />
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
                formatter={(val: any) => [displayMoney(Number(val) || 0), 'Projected']}
              />
              <Area type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={1.5} fill="url(#bentoTrajGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-default)] font-mono">
        <span>Burn: {displayMoney(dailyBurn)}/d</span>
        <span>Day 30: {displayMoney(day30Balance)}</span>
      </div>
    </div>
  );
};
