'use client';

import * as React from 'react';
import { format, isSameDay, isToday, parse, startOfDay, addDays, isPast, setHours, startOfHour } from 'date-fns';
import { Calendar as CalendarIcon, Link as LinkIcon, Repeat, Clock, Zap, Plus } from 'lucide-react';
import { DayContent, DayContentProps } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus } from '@/lib/types';
import { AddTaskDialog } from './add-task-dialog';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { getNextDueDate } from '@/lib/date-utils';

interface CalendarViewProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onSetTaskStatus: (id: string, status: TaskStatus) => void;
  onAddTask: (data: Omit<Task, 'id' | 'status' | 'createdAt' | 'projectId'>) => void;
  selectedDay: Date | undefined;
  onSelectDay: (day: Date | undefined) => void;
}

const priorityDotColor: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-blue-500',
  low: 'bg-green-500',
};

const getHeatmapColor = (count: number): string => {
  if (count === 0) return '';
  if (count === 1) return 'bg-primary/5';
  if (count <= 3) return 'bg-primary/10';
  if (count <= 5) return 'bg-primary/20';
  return 'bg-primary/30';
};

export function CalendarView({ tasks, onSetTaskStatus, onAddTask, selectedDay, onSelectDay, onUpdateTask }: CalendarViewProps) {
  const projectedTasks = React.useMemo(() => {
    const allTasks = [...tasks];
    const recurringTasks = tasks.filter(task => task.recurrence);

    recurringTasks.forEach(task => {
        let currentTask = { ...task };
        for (let i = 0; i < 52; i++) {
            const nextDueDate = getNextDueDate(currentTask);
            if (nextDueDate) {
                const nextTask = {
                    ...currentTask,
                    id: `${currentTask.id}-future-${i}`,
                    dueDate: nextDueDate,
                    isProjected: true, 
                };
                allTasks.push(nextTask as any);
                currentTask = nextTask;
            } else {
                break;
            }
        }
    });
    return allTasks;
}, [tasks]);

  const tasksWithDueDates = React.useMemo(() => projectedTasks.filter(task => !!task.dueDate), [projectedTasks]);

  const tasksByDate = React.useMemo(() => {
    return tasksWithDueDates.reduce(
      (acc, task) => {
        if (task.dueDate) {
            const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(task);
        }
        return acc;
      },
      {} as Record<string, Task[]>
    );
  }, [tasksWithDueDates]);

  const selectedDayTasks = React.useMemo(() => {
    if (!selectedDay) return [];
    return tasksWithDueDates
      .filter(task => task.dueDate && isSameDay(new Date(task.dueDate), selectedDay))
      .sort((a, b) => {
          const timeA = a.startTime ? parse(a.startTime, 'HH:mm', new Date(a.dueDate!)).getTime() : a.dueDate!.getTime();
          const timeB = b.startTime ? parse(b.startTime, 'HH:mm', new Date(b.dueDate!)).getTime() : b.dueDate!.getTime();
          return timeA - timeB;
      });
  }, [tasksWithDueDates, selectedDay]);

  const handleTaskChecked = (taskId: string, checked: boolean) => {
    onSetTaskStatus(taskId, checked ? 'completed' : 'active');
  };

  const dayHours = React.useMemo(() => {
      return Array.from({ length: 24 }, (_, i) => i);
  }, []);

  function DayWithTasks(props: DayContentProps) {
    const dateKey = format(props.date, 'yyyy-MM-dd');
    const dayTasks = tasksByDate[dateKey] || [];
    const isCurrentDay = isToday(props.date);
    const isSelected = props.activeModifiers.selected;
    const heatmapColor = getHeatmapColor(dayTasks.length);
    
    return (
        <div className={cn(
          "relative flex h-full w-full items-center justify-center rounded-md transition-colors",
          isSelected ? '' : heatmapColor,
          isCurrentDay && !isSelected && "ring-2 ring-primary"
        )}>
            <DayContent {...props} />
            {dayTasks.length > 0 && (
                <div className="absolute bottom-1.5 flex space-x-0.5">
                    {dayTasks.slice(0, 4).map(task => (
                        <div key={task.id} className={cn('h-1 w-1 rounded-full', priorityDotColor[task.priority])} />
                    ))}
                </div>
            )}
        </div>
    );
  }

  const TimeBlockItem = ({ task }: { task: Task }) => {
      const isProjected = (task as any).isProjected;
      const dependencies = task.dependsOn?.map(depId => tasks.find(t => t.id === depId)).filter(Boolean) as Task[] || [];
      const isBlocked = dependencies.some(d => d.status !== 'completed');
      const isOverdue = !isProjected && task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status !== 'completed';

      return (
        <div className={cn(
            "group relative flex flex-col p-3 rounded-xl border bg-card hover:shadow-md transition-all border-l-4",
            isProjected && "opacity-60 grayscale-[0.5]",
            isBlocked && "bg-muted/30 opacity-70",
            isOverdue && "border-destructive bg-destructive/5",
            !isOverdue && {
                'border-l-red-500': task.priority === 'urgent',
                'border-l-amber-500': task.priority === 'high',
                'border-l-blue-500': task.priority === 'medium',
                'border-l-green-500': task.priority === 'low',
            }
        )}>
            <div className="flex items-start gap-3">
                <Checkbox
                    id={`cal-${task.id}`}
                    checked={task.status === 'completed'}
                    onCheckedChange={(checked) => handleTaskChecked(task.id, !!checked)}
                    className="mt-1"
                    disabled={task.status === 'canceled' || task.status === 'on-hold' || isBlocked || isProjected}
                />
                <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                        <label 
                            htmlFor={`cal-${task.id}`}
                            className={cn(
                                "font-bold text-sm leading-none cursor-pointer",
                                task.status === 'completed' && "line-through text-muted-foreground",
                                isBlocked && "text-muted-foreground"
                            )}
                        >
                            {task.title}
                        </label>
                        {task.priority === 'urgent' && <Zap className="h-3 w-3 text-red-500 fill-red-500" />}
                    </div>
                    
                    <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
                        {task.startTime && (
                            <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{task.startTime}{task.endTime ? ` - ${task.endTime}` : ''}</span>
                            </div>
                        )}
                        <Badge variant="outline" className="text-[9px] h-4 py-0 uppercase">{task.category}</Badge>
                    </div>
                </div>
            </div>

            {dependencies.length > 0 && !isProjected && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                    <LinkIcon className="h-3 w-3 text-muted-foreground" />
                    <div className="flex flex-wrap gap-1">
                        {dependencies.map(dep => (
                            <Badge key={dep.id} variant="outline" className={cn("text-[9px] py-0 h-4 px-1.5", dep.status === 'completed' && 'line-through bg-green-500/10')}>
                                {dep.title}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
      );
  };
  
  return (
    <Card className="overflow-hidden shadow-lg border-none bg-background">
      <CardContent className="p-0 grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x">
        <div className="lg:col-span-7 p-6 bg-muted/5">
            <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    Interactive Calendar
                </h2>
            </div>
            <Calendar
                mode="single"
                selected={selectedDay}
                onSelect={onSelectDay}
                className="rounded-xl border shadow-sm bg-card w-full"
                modifiersClassNames={{
                  today: 'bg-transparent text-foreground',
                  selected: 'bg-primary text-primary-foreground hover:bg-primary/90'
                }}
                components={{
                    DayContent: DayWithTasks,
                }}
            />
            <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-card border flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Total Monthly</span>
                    <span className="text-2xl font-bold text-foreground">{tasksWithDueDates.length} Tasks</span>
                </div>
                <div className="p-4 rounded-xl bg-card border flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Selected Day</span>
                    <span className="text-2xl font-bold text-primary">{selectedDayTasks.length} Active</span>
                </div>
            </div>
        </div>
        <div className="lg:col-span-5 flex flex-col bg-background">
          <CardHeader className="bg-card border-b py-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-extrabold tracking-tight">
                  {selectedDay ? format(selectedDay, 'EEEE, MMM d') : "Daily Timeline"}
                </CardTitle>
                <CardDescription className="font-medium">
                  {selectedDayTasks.length === 0 ? "No blocks scheduled" : `${selectedDayTasks.length} Blocks scheduled`}
                </CardDescription>
              </div>
              <AddTaskDialog onTaskSave={onAddTask} defaultDueDate={selectedDay}>
                  <Button size="icon" className="rounded-full h-12 w-12 shadow-md">
                    <Plus className="h-6 w-6" />
                  </Button>
              </AddTaskDialog>
            </div>
          </CardHeader>
          <ScrollArea className="flex-1 max-h-[700px]">
            <CardContent className="p-6">
              {selectedDayTasks.length > 0 ? (
                <div className="space-y-0 relative">
                  {/* Visual Timeline Tracker */}
                  <div className="absolute left-[3.25rem] top-0 bottom-0 w-px bg-border/60 z-0" />
                  
                  {dayHours.map((hour) => {
                      const hourTasks = selectedDayTasks.filter(t => {
                          if (!t.startTime) return false;
                          const taskHour = parseInt(t.startTime.split(':')[0], 10);
                          return taskHour === hour;
                      });

                      // Also handle tasks without times at the end or top
                      const showHour = hourTasks.length > 0 || (hour % 3 === 0);

                      if (!showHour && hourTasks.length === 0) return null;

                      return (
                          <div key={hour} className="flex gap-4 mb-4 relative z-10">
                              <div className="w-10 text-right">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                      {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                                  </span>
                              </div>
                              <div className="flex-1 space-y-2">
                                  {hourTasks.map(task => (
                                      <TimeBlockItem key={task.id} task={task} />
                                  ))}
                                  {hourTasks.length === 0 && <div className="h-6 border-b border-dashed border-border/30" />}
                              </div>
                          </div>
                      );
                  })}
                  
                  {/* Section for tasks with no specific time */}
                  {selectedDayTasks.filter(t => !t.startTime).length > 0 && (
                      <div className="mt-8 pt-6 border-t">
                          <h4 className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground mb-4">Unscheduled Blocks</h4>
                          <div className="grid gap-3">
                              {selectedDayTasks.filter(t => !t.startTime).map(task => (
                                  <div key={task.id} className="ml-14">
                                      <TimeBlockItem task={task} />
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 text-center text-muted-foreground opacity-40">
                  <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-6">
                    <Clock className="h-10 w-10" />
                  </div>
                  <p className="text-sm font-bold tracking-tight max-w-[200px]">
                      {selectedDay ? "Your schedule is clear for today." : "Select a day to visualize your schedule."}
                  </p>
                </div>
              )}
            </CardContent>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
