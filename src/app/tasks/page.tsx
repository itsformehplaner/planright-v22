
'use client';

import * as React from 'react';
import type { Task, Priority, TaskStatus, TaskCategory } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { isPast, startOfDay, parse, isSameDay, isFuture, parseISO } from 'date-fns';

import { TaskList } from '@/components/task-list';
import { TaskFilters } from '@/components/task-filters';
import { useMainLayout } from '@/components/main-layout';
import { useSearchParams } from 'next/navigation';
import MainLayout from '@/components/main-layout';
import { useHasMounted } from '@/hooks/use-has-mounted';
import { getNextDueDate } from '@/lib/date-utils';
import { Skeleton } from '@/components/ui/skeleton';

export type SortOption = 'dueDate' | 'upcoming' | 'createdAt' | 'priority' | 'completionDate' | 'status';

const isTaskLive = (task: Task, now: Date): boolean => {
    if (!task.dueDate || !task.startTime || !task.endTime || (task.status !== 'active' && task.status !== 'in-progress')) {
        return false;
    }
    try {
        const taskDate = new Date(task.dueDate);
        if (!isSameDay(now, taskDate)) {
            return false;
        }
        const start = parse(task.startTime, 'HH:mm', taskDate);
        const end = parse(task.endTime, 'HH:mm', taskDate);
        return now >= start && now < end;
    } catch (e) {
        return false;
    }
};

const isTaskOrDescendantLive = (task: Task, allTasks: Task[], now: Date): boolean => {
    if (isTaskLive(task, now)) {
        return true;
    }
    const children = allTasks.filter(t => t.parentId === task.id);
    if (children.length === 0) {
        return false;
    }
    return children.some(child => isTaskOrDescendantLive(child, allTasks, now));
};

