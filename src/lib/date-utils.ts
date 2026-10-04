
import type { Task } from '@/lib/types';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

export const getNextDueDate = (task: Task): Date | undefined => {
    if (!task.recurrence || !task.dueDate) return undefined;

    const { frequency, interval, daysOfWeek, endDate } = task.recurrence;
    let nextDate = new Date(task.dueDate);

    switch (frequency) {
        case 'daily':
            nextDate = addDays(nextDate, interval || 1);
            break;
        case 'weekly':
            if (daysOfWeek && daysOfWeek.length > 0) {
                const dayNumbers = [...daysOfWeek].sort((a, b) => a - b);
                const currentDay = nextDate.getDay();
                let nextDayOfWeek = -1;
                
                // Find the next valid day in the current week *after* the current day
                for (const day of dayNumbers) {
                    if (day > currentDay) {
                        nextDayOfWeek = day;
                        break;
                    }
                }
                
                if (nextDayOfWeek !== -1) {
                    // Next occurrence is in the same week
                    nextDate = addDays(nextDate, nextDayOfWeek - currentDay);
                } else {
                    // No more occurrences this week, jump to the next week's first valid day
                    const daysUntilNextWeekFirstOccurrence = (7 - currentDay) + dayNumbers[0];
                    nextDate = addDays(nextDate, daysUntilNextWeekFirstOccurrence);
                    
                    // Apply the interval if it's greater than 1 week
                    const weeklyInterval = interval || 1;
                    if (weeklyInterval > 1) {
                        nextDate = addWeeks(nextDate, weeklyInterval - 1);
                    }
                }

            } else {
                nextDate = addWeeks(nextDate, interval || 1);
            }
            break;
        case 'monthly':
            nextDate = addMonths(nextDate, interval || 1);
            break;
        case 'yearly':
            nextDate = addYears(nextDate, interval || 1);
            break;
    }

    if (endDate && nextDate > new Date(endDate)) {
        return undefined;
    }

    return nextDate;
};
