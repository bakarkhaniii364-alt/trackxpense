import React, { useMemo } from 'react';
import { Transaction } from '../../types';

interface BentoHeatmapProps {
  transactions: Transaction[];
}

export const BentoHeatmap: React.FC<BentoHeatmapProps> = ({ transactions }) => {
  const { days, timeBlocks, map, maxCount } = useMemo(() => {
    const dList = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const tBlocks = [0, 3, 6, 9, 12, 15, 18, 21];
    const m: Record<string, number> = {};

    transactions.forEach((tx) => {
      const d = new Date(tx.date);
      const dayIndex = d.getDay();
      const hour = d.getHours();
      const block = Math.floor(hour / 3) * 3;
      const key = `${dList[dayIndex]}-${block}`;
      m[key] = (m[key] || 0) + 1;
    });

    const max = Math.max(...Object.values(m), 1);
    return { days: dList, timeBlocks: tBlocks, map: m, maxCount: max };
  }, [transactions]);

  return (
    <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[13px] font-medium text-[var(--text-secondary)]">
            Spending rhythm
          </span>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            7d × 24h
          </span>
        </div>

        {/* Matrix Grid */}
        <div className="mt-3 space-y-1">
          <div className="grid grid-cols-9 gap-1 text-[8px] font-mono text-[var(--text-muted)] text-center">
            <div />
            {timeBlocks.map((h) => (
              <div key={h}>{h}h</div>
            ))}
          </div>

          {days.map((day) => (
            <div key={day} className="grid grid-cols-9 gap-1 items-center">
              <span className="text-[9px] font-mono text-[var(--text-muted)]">{day}</span>
              {timeBlocks.map((h) => {
                const key = `${day}-${h}`;
                const count = map[key] || 0;
                const intensity = count / maxCount;
                
                let cellBg = 'var(--bg-subtle)';
                if (intensity > 0.6) cellBg = '#F6821F';
                else if (intensity > 0.3) cellBg = 'rgba(246, 130, 31, 0.5)';
                else if (intensity > 0) cellBg = 'rgba(246, 130, 31, 0.2)';

                return (
                  <div
                    key={key}
                    title={`${day} ${h}:00 — ${count} txs`}
                    className="h-3 rounded-[2px] border border-[var(--border-default)]/30"
                    style={{ backgroundColor: cellBg }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-default)]">
        <span>Low</span>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-[2px] bg-[var(--bg-subtle)] border border-[var(--border-default)]" />
          <span className="w-2 h-2 rounded-[2px] bg-[rgba(246,130,31,0.2)]" />
          <span className="w-2 h-2 rounded-[2px] bg-[rgba(246,130,31,0.5)]" />
          <span className="w-2 h-2 rounded-[2px] bg-[#F6821F]" />
        </div>
        <span>Peak frequency</span>
      </div>
    </div>
  );
};