function TasksPageContent() {
    const { tasks, setTasks, activeProject, handleAddToCalendar } = useMainLayout();

    const [statusFilter, setStatusFilter] = React.useState<TaskStatus | 'all'>('active');
    const [priorityFilters, setPriorityFilters] = React.useState<Priority[]>([]);
    const [categoryFilters, setCategoryFilters] = React.useState<TaskCategory[]>([]);
    const [sortOption, setSortOption] = React.useState<SortOption>('status');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [showOnlyOverdue, setShowOnlyOverdue] = React.useState(false);
    const [completedOnDate, setCompletedOnDate] = React.useState<string | null>(null);

    const [now, setNow] = React.useState(new Date());
    const [expandedTasks, setExpandedTasks] = React.useState<string[]>([]);
    const [activeSwipeId, setActiveSwipeId] = React.useState<string | null>(null);
    const [sortedTasks, setSortedTasks] = React.useState<Task[]>([]);
    const [finalTasks, setFinalTasks] = React.useState<Task[]>([]);
    const searchParams = useSearchParams();
    
    const hasMounted = useHasMounted();
    const { toast } = useToast();
    
    const projectTasks = React.useMemo(() => {
        if (!tasks || !activeProject) return [];
        return tasks.filter(t => t.projectId === activeProject.id);
    }, [tasks, activeProject]);

    React.useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    React.useEffect(() => {
        const filter = searchParams.get('filter');
        if (filter === 'overdue') {
            setShowOnlyOverdue(true);
            setStatusFilter('all');
            setPriorityFilters([]);
            setCategoryFilters([]);
            setCompletedOnDate(null);
        }

        const status = searchParams.get('status');
        if (status) {
            setStatusFilter(status as TaskStatus);
            setShowOnlyOverdue(false);
            setPriorityFilters([]);
            setCategoryFilters([]);
            setCompletedOnDate(null);
        }

        const priority = searchParams.get('priority');
        if (priority) {
            setPriorityFilters([priority as Priority]);
            setStatusFilter('all');
            setShowOnlyOverdue(false);
            setCategoryFilters([]);
            setCompletedOnDate(null);
        }

        const completedOn = searchParams.get('completedOn');
        if (completedOn) {
            setCompletedOnDate(completedOn);
            setStatusFilter('all');
            setShowOnlyOverdue(false);
            setPriorityFilters([]);
            setCategoryFilters([]);
        }
    }, [searchParams]);

    const handleUpdateTask = (updatedTask: Task) => {
        const taskWithUpdate = { ...updatedTask, updatedAt: new Date() };
        setTasks(prev => prev ? prev.map(task => (task.id === taskWithUpdate.id ? taskWithUpdate : task)) : []);
        toast({
            title: 'Task Updated!',
            description: `"${taskWithUpdate.title}" has been updated.`,
        });
    };

    const handleDeleteTask = (taskId: string) => {
        if (!tasks) return;
        const taskToDelete = tasks.find(t => t.id === taskId);
        if (!taskToDelete) return;

        setTasks(prev => prev ? prev.filter(t => t.id !== taskId && t.parentId !== taskId) : []);

        toast({
            title: 'Task Deleted',
            description: `"${taskToDelete.title}" and its subtasks have been deleted.`,
            variant: 'destructive'
        });
    };
    

    const handleSetTaskStatus = (taskId: string, status: TaskStatus, cancellationNote?: string) => {
        if (!tasks) return;
        let newTasks: Task[] = [];
        const originalTask = tasks.find(task => task.id === taskId);
        
        const updatedTasks = tasks.map(task => {
            if (task.id === taskId) {
                const updatedTask: Partial<Task> = {
                    status,
                    completionDate: status === 'completed' ? new Date() : undefined,
                    cancellationNote: status === 'canceled' ? cancellationNote : undefined,
                    updatedAt: new Date(),
                };

                if (status !== 'completed') {
                    delete updatedTask.completionDate;
                }
                if (status !== 'canceled') {
                    delete updatedTask.cancellationNote;
                }

                return { ...task, ...updatedTask };
            }
            return task;
        });

        if (status === 'completed' && originalTask?.recurrence) {
            const nextDueDate = getNextDueDate(originalTask);
            if (nextDueDate) {
                const newTask: Task = {
                    ...originalTask,
                    id: uuidv4(),
                    status: 'active',
                    dueDate: nextDueDate,
                    completionDate: undefined,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    originalRecurringTaskId: originalTask.originalRecurringTaskId || originalTask.id,
                };
                newTasks.push(newTask);
            }
        }
        
        setTasks([...updatedTasks, ...newTasks]);

        const taskTitle = tasks.find(t => t.id === taskId)?.title || 'Task';
        toast({
            title: `Task Status Updated`,
            description: `"${taskTitle}" has been set to ${status}.`
        });
    };

    const handleAddSubTasks = (parentId: string, subTasksData: Omit<Task, 'id' | 'status' | 'parentId' | 'createdAt' | 'projectId'>[]) => {
        if (!activeProject || !tasks) return;
        const parentCategory = tasks.find(t => t.id === parentId)?.category || 'Work';
        const newSubTasks: Task[] = subTasksData.map(data => ({
            ...data,
            id: uuidv4(),
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
            parentId: parentId,
            category: data.category || parentCategory,
            projectId: activeProject.id
        }));
        setTasks(prev => prev ? [...prev, ...newSubTasks] : newSubTasks);
    };

    const overdueTasks = React.useMemo(() => {
        if (!projectTasks) return [];
        return projectTasks.filter(task => task.dueDate && ['active', 'in-progress'].includes(task.status) && isPast(startOfDay(new Date(task.dueDate))));
    }, [projectTasks]);

    const filteredTasks = React.useMemo(() => {
        if (!projectTasks) return [];
        let filtered = [...projectTasks];

        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(task =>
                task.title.toLowerCase().includes(lowercasedQuery) ||
                (task.description && task.description.toLowerCase().includes(lowercasedQuery))
            );
        }

        if (showOnlyOverdue) {
            return overdueTasks;
        }

        if (completedOnDate) {
            const targetDate = parseISO(completedOnDate);
            return filtered.filter(task => 
                (task.completionDate && isSameDay(new Date(task.completionDate), targetDate)) ||
                (task.progress?.some(p => p.date && isSameDay(parseISO(p.date), targetDate)))
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(task => task.status === statusFilter);
        }

        if (priorityFilters.length > 0) {
            filtered = filtered.filter(task => task.priority && priorityFilters.includes(task.priority));
        }

        if (categoryFilters.length > 0) {
            filtered = filtered.filter(task => task.category && categoryFilters.includes(task.category));
        }

        return filtered;
    }, [projectTasks, statusFilter, priorityFilters, showOnlyOverdue, overdueTasks, searchQuery, categoryFilters, completedOnDate]);

    React.useEffect(() => {
        if (!tasks) {
            setSortedTasks([]);
            return;
        }

        let sorted = [...filteredTasks].sort((a, b) => {
            const getPriorityRank = (task: Task) => {
                const priorityOrder: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
                return priorityOrder[task.priority] || 0;
            }

            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;

            const getStatusRank = (task: Task) => {
                switch(task.status) {
                    case 'in-progress': return 5;
                    case 'on-hold': return 4;
                    case 'active': return 3;
                    case 'completed': return 2;
                    case 'canceled': return 1;
                    default: return 0;
                }
            };

            switch(sortOption) {
                case 'createdAt':
                    return b.createdAt.getTime() - a.createdAt.getTime();
                case 'dueDate': {
                    const isActionableA = ['active', 'in-progress', 'on-hold'].includes(a.status);
                    const isActionableB = ['active', 'in-progress', 'on-hold'].includes(b.status);

                    if (isActionableA && !isActionableB) return -1;
                    if (!isActionableA && isActionableB) return 1;

                    const dateA = a.dueDate?.getTime() || Infinity;
                    const dateB = b.dueDate?.getTime() || Infinity;

                    if (dateA !== dateB) return dateA - dateB;
                    
                    return getPriorityRank(b) - getPriorityRank(a);
                }
                case 'upcoming': {
                    const isFutureA = a.dueDate && isFuture(a.dueDate);
                    const isFutureB = b.dueDate && isFuture(b.dueDate);
                    if (isFutureA && !isFutureB) return -1;
                    if (!isFutureA && isFutureB) return 1;
                    if (isFutureA && isFutureB) {
                        return a.dueDate!.getTime() - b.dueDate!.getTime();
                    }
                    return (a.dueDate?.getTime() || Infinity) - (b.dueDate?.getTime() || Infinity);
                }
                case 'priority':
                    return getPriorityRank(b) - getPriorityRank(a);
                case 'completionDate': {
                    const isCompletedA = a.status === 'completed' && a.completionDate;
                    const isCompletedB = b.status === 'completed' && b.completionDate;

                    if (isCompletedA && !isCompletedB) return -1;
                    if (!isCompletedA && isCompletedB) return 1;

                    if (isCompletedA && isCompletedB) {
                        return b.completionDate!.getTime() - b.completionDate!.getTime();
                    }
                    return getStatusRank(b) - getStatusRank(a);
                }
                case 'status':
                    return getStatusRank(b) - getStatusRank(a);
                default:
                    return 0;
            }
        });

        setSortedTasks(sorted);

    }, [filteredTasks, sortOption, tasks]);

     React.useEffect(() => {
        if (hasMounted && tasks) {
            const clientSorted = [...sortedTasks].sort((a, b) => {
                const isALive = isTaskOrDescendantLive(a, tasks, now);
                const isBLive = isTaskOrDescendantLive(b, tasks, now);
                if (isALive && !isBLive) return -1;
                if (!isALive && isBLive) return 1;
                return 0;
            });
            setFinalTasks(clientSorted);
        } else {
            setFinalTasks(sortedTasks);
        }
     }, [sortedTasks, now, hasMounted, tasks]);

    if (tasks === null || !activeProject) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        );
    }

    return (
        <>
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
                    <p className="text-muted-foreground">Here is your organized task list.</p>
                </div>
            </div>
            <div className="mt-6">
                <TaskFilters 
                    status={statusFilter}
                    onStatusChange={(status) => { setStatusFilter(status); setShowOnlyOverdue(false); setCompletedOnDate(null); }}
                    priorities={priorityFilters}
                    onPrioritiesChange={(priorities) => { setPriorityFilters(priorities); setShowOnlyOverdue(false); setCompletedOnDate(null); }}
                    categories={categoryFilters}
                    onCategoriesChange={(categories) => { setCategoryFilters(categories); setShowOnlyOverdue(false); setCompletedOnDate(null); }}
                    sortOption={sortOption}
                    onSortChange={setSortOption}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                />
            </div>
            <div className="mt-6">
                <TaskList
                    tasks={finalTasks}
                    allTasks={tasks}
                    onSetTaskStatus={handleSetTaskStatus}
                    onDeleteTask={handleDeleteTask}
                    onUpdateTask={handleUpdateTask}
                    onAddSubTasks={handleAddSubTasks}
                    onAddToCalendar={handleAddToCalendar}
                    sortOption={sortOption}
                    currentTime={now}
                    expandedTasks={expandedTasks}
                    onExpandedChange={setExpandedTasks}
                    activeSwipeId={activeSwipeId}
                    onActiveSwipeIdChange={setActiveSwipeId}
                />
            </div>
        </>
    );
}

export default function TasksPage() {
    const hasMounted = useHasMounted();
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <MainLayout>
                {hasMounted ? <TasksPageContent /> : (
                    <div className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                )}
            </MainLayout>
        </React.Suspense>
    );
}
