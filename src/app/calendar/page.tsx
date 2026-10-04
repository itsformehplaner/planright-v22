
'use client';

import * as React from 'react';
import type { Task, TaskStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import MainLayout from '@/components/main-layout';
import { CalendarView } from '@/components/calendar-view';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useHasMounted } from '@/hooks/use-has-mounted';
import { useMainLayout } from '@/components/main-layout';

function CalendarPageContent() {
    const { tasks, setTasks, activeProject, handleAddToCalendar } = useMainLayout();

    const [selectedCalendarDay, setSelectedCalendarDay] = React.useState<Date | undefined>(new Date());
    const { toast } = useToast();

    const projectTasks = React.useMemo(() => {
        if (!tasks || !activeProject) return [];
        return tasks.filter(t => t.projectId === activeProject.id);
    }, [tasks, activeProject]);

    const handleAddTask = (data: Omit<Task, 'id' | 'status' | 'createdAt' | 'projectId'>) => {
        if (!activeProject) return;
        const newTask: Task = {
            ...data,
            id: uuidv4(),
            status: data.trackDailyProgress ? 'in-progress' : 'active',
            createdAt: new Date(),
            progress: data.trackDailyProgress ? [] : undefined,
            projectId: activeProject.id,
        };
        setTasks(prev => (prev ? [...prev, newTask] : [newTask]));

        if (newTask.dueDate) {
            toast({
                title: "Task Added!",
                description: `"${newTask.title}" has been successfully added.`,
                action: (
                    <Button variant="outline" size="sm" onClick={() => handleAddToCalendar(newTask)}>
                        Add to Calendar
                    </Button>
                ),
            });
        } else {
            toast({
                title: "Task Added!",
                description: `"${newTask.title}" has been successfully added.`,
            });
        }
    };

    const handleUpdateTask = (updatedTask: Task) => {
        setTasks(prev => prev ? prev.map(task => (task.id === updatedTask.id ? updatedTask : task)) : []);
        toast({
            title: 'Task Updated!',
            description: `"${updatedTask.title}" has been updated.`,
        });
    };

    const handleSetTaskStatus = (taskId: string, status: TaskStatus, cancellationNote?: string) => {
        setTasks(prev =>
            prev ? prev.map(task => {
                if (task.id === taskId) {
                    const updatedTask: Partial<Task> = {
                        status,
                        completionDate: status === 'completed' ? new Date() : undefined,
                        cancellationNote: status === 'canceled' ? cancellationNote : undefined,
                    };
                    return { ...task, ...updatedTask };
                }
                return task;
            }) : []
        );
    };

    if (tasks === null || !activeProject) {
        return (
             <Card>
                <CardContent className="p-2 sm:p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                        <Skeleton className="rounded-md border w-full h-[365px]" />
                    </div>
                    <div className="lg:col-span-1">
                        <Skeleton className="h-full w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <CalendarView 
            tasks={projectTasks}
            onUpdateTask={handleUpdateTask}
            onSetTaskStatus={handleSetTaskStatus}
            onAddTask={handleAddTask}
            selectedDay={selectedCalendarDay}
            onSelectDay={setSelectedCalendarDay}
        />
    );
}


export default function CalendarPage() {
    const hasMounted = useHasMounted();
    
    return (
        <MainLayout>
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Calendar View</h1>
                    <p className="text-muted-foreground">See your tasks on a monthly calendar.</p>
                </div>
            </div>
             {hasMounted ? <CalendarPageContent /> : (
                <Card>
                    <CardContent className="p-2 sm:p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                            <Skeleton className="rounded-md border w-full h-[365px]" />
                        </div>
                        <div className="lg:col-span-1">
                            <Skeleton className="h-full w-full" />
                        </div>
                    </CardContent>
                </Card>
            )}
        </MainLayout>
    );
}
