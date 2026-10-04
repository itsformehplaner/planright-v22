
'use client';

import * as React from 'react';
import type { Task, TaskTemplate } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import MainLayout from '@/components/main-layout';
import { TaskTemplates } from '@/components/task-templates';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { getInitialTasks } from '@/lib/get-initial-tasks';
import { addDays } from 'date-fns';
import { useMainLayout } from '@/components/main-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { useHasMounted } from '@/hooks/use-has-mounted';

function TemplatesPageContent() {
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
    const [templates, setTemplates] = useLocalStorage<TaskTemplate[]>('taskTemplates', []);
    const { toast } = useToast();
    const router = useRouter();
    const { activeProject } = useMainLayout();

    const handleAddTemplate = (template: Omit<TaskTemplate, 'id'>) => {
        const newTemplate = { ...template, id: uuidv4() };
        setTemplates(prev => (prev ? [...prev, newTemplate] : [newTemplate]));
        toast({
            title: "Template Created!",
            description: `Template "${newTemplate.name}" has been saved.`
        });
    };

    const handleUpdateTemplate = (updatedTemplate: TaskTemplate) => {
        setTemplates(prev => prev ? prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t) : []);
        toast({
            title: "Template Updated!",
            description: `Template "${updatedTemplate.name}" has been updated.`
        });
    };

    const handleDeleteTemplate = (templateId: string) => {
        const templateName = templates?.find(t => t.id === templateId)?.name || 'Template';
        setTemplates(prev => prev ? prev.filter(t => t.id !== templateId) : []);
        toast({
            title: "Template Deleted",
            description: `Template "${templateName}" has been deleted.`,
            variant: 'destructive'
        });
    };

    const handleUseTemplate = (template: TaskTemplate, prefix: string, startDate: Date) => {
        if (!activeProject) {
            toast({ title: "No active project", description: "Please select a project before using a template.", variant: "destructive" });
            return;
        }

        const newTasks: Task[] = template.subTasks.map(subTask => ({
            id: uuidv4(),
            title: prefix ? `${prefix}: ${subTask.title}` : subTask.title,
            description: subTask.description,
            priority: 'medium',
            status: subTask.status,
            category: subTask.category,
            createdAt: new Date(),
            updatedAt: new Date(),
            dueDate: subTask.dueDayOffset !== undefined ? addDays(startDate, subTask.dueDayOffset) : undefined,
            projectId: activeProject.id,
        }));

        setTasks(prev => (prev ? [...prev, ...newTasks] : newTasks));
        toast({
            title: "Tasks Created!",
            description: `${newTasks.length} tasks have been added from the "${template.name}" template.`
        });
        router.push('/tasks');
    };

    if (templates === null) {
        return <Skeleton className="h-64 w-full" />;
    }

    return (
        <TaskTemplates
            templates={templates}
            onAddTemplate={handleAddTemplate}
            onUpdateTemplate={handleUpdateTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onUseTemplate={handleUseTemplate}
        />
    );
}

export default function TemplatesPage() {
    const hasMounted = useHasMounted();
    return (
        <MainLayout>
             {hasMounted ? <TemplatesPageContent /> : <Skeleton className="h-64 w-full" />}
        </MainLayout>
    );
}
