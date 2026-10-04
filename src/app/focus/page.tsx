
'use client';

import * as React from 'react';
import MainLayout from '@/components/main-layout';
import { useMainLayout } from '@/components/main-layout';
import { FocusSession } from '@/components/focus-session';
import { useHasMounted } from '@/hooks/use-has-mounted';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

function FocusPageContent() {
    const { activeProject, tasks, setTasks } = useMainLayout();
    const { toast } = useToast();

    const activeTasks = React.useMemo(() => {
        if (!tasks || !activeProject) return [];
        return tasks.filter(t => t.projectId === activeProject.id && (t.status === 'active' || t.status === 'in-progress'));
    }, [tasks, activeProject]);

    const handleCompleteTask = (taskId: string) => {
        if (!tasks) return;
        setTasks(prev => prev ? prev.map(t => t.id === taskId ? { 
            ...t, 
            status: 'completed',
            completionDate: new Date(),
            updatedAt: new Date()
        } : t) : []);
        
        toast({
            title: "Focus Task Completed!",
            description: "Great job! Take a short break.",
        });
    };

    if (tasks === null) return <Skeleton className="h-[600px] w-full" />;

    return <FocusSession tasks={activeTasks} onCompleteTask={handleCompleteTask} />;
}

export default function FocusPage() {
    const hasMounted = useHasMounted();

    return (
        <MainLayout>
            {hasMounted ? (
                <FocusPageContent />
            ) : (
                <Skeleton className="h-[600px] w-full" />
            )}
        </MainLayout>
    );
}
