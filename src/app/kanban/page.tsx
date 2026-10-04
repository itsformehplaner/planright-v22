
'use client';

import * as React from 'react';
import MainLayout from '@/components/main-layout';
import { useMainLayout } from '@/components/main-layout';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { getInitialTasks } from '@/lib/get-initial-tasks';
import { KanbanBoard } from '@/components/kanban-board';
import { useHasMounted } from '@/hooks/use-has-mounted';
import { Skeleton } from '@/components/ui/skeleton';
import type { Task, TaskStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

function KanbanPageContent() {
    const { activeProject } = useMainLayout();
    const { toast } = useToast();

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
                return getInitialTasks();
            }
        }
    });

    const projectTasks = React.useMemo(() => {
        if (!tasks || !activeProject) return [];
        return tasks.filter(t => t.projectId === activeProject.id);
    }, [tasks, activeProject]);

    const handleUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
        setTasks(prev => prev ? prev.map(t => t.id === taskId ? { 
            ...t, 
            status: newStatus,
            completionDate: newStatus === 'completed' ? new Date() : undefined,
            updatedAt: new Date()
        } : t) : []);
        
        toast({
            title: "Status Updated",
            description: `Task moved to ${newStatus}.`,
        });
    };

    return <KanbanBoard tasks={projectTasks} onUpdateStatus={handleUpdateStatus} />;
}

export default function KanbanPage() {
    const hasMounted = useHasMounted();

    return (
        <MainLayout>
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Kanban Board</h1>
                <p className="text-muted-foreground">Manage your workflow across different stages.</p>
            </div>
            {hasMounted ? (
                <KanbanPageContent />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[600px]">
                    <Skeleton className="h-full w-full" />
                    <Skeleton className="h-full w-full" />
                    <Skeleton className="h-full w-full" />
                    <Skeleton className="h-full w-full" />
                </div>
            )}
        </MainLayout>
    );
}
