import React, { useState } from 'react';
import {
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight
} from '@phosphor-icons/react';
import { Transaction, TransactionType } from '../../types';

interface CalendarViewProps {
    transactions: Transaction[];
    onSelectDate: (d: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ transactions, onSelectDate }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const days = [...Array(daysInMonth)].map((_, i) => i + 1);
    const empties = [...Array(firstDayOfMonth)].map((_, i) => i);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    return (
        <div className="mt-2 select-none animate-in fade-in">
            <div className="flex items-center justify-between mb-4 px-2">
                <button onClick={prevMonth} className="p-2 hover:bg-surface rounded-full text-muted hover:text-main"><ChevronLeft size={20}/></button>
                <h3 className="text-main font-bold text-lg">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={nextMonth} className="p-2 hover:bg-surface rounded-full text-muted hover:text-main"><ChevronRight size={20}/></button>
            </div>
            <div className="grid grid-cols-7 gap-1">
                {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-center text-[10px] font-bold text-muted py-2">{d}</div>)}
                {empties.map(i => <div key={`empty-${i}`} />)}
                {days.map(day => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const daysTx = transactions.filter(t => t.date.startsWith(dateStr));
                    const hasExpense = daysTx.some(t => t.type === TransactionType.EXPENSE);
                    const hasIncome = daysTx.some(t => t.type === TransactionType.INCOME);
                    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

                    return (
                        <button key={day} onClick={() => onSelectDate(dateStr)} className={`aspect-square rounded-md flex flex-col items-center justify-center relative border transition-all ${isToday ? 'bg-primary/20 border-primary text-primary' : 'bg-surface/50 border-transparent text-main hover:bg-surface hover:border-white/10'}`}>
                            <span className="text-xs font-medium">{day}</span>
                            <div className="flex gap-0.5 mt-1 h-1.5">
                                {hasExpense && <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                                {hasIncome && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
