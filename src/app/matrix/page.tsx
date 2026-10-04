
'use client';

import * as React from 'react';
import MainLayout from '@/components/main-layout';
import { useMainLayout } from '@/components/main-layout';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { getInitialTasks } from '@/lib/get-initial-tasks';
import { EisenhowerMatrix } from '@/components/eisenhower-matrix';
import { useHasMounted } from '@/hooks/use-has-mounted';
import { Skeleton } from '@/components/ui/skeleton';
import type { Task } from '@/lib/types';

function MatrixPageContent() {
    const { activeProject } = useMainLayout();

    const [tasks] = useLocalStorage<Task[]>('tasks', getInitialTasks(), {
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
                return getInitialTasks();
            }
        }
    });

    const projectTasks = React.useMemo(() => {
        if (!tasks || !activeProject) return [];
        return tasks.filter(t => t.projectId === activeProject.id && t.status !== 'completed' && t.status !== 'canceled');
    }, [tasks, activeProject]);

    return <EisenhowerMatrix tasks={projectTasks} />;
}

export default function EisenhowerPage() {
    const hasMounted = useHasMounted();

    return (
        <MainLayout>
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Eisenhower Matrix</h1>
                <p className="text-muted-foreground">Prioritize tasks by urgency and importance.</p>
            </div>
            {hasMounted ? (
                <MatrixPageContent />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 aspect-square max-h-[800px]">
                    <Skeleton className="h-full w-full" />
                    <Skeleton className="h-full w-full" />
                    <Skeleton className="h-full w-full" />
                    <Skeleton className="h-full w-full" />
                </div>
            )}
        </MainLayout>
    );
}
