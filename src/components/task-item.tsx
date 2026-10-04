'use client';

import { format, isPast, parse, setHours, setMinutes, differenceInDays, formatDistanceToNow, isToday, isTomorrow, differenceInCalendarDays, differenceInMilliseconds, startOfDay, parseISO, isSameDay } from 'date-fns';
import { AlertTriangle, Calendar, Check, ChevronDown, ChevronUp, Minus, X, CircleDot, XCircle, Ban, Clock, Link as LinkIcon, Lock, Briefcase, User, Wrench, GraduationCap, PauseCircle, Loader, MoreHorizontal, Edit, Plus, CalendarPlus, Trash2, MessageSquare, Save, Trash, Pencil, Pin, PinOff, Repeat, Sparkles, History, Trophy, Lightbulb } from 'lucide-react';
import * as React from 'react';

import type { Task, Priority, TaskStatus, TaskCategory, ProgressEntry, TaskNote } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from './ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Progress } from './ui/progress';
import { useIsMobile } from '@/hooks/use-mobile';
import { CancelTaskDialog } from './cancel-task-dialog';
import { Checkbox } from './ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { AddTaskDialog } from './add-task-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { DependencyDialog } from './dependency-dialog';
import { Textarea } from './ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { v4 as uuidv4 } from 'uuid';


