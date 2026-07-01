import { AppData, TransactionType } from '../types';

export const PredictiveEngine = {
  /**
   * Calculates the "Adjusted Liquidity" by deducting future provisions.
   */
  getAdjustedBalance: (data: AppData, currentBalance: number) => {
    const totalProvisioned = data.provisions.reduce((sum, p) => sum + p.amount, 0);
    return currentBalance - totalProvisioned;
  },

  /**
   * Calculates the "Runway" in days based on average daily burn.
   */
  getRunwayDays: (data: AppData, currentBalance: number) => {
    const expenses = data.transactions.filter(t => t.type === TransactionType.EXPENSE);
    if (expenses.length === 0) return Infinity;

    // Get unique days in history
    const days = new Set(expenses.map(t => t.date.split('T')[0]));
    const totalSpent = expenses.reduce((sum, t) => sum + t.amount, 0);
    const avgDailyBurn = totalSpent / Math.max(days.size, 1);

    if (avgDailyBurn === 0) return Infinity;
    
    // Account for recurring rules in the burn
    const monthlyRecurring = (data.recurringRules || [])
        .filter(r => r.isActive)
        .reduce((sum, r) => {
            const factor = r.frequency === 'DAILY' ? 30 : r.frequency === 'WEEKLY' ? 4 : r.frequency === 'MONTHLY' ? 1 : 1/12;
            return sum + (r.amount * factor);
        }, 0);
    
    const totalDailyBurn = avgDailyBurn + (monthlyRecurring / 30);
    return Math.floor(currentBalance / totalDailyBurn);
  },

  /**
   * Calculates total upcoming automated liabilities for the next N days.
   */
  getFutureLiabilities: (data: AppData, days: number = 30) => {
    const now = new Date();
    const futureLimit = new Date();
    futureLimit.setDate(now.getDate() + days);

    return (data.recurringRules || [])
        .filter(r => r.isActive)
        .reduce((sum, r) => {
            let nextDue = new Date(r.nextDueDate);
            let total = 0;
            while (nextDue <= futureLimit) {
                total += r.amount;
                if (r.frequency === 'DAILY') nextDue.setDate(nextDue.getDate() + 1);
                else if (r.frequency === 'WEEKLY') nextDue.setDate(nextDue.getDate() + 7);
                else if (r.frequency === 'MONTHLY') nextDue.setMonth(nextDue.getMonth() + 1);
                else if (r.frequency === 'YEARLY') nextDue.setFullYear(nextDue.getFullYear() + 1);
            }
            return sum + total;
        }, 0);
  },

  /**
   * Generates a 30-day projected Net Worth trajectory.
   */
  getNetWorthTrajectory: (data: AppData, currentBalance: number) => {
    const expenses = data.transactions.filter(t => t.type === TransactionType.EXPENSE);
    const days = new Set(expenses.map(t => t.date.split('T')[0]));
    const totalSpent = expenses.reduce((sum, t) => sum + t.amount, 0);
    const avgDailyBurn = totalSpent / Math.max(days.size, 1);

    return [...Array(30)].map((_, i) => {
        const projectedBalance = currentBalance - (avgDailyBurn * i);
        return {
            day: i + 1,
            balance: Math.max(projectedBalance, 0)
        };
    });
  },

  /**
   * Detects spending anomalies (spending > 1.5x of moving average).
   */
  detectAnomalies: (data: AppData) => {
    const categoryAverages: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    data.transactions.forEach(t => {
        if (t.type === TransactionType.EXPENSE) {
            categoryAverages[t.category] = (categoryAverages[t.category] || 0) + t.amount;
            categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
        }
    });

    Object.keys(categoryAverages).forEach(cat => {
        categoryAverages[cat] = categoryAverages[cat] / categoryCounts[cat];
    });

    const today = new Date().toISOString().split('T')[0];
    const todaysTransactions = data.transactions.filter(t => t.date.startsWith(today) && t.type === TransactionType.EXPENSE);

    return todaysTransactions.filter(t => {
        const avg = categoryAverages[t.category];
        return avg && t.amount > avg * 1.5;
    });
  },

  /**
   * Detects recurring income patterns (e.g., paydays).
   */
  detectPaydayCycles: (data: AppData) => {
    const income = data.transactions.filter(t => t.type === TransactionType.INCOME && t.amount > 0);
    if (income.length < 3) return null;

    // Look for similar amounts on similar days of the month
    const dayCounts: Record<number, number> = {};
    income.forEach(t => {
        const day = new Date(t.date).getDate();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const frequentDay = Object.entries(dayCounts).sort((a,b) => b[1] - a[1])[0];
    if (frequentDay && parseInt(frequentDay[1] as any) >= 2) {
        return { day: parseInt(frequentDay[0]), confidence: 'HIGH' };
    }
    return null;
  },

  /**
   * Detects potential subscription-like bills from history.
   */
  detectBillCycles: (data: AppData) => {
    const expenses = data.transactions.filter(t => t.type === TransactionType.EXPENSE);
    const categoryPatterns: Record<string, { amounts: number[], dates: number[] }> = {};

    expenses.forEach(t => {
        if (!categoryPatterns[t.category]) categoryPatterns[t.category] = { amounts: [], dates: [] };
        categoryPatterns[t.category].amounts.push(t.amount);
        categoryPatterns[t.category].dates.push(new Date(t.date).getDate());
    });

    const potentialBills: string[] = [];
    Object.keys(categoryPatterns).forEach(cat => {
        const p = categoryPatterns[cat];
        if (p.amounts.length >= 3) {
            // Check if amounts are consistent (std dev < 10%)
            const avg = p.amounts.reduce((a,b) => a+b, 0) / p.amounts.length;
            const variance = p.amounts.reduce((a,b) => a + Math.pow(b - avg, 2), 0) / p.amounts.length;
            const stdDev = Math.sqrt(variance);
            
            if (stdDev < avg * 0.1) {
                potentialBills.push(cat);
            }
        }
    });
    return potentialBills;
  },

  /**
   * Local heuristic-based pattern recognition for financial advice.
   * No LLM required, runs purely on local data.
   */
  getLocalAdvice: (data: AppData) => {
    const insights: string[] = [];
    const expenses = data.transactions.filter(t => t.type === TransactionType.EXPENSE);
    if (expenses.length < 5) return ["Transaction history too short for pattern recognition. Keep tracking to reveal insights."];

    // 1. Payday Proximity
    const payday = PredictiveEngine.detectPaydayCycles(data);
    if (payday) {
        const today = new Date().getDate();
        const daysToPayday = payday.day >= today ? payday.day - today : (30 - today + payday.day);
        if (daysToPayday <= 3) {
            insights.push(`Payday expected: Projected payday in ${daysToPayday} days. Plan your expenses accordingly.`);
        }
    }

    // 2. Bill Cycle Detection
    const bills = PredictiveEngine.detectBillCycles(data);
    if (bills.length > 0) {
        insights.push(`Recurring cost detected: ${bills[0]} appears to be recurring. Convert to Subscription for better tracking?`);
    }

    // 3. Frequency Analysis
    const counts: Record<string, number> = {};
    expenses.slice(0, 50).forEach(t => counts[t.category] = (counts[t.category] || 0) + 1);
    const topCat = Object.entries(counts).sort((a,b) => (b[1] as number) - (a[1] as number))[0];
    if (topCat && (topCat[1] as number) > 5) {
        insights.push(`High frequency detected in ${topCat[0]}. You've registered ${topCat[1]} entries recently.`);
    }

    // 4. Burn Rate Acceleration
    const now = new Date();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const thisWeek = expenses.filter(t => (now.getTime() - new Date(t.date).getTime()) < oneWeekMs);
    const lastWeek = expenses.filter(t => {
        const diff = now.getTime() - new Date(t.date).getTime();
        return diff >= oneWeekMs && diff < 2 * oneWeekMs;
    });
    const thisTotal = thisWeek.reduce((s,t) => s + t.amount, 0);
    const lastTotal = lastWeek.reduce((s,t) => s + t.amount, 0);
    if (thisTotal > lastTotal * 1.25 && lastTotal > 0) {
        insights.push(`Spending increase: Spending is up ${Math.round((thisTotal/lastTotal - 1)*100)}% compared to last week.`);
    }

    // 5. Temporal Patterns
    const nightSpenders = expenses.filter(t => {
        const hour = new Date(t.date).getHours();
        return hour >= 22 || hour < 4;
    });
    if (nightSpenders.length >= 3) {
        insights.push(`Late-night spending patterns detected. Watch out for impulse spending.`);
    }

    return insights.length > 0 ? insights.slice(0, 3) : ["Your spending patterns look normal. No unusual activity detected."];
  }
};
