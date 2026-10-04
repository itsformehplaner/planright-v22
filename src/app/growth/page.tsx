
'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import MainLayout from '@/components/main-layout';
import { GrowthDashboard } from '@/components/growth-dashboard';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { getInitialTasks } from '@/lib/get-initial-tasks';
import { useMainLayout } from '@/components/main-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { useHasMounted } from '@/hooks/use-has-mounted';

function GrowthPageContent() {
    const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', getInitialTasks(), {
        deserializer: (str) => {
            try {
                const parsed = JSON.parse(str) as any[];
                return parsed.map((task) => ({
                    ...task,
                    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
                    completionDate: task.completionDate ? new Date(task.completionDate) : undefined,
                    createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
                }));
            } catch (e) {
                return [];
            }
        }
    });

    const { activeProject } = useMainLayout();

    const projectTasks = React.useMemo(() => {
        if (!tasks || !activeProject) return [];
        return tasks.filter(t => t.projectId === activeProject.id);
    }, [tasks, activeProject]);


    if (tasks === null || !activeProject) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Skeleton className="col-span-full h-72" />
                <Skeleton className="col-span-1 lg:col-span-2 h-72" />
                <Skeleton className="col-span-1 h-72" />
            </div>
        )
    }
    
    return (
        <GrowthDashboard tasks={projectTasks} />
    );
}

export default function GrowthPage() {
    const hasMounted = useHasMounted();

    return (
        <MainLayout>
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Personal Growth</h1>
                    <p className="text-muted-foreground">Track your progress on personal and learning goals.</p>
                </div>
            </div>
            {hasMounted ? <GrowthPageContent /> : (
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Skeleton className="col-span-full h-72" />
                    <Skeleton className="col-span-1 lg:col-span-2 h-72" />
                    <Skeleton className="col-span-1 h-72" />
                </div>
            )}
        </MainLayout>
    );
}