interface TaskItemProps {
  task: Task;
  allTasks: Task[];
  subtasks: Task[];
  onSetStatus: (taskId: string, status: TaskStatus, cancellationNote?: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (task: Task) => void;
  onAddSubTasks: (parentId: string, subTasks: Omit<Task, 'id'| 'status' | 'parentId' | 'createdAt'>[]) => void;
  onAddToCalendar: (task: Task) => void;
  isExpanded: boolean;
  onToggleExpand: (taskId: string) => void;
  renderSubtasks: (tasks: Task[]) => React.ReactNode;
  currentTime: Date;
  activeSwipeId: string | null;
  onActiveSwipeIdChange: (id: string | null) => void;
}

const priorityConfig: Record<Priority, { label: string; color: string; icon: React.ElementType, borderColor: string; checkboxColor: string; value: number; textColor: string; }> = {
    urgent: { label: 'Urgent', color: 'border-transparent bg-red-500 text-red-50 hover:bg-red-500/80 dark:bg-red-900 dark:text-red-50 dark:hover:bg-red-900/80', icon: AlertTriangle, borderColor: 'border-red-500/50 dark:border-red-900/80', checkboxColor: 'border-red-600', value: 4, textColor: 'text-red-500' },
    high: { label: 'High', color: 'border-transparent bg-amber-500 text-amber-50 hover:bg-amber-500/80 dark:bg-amber-800 dark:text-amber-50 dark:hover:bg-amber-800/80', icon: ChevronUp, borderColor: 'border-amber-500/50 dark:border-amber-800/80', checkboxColor: 'border-amber-500', value: 3, textColor: 'text-amber-500' },
    medium: { label: 'Medium', color: 'border-transparent bg-blue-500 text-blue-50 hover:bg-blue-500/80 dark:bg-blue-800 dark:text-blue-50 dark:hover:bg-blue-800/80', icon: Minus, borderColor: 'border-blue-500/50 dark:border-blue-800/80', checkboxColor: 'border-blue-500', value: 2, textColor: 'text-blue-500' },
    low: { label: 'Low', color: 'border-transparent bg-green-400 text-green-950 hover:bg-green-400/80 dark:bg-green-700 dark:text-green-50 dark:hover:bg-green-700/80', icon: ChevronDown, borderColor: 'border-green-500/50 dark:border-green-700/80', checkboxColor: 'border-green-400', value: 1, textColor: 'text-green-500' },
};

const categoryConfig: Record<TaskCategory, { label: string; icon: React.ElementType, color: string }> = {
    Work: { label: 'Work', icon: Briefcase, color: 'text-indigo-500' },
    Personal: { label: 'Personal', icon: User, color: 'text-pink-500' },
    Chore: { label: 'Chore', icon: Wrench, color: 'text-gray-500' },
    Learning: { label: 'Learning', icon: GraduationCap, color: 'text-teal-500' },
};


const priorities: Priority[] = ['low', 'medium', 'high', 'urgent'];
const categories: TaskCategory[] = ['Work', 'Personal', 'Chore', 'Learning'];


const getPulseDuration = (task: Task, now: Date): number => {
    if (!task.dueDate || task.status !== 'active' || !isPast(task.dueDate)) {
        return 2;
    }
    const priorityValue = priorityConfig[task.priority].value;
    const daysOverdue = differenceInDays(now, task.dueDate);
    const overdueFactor = Math.max(1, 4 - Math.floor(daysOverdue / 3));
    const duration = 2.5 - (priorityValue * 0.3) - ((4 - overdueFactor) * 0.2);
    return Math.max(0.5, Math.min(2, duration));
};


const TimeBadge: React.FC<{ dueDate: Date, hasTime: boolean }> = ({ dueDate, hasTime }) => {
    const now = new Date();
    const taskDate = new Date(dueDate);
    const msDiff = differenceInMilliseconds(taskDate, now);

    let text = '';
    let color = '';

    if (msDiff < 0) { // Overdue
        text = `${formatDistanceToNow(taskDate)} ago`;
        color = 'bg-destructive/80 text-destructive-foreground';
    } else if (isToday(taskDate)) {
        text = `Due Today`;
        color = 'border-transparent bg-yellow-400 text-yellow-950 hover:bg-yellow-400/80 dark:bg-yellow-600 dark:text-yellow-50 dark:hover:bg-yellow-600/80';
    } else if (isTomorrow(taskDate)) {
        text = 'Due Tomorrow';
        color = 'border-transparent bg-yellow-400 text-yellow-950 hover:bg-yellow-400/80 dark:bg-yellow-600 dark:text-yellow-50 dark:hover:bg-yellow-600/80';
    } else if (differenceInCalendarDays(taskDate, now) < 7) {
        text = `in ${differenceInCalendarDays(taskDate, now)} days`;
        color = 'border-transparent bg-sky-500 text-sky-50 hover:bg-sky-500/80 dark:bg-sky-800 dark:text-sky-50 dark:hover:bg-sky-800/80';
    } else {
        text = format(taskDate, 'MMM d');
    }

    if (hasTime && msDiff > 0) {
        return null;
    }

    return (
        <Badge variant={color ? "default" : "secondary"} className={cn("flex items-center gap-1", color)}>
            <Clock className="h-3 w-3" />
            {text}
        </Badge>
    );
};


export function TaskItem({ task, allTasks, subtasks, onSetStatus, onDelete, onUpdate, onAddSubTasks, onAddToCalendar, isExpanded, onToggleExpand, renderSubtasks, currentTime, activeSwipeId, onActiveSwipeIdChange }: TaskItemProps) {
  const [isClient, setIsClient] = React.useState(false);
  
  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  const isOverdue = isClient && task.dueDate && task.status === 'active' && isPast(new Date(task.dueDate));
  const { label: priorityLabel, icon: PriorityIcon, color: priorityColor, textColor } = priorityConfig[task.priority];
  const { label: categoryLabel, icon: CategoryIcon, color: categoryColor } = categoryConfig[task.category];
  const [date, setDate] = React.useState<Date | undefined>(task.dueDate ? new Date(task.dueDate) : undefined);
  const [startTime, setStartTime] = React.useState(task.startTime || "");
  const [endTime, setEndTime] = React.useState(task.endTime || "");
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = React.useState<'edit' | 'subtask' | 'cancel' | 'dependency' | 'completion' | null>(null);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = React.useState(false);
  const todayISO = isClient ? startOfDay(new Date()).toISOString().split('T')[0] : '';
  const [todayNote, setTodayNote] = React.useState('');
  const [isNoteVisible, setIsNoteVisible] = React.useState(false);
  const [isMoreMenuOpen, setMoreMenuOpen] = React.useState(false);
  const [newTaskLog, setNewTaskLog] = React.useState('');
  
  // Outcome Note State
  const [isEditingOutcome, setIsEditingOutcome] = React.useState(false);
  const [tempOutcome, setTempOutcome] = React.useState(task.outcomeNote || '');

  const SWIPE_THRESHOLD = -56;
  const itemRef = React.useRef<HTMLDivElement>(null);
  const touchStart = React.useRef<{ x: number, time: number } | null>(null);
  const [offsetX, setOffsetX] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const isSwiped = activeSwipeId === task.id;

  const isTaskLive = React.useCallback((t: Task, now: Date): boolean => {
    if (!t.dueDate || !t.startTime || !t.endTime || (t.status !== 'active' && t.status !== 'in-progress')) {
        return false;
    }
    try {
        const taskDate = new Date(t.dueDate);
        if (!isSameDay(now, taskDate)) {
            return false;
        }
        const start = parse(t.startTime, 'HH:mm', taskDate);
        const end = parse(t.endTime, 'HH:mm', taskDate);
        return now >= start && now < end;
    } catch(e) {
        return false;
    }
  }, []);
  
  const isTaskOrDescendantLive = React.useCallback((t: Task, all: Task[], now: Date): boolean => {
    if (isTaskLive(t, now)) {
        return true;
    }
    const children = all.filter(child => child.parentId === t.id);
    if (children.length === 0) {
        return false;
    }
    return children.some(child => isTaskOrDescendantLive(child, all, now));
  }, [isTaskLive]);

  const isLive = isClient ? isTaskOrDescendantLive(task, allTasks, currentTime) : false;

  const todaysProgress = React.useMemo(() => {
    if (!isClient) return undefined;
    return task.progress?.find(p => p && p.date && p.date.startsWith(todayISO));
  }, [task.progress, todayISO, isClient]);

  React.useEffect(() => {
    if (todaysProgress) {
        setTodayNote(todaysProgress.note || '');
        setIsNoteVisible(true);
    } else {
        setIsNoteVisible(false);
        setTodayNote('');
    }
  }, [todaysProgress]);

  const { isBlocked, blockingTasks } = React.useMemo(() => {
    if (!task.dependsOn || task.dependsOn.length === 0) {
      return { isBlocked: false, blockingTasks: [] };
    }
    const blocking = allTasks.filter(
      t => task.dependsOn?.includes(t.id) && t.status !== 'completed'
    );
    return { isBlocked: blocking.length > 0, blockingTasks: blocking };
  }, [task.dependsOn, allTasks]);


  const completedSubtasks = subtasks.filter(st => st.status === 'completed').length;
  const subtaskProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;
  const isReadyForCompletion = subtasks.length > 0 && subtaskProgress === 100 && task.status !== 'completed' && task.status !== 'canceled';

  const handlePriorityChange = (newPriority: string) => {
    if (priorities.includes(newPriority as Priority)) {
        onUpdate({ ...task, priority: newPriority as Priority });
    }
  }

  const handleCategoryChange = (newCategory: string) => {
    if (categories.includes(newCategory as TaskCategory)) {
        onUpdate({ ...task, category: newCategory as TaskCategory });
    }
  }
  
  const updateTaskDateTime = (newDate: Date | undefined, newStartTime: string, newEndTime: string) => {
    let finalDueDate: Date | undefined = newDate;

    if (newDate && newStartTime) {
        try {
            const parsedTime = parse(newStartTime, "HH:mm", new Date());
            finalDueDate = setMinutes(setHours(newDate, parsedTime.getHours()), parsedTime.getMinutes());
        } catch (e) { console.error("Invalid start time format"); }
    }
    
    onUpdate({ ...task, dueDate: finalDueDate, startTime: newStartTime, endTime: newEndTime });
  };


  const handleDateChange = (d: Date | undefined) => {
    setDate(d);
    updateTaskDateTime(d, startTime, endTime);
  }

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartTime(e.target.value);
    updateTaskDateTime(date, e.target.value, endTime);
  }

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndTime(e.target.value);
    updateTaskDateTime(date, startTime, e.target.value);
  }
  
  const handleClearDate = () => {
      setDate(undefined);
      setStartTime("");
      setEndTime("");
      onUpdate({ ...task, dueDate: undefined, startTime: undefined, endTime: undefined });
  }

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (newStatus === 'canceled' && task.status !== 'canceled') {
        setDialogOpen('cancel');
    } else if (newStatus === 'completed' && task.status !== 'completed') {
        setDialogOpen('completion');
    } else {
        onSetStatus(task.id, newStatus);
    }
  }

  const handleCancelTask = (note: string) => {
      onSetStatus(task.id, 'canceled', note);
      setDialogOpen(null);
  }

  const handleCompleteFinalize = (note: string) => {
      onSetStatus(task.id, 'completed');
      if (note.trim()) {
          onUpdate({ ...task, status: 'completed', outcomeNote: note.trim(), completionDate: new Date() });
      }
      setDialogOpen(null);
  }
  
  const backgroundClass = isClient && isOverdue
    ? 'bg-destructive/10 dark:bg-destructive/20'
    : task.status === 'completed'
    ? 'bg-muted/50'
    : task.status === 'canceled'
    ? 'bg-neutral-200/50 dark:bg-neutral-800/20'
    : task.status === 'on-hold'
    ? 'bg-amber-400/10 dark:bg-amber-800/20'
    : task.status === 'in-progress'
    ? 'bg-sky-400/10 dark:bg-sky-800/20'
    : isReadyForCompletion
    ? 'bg-green-500/5 dark:bg-green-500/10'
    : 'bg-card';

  const pulseDuration = isClient ? getPulseDuration(task, currentTime) : 2;

  const statusIcons: Record<TaskStatus, React.ReactNode> = {
    active: <CircleDot className={cn("h-4 w-4", textColor)} />,
    'in-progress': <Loader className="h-4 w-4 text-sky-500 animate-spin" />,
    'on-hold': <PauseCircle className="h-4 w-4 text-amber-500" />,
    completed: <Check className="h-4 w-4 text-green-500" />,
    canceled: <Ban className="h-4 w-4 text-muted-foreground" />,
  };
  
  const handleAddSubtask = (data: Omit<Task, 'id'|'status'|'createdAt'>) => {
    onAddSubTasks(task.id, [data]);
    setDialogOpen(null);
  };

  const handleUpdate = (data: Task) => {
    onUpdate(data);
    setDialogOpen(null);
  }

  const handleUpdateDependencies = (dependsOn: string[]) => {
    onUpdate({ ...task, dependsOn });
    setDialogOpen(null);
  };

  const handleDailyProgressToggle = () => {
    const today = startOfDay(new Date()).toISOString().split('T')[0];
    const currentProgress = task.progress || [];
    const isChecked = currentProgress.some(p => p && p.date && p.date.startsWith(today));

    let newProgress: ProgressEntry[];

    if (isChecked) {
        newProgress = currentProgress.filter(p => p && p.date && !p.date.startsWith(today));
    } else {
        newProgress = [...currentProgress.filter(p => p && p.date), { date: today, note: todayNote }];
        setIsNoteVisible(true);
    }
    onUpdate({ ...task, progress: newProgress });
  };

  const handleSaveOutcome = () => {
    onUpdate({ ...task, outcomeNote: tempOutcome.trim() });
    setIsEditingOutcome(false);
  };

  const handleAddTaskLog = () => {
    if (!newTaskLog.trim()) return;
    const newNote: TaskNote = {
        id: uuidv4(),
        content: newTaskLog.trim(),
        createdAt: new Date(),
    };
    onUpdate({
        ...task,
        taskLogs: [...(task.taskLogs || []), newNote]
    });
    setNewTaskLog('');
  };

  const handleDeleteTaskLog = (logId: string) => {
    onUpdate({
        ...task,
        taskLogs: (task.taskLogs || []).filter(l => l.id !== logId)
    });
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (activeSwipeId && activeSwipeId !== task.id) {
        onActiveSwipeIdChange(null);
    }
    touchStart.current = { x: e.targetTouches[0].clientX, time: Date.now() };
    if (itemRef.current) {
        itemRef.current.style.transition = 'none';
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    setIsDragging(true);
    const currentX = e.targetTouches[0].clientX;
    const diff = currentX - touchStart.current.x;

    const newOffsetX = diff < 0 ? diff : diff / 5;
    setOffsetX(newOffsetX);
    
    if (itemRef.current) {
      itemRef.current.style.transform = `translateX(${newOffsetX}px)`;
    }
  };

  const onTouchEnd = () => {
    if (!touchStart.current) return;
    if (itemRef.current) {
      itemRef.current.style.transition = 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)';
    }
    const touchDuration = Date.now() - touchStart.current.time;
    const isQuickFlick = touchDuration < 250;
    const flickThreshold = isQuickFlick ? SWIPE_THRESHOLD / 2 : SWIPE_THRESHOLD;
    if (offsetX < flickThreshold) onActiveSwipeIdChange(task.id);
    else onActiveSwipeIdChange(null);
    setTimeout(() => setIsDragging(false), 200);
    touchStart.current = null;
    setOffsetX(0);
  };

  React.useEffect(() => {
    if (!isDragging && itemRef.current) {
        const targetX = isSwiped ? SWIPE_THRESHOLD : 0;
        itemRef.current.style.transform = `translateX(${targetX}px)`;
    }
  }, [isSwiped, isDragging]);

  const mobileActions = (
    <div className="space-y-2">
      <Button className="w-full justify-start" variant="ghost" onClick={() => { onUpdate({ ...task, isPinned: !task.isPinned }); setMoreMenuOpen(false); }}>
        {task.isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
        <span>{task.isPinned ? 'Unpin Task' : 'Pin Task'}</span>
      </Button>
      <Button className="w-full justify-start" variant="ghost" onClick={() => { setDialogOpen('edit'); setMoreMenuOpen(false); }}>
        <Edit className="mr-2 h-4 w-4" />
        <span>Edit Task</span>
      </Button>
      <Button className="w-full justify-start" variant="ghost" onClick={() => { setDialogOpen('subtask'); setMoreMenuOpen(false); }}>
        <Plus className="mr-2 h-4 w-4" />
        <span>Add Sub-task</span>
      </Button>
      <Button className="w-full justify-start" variant="ghost" onClick={() => { setDialogOpen('dependency'); setMoreMenuOpen(false); }}>
        <LinkIcon className="mr-2 h-4 w-4" />
        <span>Add/Edit Dependencies</span>
      </Button>
      {task.dueDate && (
        <Button className="w-full justify-start" variant="ghost" onClick={() => { onAddToCalendar(task); setMoreMenuOpen(false); }}>
          <CalendarPlus className="mr-2 h-4 w-4" />
          <span>Add to Calendar</span>
        </Button>
      )}
      <Separator />
      <Button className="w-full justify-start" variant="ghost" onClick={() => { setDialogOpen('cancel'); setMoreMenuOpen(false); }} disabled={task.status === 'canceled'}>
        <XCircle className="mr-2 h-4 w-4" />
        <span>Cancel Task</span>
      </Button>
      <Button className="w-full justify-start text-destructive" variant="ghost" onClick={() => { setDeleteAlertOpen(true); setMoreMenuOpen(false); }}>
        <Trash2 className="mr-2 h-4 w-4" />
        <span>Delete Task</span>
      </Button>
    </div>
  );

  return (
    <>
    <Collapsible open={isExpanded && isClient} onOpenChange={() => onToggleExpand(task.id)} className="w-full">
      <div className={cn('relative w-full overflow-hidden')}>
        <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end">
          {isClient && isMobile && (
             <Sheet open={isMoreMenuOpen} onOpenChange={setMoreMenuOpen}>
              <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className={cn("h-8 w-8 flex-shrink-0 transition-opacity", isSwiped ? 'opacity-100' : 'opacity-0')}>
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">More actions</span>
                  </Button>
              </SheetTrigger>
               <SheetContent>
                  <SheetHeader>
                      <SheetTitle>{task.title}</SheetTitle>
                      <SheetDescription>Select an action for this task.</SheetDescription>
                  </SheetHeader>
                   <div className="py-4">{mobileActions}</div>
              </SheetContent>
             </Sheet>
          )}
        </div>
        <div
          ref={itemRef}
          className="bg-card w-full"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ touchAction: 'pan-y' }}
        >
        <div 
            className={cn(
                'transition-all hover:shadow-md w-full p-3 sm:p-4 flex items-start gap-3 rounded-lg border',
                backgroundClass,
                isClient && isOverdue && 'animate-pulse group-hover:animation-paused',
                isLive && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                isReadyForCompletion && 'border-green-500 shadow-[0_0_15px_-5px_rgba(34,197,94,0.4)]'
            )}
            style={{ animationDuration: isClient && isOverdue ? `${pulseDuration}s` : undefined }}
        >
            <div className="flex items-center pt-1 gap-2">
                {isClient && subtasks.length > 0 ? (
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full -ml-2">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                    </Button>
                  </CollapsibleTrigger>
                ) : (
                  <div className="w-6 h-6"/>
                )}
                <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={isBlocked}>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full disabled:cursor-not-allowed disabled:opacity-50">
                        {isBlocked ? (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Lock className="h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Blocked by {blockingTasks.map(t => t.title).join(', ')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ) : statusIcons[task.status]}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuRadioGroup value={task.status} onValueChange={(val) => handleStatusChange(val as TaskStatus)}>
                        <DropdownMenuRadioItem value="active">Active</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="in-progress">In Progress</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="on-hold">On Hold</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="completed">Completed</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="canceled">Canceled</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="grid gap-1.5 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <h3
                        className={cn(
                            'font-semibold flex items-center gap-2',
                            (task.status === 'completed' || task.status === 'canceled') && 'line-through text-muted-foreground',
                            (task.status === 'on-hold' || isBlocked || task.status === 'in-progress') && 'text-muted-foreground'
                        )}
                        >
                        {isLive && (
                            <Badge className="bg-primary/90 hover:bg-primary/90 text-primary-foreground animate-pulse">
                                <span className="relative flex h-2 w-2 mr-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-foreground"></span>
                                </span>
                                LIVE
                            </Badge>
                        )}
                        {task.isPinned && <Pin className="h-4 w-4 text-primary" />}
                        {task.title}
                        </h3>
                        {isReadyForCompletion && (
                            <Badge className="bg-green-500 hover:bg-green-600 text-white animate-bounce-subtle flex items-center gap-1 h-5 px-1.5 text-[10px]">
                                <Sparkles className="h-3 w-3" />
                                READY
                            </Badge>
                        )}
                    </div>
                </div>
                {task.description && (
                <p className={cn('text-sm text-muted-foreground', (task.status === 'completed' || task.status === 'canceled' || isBlocked || task.status === 'on-hold' || task.status === 'in-progress') && 'line-through')}>
                    {task.description}
                </p>
                )}
                
                {/* Result / Outcome Section for Completed Tasks */}
                {task.status === 'completed' && (
                    <div className="mt-3 p-3 bg-green-500/5 dark:bg-green-500/10 border border-green-500/20 rounded-lg animate-in slide-in-from-top-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-green-600 flex items-center gap-1">
                                <Trophy className="h-3 w-3" />
                                Task Outcome
                            </span>
                            {!isEditingOutcome && (
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditingOutcome(true)}>
                                    <Pencil className="h-3 w-3 text-muted-foreground" />
                                </Button>
                            )}
                        </div>
                        {isEditingOutcome ? (
                            <div className="space-y-2">
                                <Textarea 
                                    placeholder="What was the result? (e.g. Project approved, milestone met)"
                                    value={tempOutcome}
                                    onChange={(e) => setTempOutcome(e.target.value)}
                                    className="text-sm min-h-[60px]"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <Button size="xs" variant="ghost" onClick={() => { setIsEditingOutcome(false); setTempOutcome(task.outcomeNote || ''); }}>Cancel</Button>
                                    <Button size="xs" onClick={handleSaveOutcome}>Save Result</Button>
                                </div>
                            </div>
                        ) : (
                            <div onClick={() => !task.outcomeNote && setIsEditingOutcome(true)} className={cn("cursor-pointer", !task.outcomeNote && "text-muted-foreground italic text-sm")}>
                                {task.outcomeNote || (
                                    <div className="flex items-center gap-2 text-xs">
                                        <Lightbulb className="h-3.5 w-3.5" />
                                        Click to record the final result...
                                    </div>
                                )}
                                {task.outcomeNote && <p className="text-sm text-foreground leading-relaxed">{task.outcomeNote}</p>}
                            </div>
                        )}
                    </div>
                )}

                {/* Task Logs / Records Section */}
                <Collapsible className="mt-2">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground">
                            <History className="h-3 w-3 mr-1" />
                            {task.taskLogs?.length || 0} Records
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-3 p-3 bg-muted/30 rounded-lg border border-dashed">
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Add a quick record..."
                                value={newTaskLog}
                                onChange={(e) => setNewTaskLog(e.target.value)}
                                className="h-8 text-xs"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTaskLog()}
                            />
                            <Button size="sm" className="h-8" onClick={handleAddTaskLog}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        {task.taskLogs && task.taskLogs.length > 0 && (
                            <div className="space-y-2">
                                {[...task.taskLogs].reverse().map(log => (
                                    <div key={log.id} className="text-xs bg-background/50 p-2 rounded border group/log flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <span className="text-[10px] text-muted-foreground block mb-1">
                                                {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                                            </span>
                                            <p className="text-foreground leading-relaxed">{log.content}</p>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-5 w-5 opacity-0 group-hover/log:opacity-100 transition-opacity"
                                            onClick={() => handleDeleteTaskLog(log.id)}
                                        >
                                            <Trash className="h-3 w-3 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CollapsibleContent>
                </Collapsible>

                {task.status === 'canceled' && task.cancellationNote && (
                <p className="text-xs text-muted-foreground italic mt-1 p-2 bg-neutral-200/50 dark:bg-neutral-900/40 rounded-md">
                    <span className="font-semibold">Cancellation Note:</span> {task.cancellationNote}
                </p>
                )}
                {task.trackDailyProgress && (
                <div className="mt-2 p-3 bg-background/50 rounded-md border">
                    <div className="flex items-center justify-between">
                        <label htmlFor={`progress-${task.id}`} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                                id={`progress-${task.id}`}
                                checked={!!todaysProgress}
                                onCheckedChange={handleDailyProgressToggle}
                            />
                            <span className="font-medium">Daily Habit Tracker ({isClient && format(new Date(), 'MMM d')})</span>
                        </label>
                    </div>
                </div>
                )}
                {subtasks.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                    <Progress 
                        value={subtaskProgress} 
                        className={cn("h-2 w-24", subtaskProgress === 100 && "[&>div]:bg-green-500")} 
                    />
                    <span className={cn("text-xs font-bold", subtaskProgress === 100 ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>
                        {completedSubtasks}/{subtasks.length}
                    </span>
                </div>
                )}
                <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground mt-2">
                {isClient && task.dueDate && task.status === 'active' && (
                    <TimeBadge dueDate={new Date(task.dueDate)} hasTime={!!task.startTime} />
                )}
                
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" type="button" className={cn(
                            "flex items-center gap-1 -mx-2 -my-1 h-auto px-2 py-1 text-sm",
                            !task.dueDate && "text-muted-foreground"
                        )}>
                            <Calendar className="h-4 w-4" />
                            {date ? 
                                <span>
                                    {format(date, 'MMM d')}
                                    {startTime && `, ${startTime}`}
                                </span> : 
                                <span>Set Date</span>
                            }
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                            mode="single"
                            selected={date}
                            onSelect={(d) => handleDateChange(d)}
                            initialFocus
                        />
                        <div className="p-2 border-t border-border grid grid-cols-2 gap-2">
                            <Input 
                                type="time"
                                value={startTime}
                                onChange={handleStartTimeChange}
                                disabled={!date}
                            />
                        </div>
                        <div className="p-2 border-t border-border">
                            <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                className="w-full justify-center text-muted-foreground"
                                onClick={handleClearDate}
                            >
                                <X className="mr-2 h-4 w-4" />
                                Clear
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Badge className={cn(priorityColor, "cursor-pointer")} variant="secondary">
                            <PriorityIcon className="h-3 w-3 mr-1"/>
                            {priorityLabel}
                        </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuRadioGroup value={task.priority} onValueChange={handlePriorityChange}>
                            {priorities.map((p) => {
                                const config = priorityConfig[p];
                                return (
                                    <DropdownMenuRadioItem key={p} value={p}>
                                        <config.icon className="mr-2 h-4 w-4" />
                                        {config.label}
                                    </DropdownMenuRadioItem>
                                );
                            })}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
                                        <CategoryIcon className={cn("h-4 w-4", categoryColor)} />
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Category: {categoryLabel}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <DropdownMenuContent>
                        <DropdownMenuRadioGroup value={task.category} onValueChange={handleCategoryChange}>
                            {categories.map((c) => {
                                const config = categoryConfig[c];
                                return (
                                    <DropdownMenuRadioItem key={c} value={c}>
                                        <config.icon className="mr-2 h-4 w-4" />
                                        {config.label}
                                    </DropdownMenuRadioItem>
                                );
                            })}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                {task.completionDate && task.status === 'completed' && (
                    <div className="flex items-center gap-1 text-green-600">
                        <Check className="h-4 w-4" />
                        <span>Completed: {format(new Date(task.completionDate), 'MMM d')}</span>
                    </div>
                )}
                </div>
            </div>
            <div className="flex items-center self-start" onClick={(e) => e.stopPropagation()}>
                {isClient && !isMobile && (
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More actions</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onUpdate({ ...task, isPinned: !task.isPinned })}>
                        {task.isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                        <span>{task.isPinned ? 'Unpin Task' : 'Pin Task'}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDialogOpen('edit')}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Edit Task</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDialogOpen('subtask')}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Add Sub-task</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDialogOpen('dependency')}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    <span>Add/Edit Dependencies</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleStatusChange('canceled')} disabled={task.status === 'canceled'}>
                    <XCircle className="mr-2 h-4 w-4" />
                    <span>Cancel Task</span>
                    </DropdownMenuItem>
                    {task.dueDate && (
                    <DropdownMenuItem onSelect={() => onAddToCalendar(task)}>
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        <span>Add to Calendar</span>
                    </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setDeleteAlertOpen(true)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete Task</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
                )}
            </div>
            </div>
        </div>
      </div>
      <CollapsibleContent>
        <div className="pl-6 pt-2 grid gap-2 relative before:absolute before:left-3 before:top-0 before:h-full before:w-px before:bg-border">
          {renderSubtasks(subtasks)}
        </div>
      </CollapsibleContent>
    </Collapsible>

    <AddTaskDialog
        onTaskSave={() => {}}
        onTaskUpdate={handleUpdate}
        task={task}
        isEditing
        open={dialogOpen === 'edit'}
        onOpenChange={(isOpen) => !isOpen && setDialogOpen(null)}
      />

      <AddTaskDialog
        onTaskSave={handleAddSubtask}
        parentId={task.id}
        open={dialogOpen === 'subtask'}
        onOpenChange={(isOpen) => !isOpen && setDialogOpen(null)}
      />

      <DependencyDialog
        task={task}
        allTasks={allTasks}
        open={dialogOpen === 'dependency'}
        onOpenChange={(isOpen) => !isOpen && setDialogOpen(null)}
        onSave={handleUpdateDependencies}
      />

      <CancelTaskDialog 
        open={dialogOpen === 'cancel'}
        onOpenChange={(isOpen) => !isOpen && setDialogOpen(null)}
        onCancelTask={handleCancelTask}
        taskTitle={task.title}
       />

       <CompletionOutcomeDialog
          open={dialogOpen === 'completion'}
          onOpenChange={(isOpen) => !isOpen && setDialogOpen(null)}
          onConfirm={handleCompleteFinalize}
          taskTitle={task.title}
       />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task and any associated sub-tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => onDelete(task.id)}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CompletionOutcomeDialog({ open, onOpenChange, onConfirm, taskTitle }: { open: boolean, onOpenChange: (open: boolean) => void, onConfirm: (note: string) => void, taskTitle: string }) {
    const [note, setNote] = React.useState('');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md text-center">
                <DialogHeader className="items-center">
                    <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-2">
                        <Sparkles className="h-6 w-6 text-primary fill-primary" />
                    </div>
                    <DialogTitle className="text-xl">Victory Achieved!</DialogTitle>
                    <DialogDescription>
                        You just finished <strong>"{taskTitle}"</strong>. <br/>Would you like to record the final result or any notes?
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea 
                        placeholder="e.g., Client loved the presentation, Milestone 2 reached..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="text-center"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                onConfirm(note);
                            }
                        }}
                    />
                    <p className="text-[10px] text-muted-foreground mt-2">Press Cmd+Enter to save quickly.</p>
                </div>
                <DialogFooter className="sm:justify-center gap-2 flex-col sm:flex-row">
                    <Button variant="ghost" onClick={() => onConfirm('')} className="sm:flex-1">
                        Just Complete
                    </Button>
                    <Button onClick={() => onConfirm(note)} className="sm:flex-1">
                        Record & Finish
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
