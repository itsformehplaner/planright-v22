
'use client';

import * as React from 'react';
import type { Task, TaskStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MoreHorizontal, ArrowRight, ArrowLeft, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'active', label: 'To Do', color: 'bg-slate-100 dark:bg-slate-900 border-slate-200' },
  { id: 'in-progress', label: 'In Progress', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200' },
  { id: 'on-hold', label: 'On Hold', color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200' },
  { id: 'completed', label: 'Done', color: 'bg-green-50 dark:bg-green-900/20 border-green-200' },
];

export function KanbanBoard({ tasks, onUpdateStatus }: KanbanBoardProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[600px] overflow-x-auto pb-4">
      {COLUMNS.map((column) => {
        const columnTasks = tasks.filter((t) => t.status === column.id);
        
        return (
          <div key={column.id} className={cn("flex-1 min-w-[280px] flex flex-col rounded-xl border p-3", column.color)}>
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="font-bold flex items-center gap-2">
                {column.label}
                <Badge variant="secondary">{columnTasks.length}</Badge>
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-3 pr-3">
                {columnTasks.map((task) => (
                  <Card key={task.id} className="shadow-sm hover:shadow-md transition-shadow group">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-medium text-sm leading-snug">{task.title}</p>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            {column.id !== 'active' && (
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onUpdateStatus(task.id, 'active')}>
                                    <ArrowLeft className="h-3 w-3" />
                                </Button>
                            )}
                            {column.id !== 'completed' && (
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onUpdateStatus(task.id, 'completed')}>
                                    <ArrowRight className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                      </div>
                      
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center justify-between mt-4">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                            {task.priority}
                        </Badge>
                        {task.dueDate && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{format(new Date(task.dueDate), 'MMM d')}</span>
                            </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
