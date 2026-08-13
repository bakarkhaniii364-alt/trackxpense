import React, { useMemo } from 'react';
import { AppData, TransactionType } from '../../types';
import { PredictiveEngine } from '../../services/PredictiveEngine';

interface LocalAdvisorProps {
    data: AppData;
    formatMoney: (val: number, sym: string) => string;
}

export const LocalAdvisor: React.FC<LocalAdvisorProps> = ({ data, formatMoney }) => {
    const currency = data.settings.currencySymbol;

    const insights = useMemo(() => {
        const list: { type: 'normal' | 'alert' | 'positive' | 'warning'; text: string }[] = [];
        const expenses = data.transactions.filter(t => t.type === TransactionType.EXPENSE);
        const income = data.transactions.filter(t => t.type === TransactionType.INCOME);
        const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
        const totalIncome = income.reduce((s, t) => s + t.amount, 0);
        const balance = totalIncome - totalExpense;

        const todayStr = new Date().toISOString().split('T')[0];
        const todayExpenses = expenses.filter(t => t.date.startsWith(todayStr));
        const todaySpent = todayExpenses.reduce((s, t) => s + t.amount, 0);

        // 1. Daily pace / budget check
        const dailyGoal = data.profile.dailyGoal || 0;
        if (dailyGoal > 0) {
            if (todaySpent > dailyGoal) {
                list.push({
                    type: 'alert',
                    text: `Daily cap breached: Today's spending (${formatMoney(todaySpent, currency)}) exceeds your daily allowance of ${formatMoney(dailyGoal, currency)}.`
                });
            } else if (todaySpent > dailyGoal * 0.8) {
                list.push({
                    type: 'warning',
                    text: `Approaching daily limit: ${formatMoney(todaySpent, currency)} spent of ${formatMoney(dailyGoal, currency)} allowance today (${Math.round((todaySpent / dailyGoal) * 100)}%).`
                });
            } else if (todaySpent === 0) {
                list.push({
                    type: 'positive',
                    text: `Zero spend recorded today. Full daily allowance of ${formatMoney(dailyGoal, currency)} remains intact.`
                });
            } else {
                list.push({
                    type: 'positive',
                    text: `Healthy daily pace: ${formatMoney(todaySpent, currency)} spent today with ${formatMoney(dailyGoal - todaySpent, currency)} remaining in your daily cap.`
                });
            }
        } else if (todaySpent > 0) {
            list.push({
                type: 'normal',
                text: `Today's total spend: ${formatMoney(todaySpent, currency)} across ${todayExpenses.length} transaction${todayExpenses.length > 1 ? 's' : ''}.`
            });
        }

        // 2. Week-over-week spending velocity
        const now = new Date();
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
        const thisWeek = expenses.filter(t => (now.getTime() - new Date(t.date).getTime()) < oneWeekMs);
        const lastWeek = expenses.filter(t => {
            const diff = now.getTime() - new Date(t.date).getTime();
            return diff >= oneWeekMs && diff < 2 * oneWeekMs;
        });
        const thisWeekTotal = thisWeek.reduce((s, t) => s + t.amount, 0);
        const lastWeekTotal = lastWeek.reduce((s, t) => s + t.amount, 0);

        if (lastWeekTotal > 0 && thisWeekTotal > 0) {
            const delta = Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100);
            if (delta > 20) {
                list.push({
                    type: 'warning',
                    text: `Spending acceleration: Weekly volume is up ${delta}% (${formatMoney(thisWeekTotal, currency)} vs ${formatMoney(lastWeekTotal, currency)} last week).`
                });
            } else if (delta < -15) {
                list.push({
                    type: 'positive',
                    text: `Spending reduction: Outflows decreased by ${Math.abs(delta)}% compared to the previous 7-day period.`
                });
            }
        }

        // 3. Category concentration & budget limits
        const budgetLimits = data.settings.budgetLimits || {};
        const monthStr = new Date().toISOString().slice(0, 7);
        const monthlyCategorySpend: Record<string, number> = {};
        expenses.filter(t => t.date.startsWith(monthStr)).forEach(t => {
            monthlyCategorySpend[t.category] = (monthlyCategorySpend[t.category] || 0) + t.amount;
        });

        const breaches = Object.entries(budgetLimits).map(([cat, config]: any) => {
            const limit = typeof config === 'number' ? config : config.limit;
            const spent = monthlyCategorySpend[cat] || 0;
            return { cat, limit, spent, ratio: spent / limit };
        }).filter(b => b.limit > 0 && b.ratio >= 0.85).sort((a, b) => b.ratio - a.ratio);

        if (breaches.length > 0) {
            const topBreach = breaches[0];
            list.push({
                type: topBreach.ratio >= 1 ? 'alert' : 'warning',
                text: topBreach.ratio >= 1 
                    ? `Category budget limit reached: ${topBreach.cat} has utilized ${Math.round(topBreach.ratio * 100)}% of limit (${formatMoney(topBreach.spent, currency)} / ${formatMoney(topBreach.limit, currency)}).`
                    : `Budget threshold alert: ${topBreach.cat} is at ${Math.round(topBreach.ratio * 100)}% of monthly limit.`
            });
        }

        // 4. Runway and Upcoming Liabilities
        const runwayDays = PredictiveEngine.getRunwayDays(data, balance);
        const futureLiabilities = PredictiveEngine.getFutureLiabilities(data, 30);
        if (futureLiabilities > 0 && balance > 0) {
            const impact = Math.round((futureLiabilities / balance) * 100);
            if (impact > 40) {
                list.push({
                    type: 'warning',
                    text: `Upcoming liabilities: ${formatMoney(futureLiabilities, currency)} in recurring obligations due within 30 days (${impact}% of liquid balance).`
                });
            }
        }

        if (runwayDays < 30 && runwayDays > 0 && balance > 0) {
            list.push({
                type: 'alert',
                text: `Runway indicator: Current burn rate provides ${runwayDays} days of liquid runway.`
            });
        }

        // 5. Pattern heuristics from PredictiveEngine
        const heuristicAdvice = PredictiveEngine.getLocalAdvice(data);
        heuristicAdvice.forEach(adv => {
            if (!list.some(item => item.text.toLowerCase().includes(adv.slice(0, 20).toLowerCase()))) {
                list.push({
                    type: adv.includes('acceleration') || adv.includes('breach') || adv.includes('Late-night') ? 'warning' : 'normal',
                    text: adv
                });
            }
        });

        if (list.length === 0) {
            list.push({
                type: 'positive',
                text: `Your spending patterns are stable with no unusual activity detected. Budget parameters are on target.`
            });
        }

        return list.slice(0, 3);
    }, [data, formatMoney, currency]);

    return (
        <div className="rounded-[18px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-5 lg:p-6 flex flex-col justify-between transition-colors h-full">
            <div>
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                        Financial Intelligence
                    </span>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success-fg)] shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
                        <span className="text-[11px] font-medium text-[var(--text-secondary)]">Live Analysis</span>
                    </div>
                </div>

                {/* Direct text items with no nested card boxes */}
                <div className="space-y-3.5 divide-y divide-[var(--border-default)]">
                    {insights.map((item, idx) => (
                        <div key={idx} className={`flex items-start gap-2.5 ${idx > 0 ? 'pt-3.5' : ''}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                item.type === 'alert' 
                                    ? 'bg-[var(--status-error-fg)]' 
                                    : item.type === 'warning' 
                                        ? 'bg-[var(--status-warning-fg)]' 
                                        : 'bg-[var(--status-success-fg)]'
                            }`} />
                            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed font-normal">
                                {item.text}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-3 mt-4 border-t border-[var(--border-default)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                <span>Real-time Financial Engine</span>
                <span>Continuously updated</span>
            </div>
        </div>
    );
};
