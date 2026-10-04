'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { isPast, isToday, isTomorrow, addDays, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AlertCircle, Clock, Zap, Coffee } from 'lucide-react';

interface EisenhowerMatrixProps {
  tasks: Task[];
}

const QUADRANTS = [
  {
    id: 'do',
    label: 'Do First',
    subtitle: 'Urgent & Important',
    color: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900',
    icon: AlertCircle,
    textColor: 'text-red-700 dark:text-red-400',
    description: 'Critical tasks with immediate deadlines.'
  },
  {
    id: 'schedule',
    label: 'Schedule',
    subtitle: 'Not Urgent & Important',
    color: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900',
    icon: Clock,
    textColor: 'text-blue-700 dark:text-blue-400',
    description: 'Long-term goals and strategic work.'
  },
  {
    id: 'delegate',
    label: 'Delegate',
    subtitle: 'Urgent & Not Important',
    color: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900',
    icon: Zap,
    textColor: 'text-amber-700 dark:text-amber-400',
    description: 'Interruptions or tasks for others.'
  },
  {
    id: 'eliminate',
    label: 'Eliminate',
    subtitle: 'Not Urgent & Not Important',
    color: 'bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800',
    icon: Coffee,
    textColor: 'text-slate-700 dark:text-slate-400',
    description: 'Low-value activities and distractions.'
  }
];

export function EisenhowerMatrix({ tasks }: EisenhowerMatrixProps) {
  const isUrgent = (task: Task) => {
    if (!task.dueDate) return false;
    const date = new Date(task.dueDate);
    return isPast(date) || isToday(date) || isTomorrow(date) || date < addDays(new Date(), 3);
  };

  const isImportant = (task: Task) => {
      return task.priority === 'urgent' || task.priority === 'high';
  };

  const getQuadrantTasks = (quadrantId: string) => {
    return tasks.filter(task => {
        const u = isUrgent(task);
        const i = isImportant(task);

        switch (quadrantId) {
            case 'do': return u && i;
            case 'schedule': return !u && i;
            case 'delegate': return u && !i;
            case 'eliminate': return !u && !i;
            default: return false;
        }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 aspect-square max-h-[1000px]">
      {QUADRANTS.map((q) => {
        const qTasks = getQuadrantTasks(q.id);
        const Icon = q.icon;

        return (
          <Card key={q.id} className={cn("flex flex-col shadow-none overflow-hidden", q.color)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className={cn("text-xl flex items-center gap-2", q.textColor)}>
                    <Icon className="h-5 w-5" />
                    {q.label}
                  </CardTitle>
                  <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider">{q.subtitle}</p>
                </div>
                <Badge variant="outline" className="bg-background/50">{qTasks.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 py-2">
                <ScrollArea className="h-full">
                    <div className="space-y-2 pr-4">
                        {qTasks.length > 0 ? qTasks.map(task => (
                            <div key={task.id} className="p-3 bg-background/60 backdrop-blur-sm rounded-lg border border-border/40 shadow-sm">
                                <p className="text-sm font-semibold leading-tight">{task.title}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className="text-[9px] h-4 py-0">{task.category}</Badge>
                                    {task.dueDate && (
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {isToday(new Date(task.dueDate)) ? 'Today' : format(new Date(task.dueDate), 'MMM d')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center h-40 text-center opacity-40">
                                <Icon className="h-8 w-8 mb-2" />
                                <p className="text-xs italic">{q.description}</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
