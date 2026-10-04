
'use client';

import * as React from 'react';
import type { Task, Project, VaultItem } from '@/lib/types';
import { ProductivityDashboard } from '@/components/productivity-dashboard';
import { useToast } from '@/hooks/use-toast';
import { sub, startOfDay, startOfWeek, endOfWeek, isWithinInterval, parseISO, isSameDay, parse, format } from 'date-fns';
import MainLayout from '@/components/main-layout';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Skeleton } from '@/components/ui/skeleton';
import { useHasMounted } from '@/hooks/use-has-mounted';
import { useMainLayout } from '@/components/main-layout';

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

function DashboardPageContent() {
    const { tasks, setTasks, projects, setProjects, activeProject } = useMainLayout();

    const [personalBestStreak, setPersonalBestStreak] = useLocalStorage<number>('personalBestStreak', 0);
    const [streakSavers, setStreakSavers] = useLocalStorage<number>('streakSavers', 0);
    const [lastSaverEarnedWeek, setLastSaverEarnedWeek] = useLocalStorage<string | null>('lastSaverEarnedWeek', null);

    const [now, setNow] = React.useState(new Date());
    const { toast } = useToast();
    const router = useRouter();

    const projectTasks = React.useMemo(() => {
        if (!tasks || !activeProject) return [];
        return tasks.filter(t => t.projectId === activeProject.id);
    }, [tasks, activeProject]);

    React.useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);
    
    const productivityStreak = React.useMemo(() => {
        if (!projectTasks) return 0;
        
        const completedTasks = projectTasks.filter(t => t.status === 'completed' && t.completionDate);
        const completionDates = new Set(
            completedTasks.map(t => startOfDay(new Date(t.completionDate!)).getTime())
        );

        projectTasks.forEach(task => {
            if (task.trackDailyProgress && task.progress) {
                task.progress.forEach(progressEntry => {
                    if (progressEntry && progressEntry.date) {
                        completionDates.add(startOfDay(parseISO(progressEntry.date)).getTime());
                    }
                });
            }
        });

        if (completionDates.size === 0) return 0;
        
        let today = startOfDay(new Date());
        let yesterday = sub(today, { days: 1 });
        let currentStreak = 0;

        if (completionDates.has(today.getTime()) || completionDates.has(yesterday.getTime())) {
            currentStreak = completionDates.has(today.getTime()) ? 1 : 0;
            let dayToCheck = completionDates.has(today.getTime()) ? sub(today, { days: 1 }) : sub(yesterday, { days: 1 });

            while (completionDates.has(dayToCheck.getTime())) {
                currentStreak++;
                dayToCheck = sub(dayToCheck, { days: 1 });
            }
        } else {
            if (streakSavers && streakSavers > 0) {
                let dayBeforeYesterday = sub(today, { days: 2 });
                if (completionDates.has(dayBeforeYesterday.getTime())) {
                    setStreakSavers(prev => Math.max(0, (prev || 0) - 1));
                    toast({
                        title: "Streak Saved!",
                        description: "You missed a day, but your streak saver kept it going!",
                    });

                    currentStreak = 1;
                    let dayToCheck = sub(dayBeforeYesterday, { days: 1 });
                     while (completionDates.has(dayToCheck.getTime())) {
                        currentStreak++;
                        dayToCheck = sub(dayToCheck, { days: 1 });
                    }
                }
            }
        }
        return currentStreak;
    }, [projectTasks, streakSavers, toast, setStreakSavers]);

    const weeklyCompletionCount = React.useMemo(() => {
        if (!projectTasks) return 0;
        const now = new Date();
        const weekStart = startOfWeek(now);
        const weekEnd = endOfWeek(now);
        
        let count = 0;
        projectTasks.forEach(task => {
            if (task.status === 'completed' && task.completionDate && isWithinInterval(new Date(task.completionDate), { start: weekStart, end: weekEnd })) {
                count++;
            }
            if (task.trackDailyProgress && task.progress) {
                task.progress.forEach(progressEntry => {
                    if (progressEntry && progressEntry.date && isWithinInterval(parseISO(progressEntry.date), { start: weekStart, end: weekEnd })) {
                        count++;
                    }
                });
            }
        });
        return count;
    }, [projectTasks]);

    React.useEffect(() => {
        const weekIdentifier = `${startOfWeek(new Date()).toISOString()}`;
        if (weeklyCompletionCount >= 10 && weekIdentifier !== lastSaverEarnedWeek) {
            setStreakSavers(prev => (prev || 0) + 1);
            setLastSaverEarnedWeek(weekIdentifier);
            toast({
                title: "Streak Saver Earned!",
                description: "Great job! You can now miss one day without breaking your streak.",
            });
        }
    }, [weeklyCompletionCount, lastSaverEarnedWeek, toast, setStreakSavers, setLastSaverEarnedWeek]);

    React.useEffect(() => {
        if (productivityStreak > (personalBestStreak || 0)) {
            setPersonalBestStreak(productivityStreak);
        }
    }, [productivityStreak, personalBestStreak, setPersonalBestStreak]);

    const liveTasks = React.useMemo(() => {
        if (!projectTasks) return [];
        return projectTasks.filter(task => isTaskLive(task, now));
    }, [projectTasks, now]);

    const handleUpdateTask = (updatedTask: Task) => {
        setTasks(prev => prev ? prev.map(task => (task.id === updatedTask.id ? updatedTask : task)) : []);
        toast({
            title: 'Task Updated!',
            description: `"${updatedTask.title}" has been updated.`,
        });
    };

    const handleUpdateProjectVault = (items: VaultItem[]) => {
        if (!activeProject) return;
        setProjects(prev => prev ? prev.map(p => p.id === activeProject.id ? { ...p, vault: items } : p) : []);
        toast({ title: 'Vault Updated', description: 'Your project reference info has been saved.' });
    };

    const handleChartClick = (payload: any) => {
        if (!payload || !payload.name) return;
    
        const name = payload.name.toLowerCase();
    
        if (name === 'overdue') {
            router.push('/tasks?filter=overdue');
            return;
        }

        if (payload.date) {
            router.push(`/tasks?completedOn=${format(payload.date, 'yyyy-MM-dd')}`);
            return;
        }
    
        const statusMap: { [key: string]: string } = {
            'active': 'active',
            'in progress': 'in-progress',
            'on hold': 'on-hold',
            'completed': 'completed',
            'canceled': 'canceled'
        };
    
        const priorityMap: { [key: string]: string } = {
            'urgent': 'urgent',
            'high': 'high',
            'medium': 'medium',
            'low': 'low'
        };
    
        if (statusMap[name]) {
            router.push(`/tasks?status=${statusMap[name]}`);
        } else if (priorityMap[name]) {
            router.push(`/tasks?priority=${priorityMap[name]}`);
        }
    };
    
    if (tasks === null || !activeProject) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Skeleton className="h-24 col-span-1" />
                <Skeleton className="h-24 col-span-1" />
                <Skeleton className="h-24 col-span-1" />
                <Skeleton className="h-24 col-span-1" />
                <Skeleton className="h-64 col-span-full" />
                <Skeleton className="h-80 col-span-2" />
                <Skeleton className="h-80 col-span-2" />
            </div>
        )
    }

    return (
        <ProductivityDashboard 
            tasks={projectTasks} 
            liveTasks={liveTasks}
            activeProject={activeProject}
            onChartClick={handleChartClick}
            productivityStreak={productivityStreak}
            personalBestStreak={personalBestStreak || 0}
            streakSavers={streakSavers || 0}
            weeklyCompletionCount={weeklyCompletionCount}
            onUpdateTask={handleUpdateTask}
            onUpdateProjectVault={handleUpdateProjectVault}
        />
    )
}

export default function DashboardPage() {
    const hasMounted = useHasMounted();

    return (
        <MainLayout>
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Productivity Dashboard</h1>
                    <p className="text-muted-foreground">An overview of your progress.</p>
                </div>
            </div>
            {hasMounted ? <DashboardPageContent /> : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Skeleton className="h-24 col-span-1" />
                    <Skeleton className="h-24 col-span-1" />
                    <Skeleton className="h-24 col-span-1" />
                    <Skeleton className="h-24 col-span-1" />
                    <Skeleton className="h-64 col-span-full" />
                    <Skeleton className="h-80 col-span-2" />
                    <Skeleton className="h-80 col-span-2" />
                </div>
            )}
        </MainLayout>
    );
}
