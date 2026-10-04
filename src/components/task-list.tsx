

import * as React from 'react';
import type { Task, Priority, TaskStatus } from '@/lib/types';
import { TaskItem } from '@/components/task-item';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { ListTodo } from 'lucide-react';
import type { SortOption } from '@/app/tasks/page';

interface TaskListProps {
  tasks: Task[];
  allTasks: Task[]; // We need all tasks to find children
  onSetTaskStatus: (id: string, status: TaskStatus, cancellationNote?: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (task: Task) => void;
  onAddSubTasks: (parentId: string, subTasks: Omit<Task, 'id'| 'status' | 'parentId' | 'createdAt'>[]) => void;
  onAddToCalendar: (task: Task) => void;
  sortOption: SortOption;
  currentTime: Date;
  expandedTasks: string[];
  onExpandedChange: (expanded: string[]) => void;
  activeSwipeId: string | null;
  onActiveSwipeIdChange: (id: string | null) => void;
}

const sortTasks = (tasks: Task[], sortOption: SortOption) => {
    return [...tasks].sort((a, b) => {
        switch(sortOption) {
            case 'createdAt':
                return b.createdAt.getTime() - a.createdAt.getTime();
            case 'dueDate':
                return (a.dueDate?.getTime() || Infinity) - (b.dueDate?.getTime() || Infinity);
            case 'priority':
                const priorityOrder: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
                return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            case 'completionDate':
                return (b.completionDate?.getTime() || 0) - (a.completionDate?.getTime() || 0);
            case 'status':
                const statusOrder: Record<TaskStatus, number> = { 'in-progress': 5, 'on-hold': 4, 'active': 3, 'completed': 2, 'canceled': 1 };
                return (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
            default:
                return 0;
        }
    });
}

const RecursiveTaskList: React.FC<Omit<TaskListProps, 'tasks'> & { tasksToRender: Task[] }> = ({ tasksToRender, ...props }) => {
    const { allTasks, sortOption } = props;
    
    // Memoize to prevent re-calculating on every render
    const taskSubtaskMap = React.useMemo(() => {
        const map = new Map<string, Task[]>();
        tasksToRender.forEach(task => {
            const subtasks = allTasks.filter(sub => sub.parentId === task.id);
            map.set(task.id, sortTasks(subtasks, sortOption));
        });
        return map;
    }, [tasksToRender, allTasks, sortOption]);

    const renderSubtasks = (subtasks: Task[]) => {
      if (subtasks.length === 0) return null;
      return <RecursiveTaskList {...props} tasksToRender={subtasks} />;
    };
    
    return (
         <div className="w-full grid gap-2">
            {tasksToRender.map(task => (
                <TaskItem
                    key={task.id}
                    task={task}
                    allTasks={props.allTasks}
                    subtasks={taskSubtaskMap.get(task.id) || []}
                    onSetStatus={props.onSetTaskStatus}
                    onDelete={props.onDeleteTask}
                    onUpdate={props.onUpdateTask}
                    onAddSubTasks={props.onAddSubTasks}
                    onAddToCalendar={props.onAddToCalendar}
                    isExpanded={props.expandedTasks.includes(task.id)}
                    onToggleExpand={() => {
                        const newExpanded = props.expandedTasks.includes(task.id)
                            ? props.expandedTasks.filter(id => id !== task.id)
                            : [...props.expandedTasks, task.id];
                        props.onExpandedChange(newExpanded);
                    }}
                    renderSubtasks={renderSubtasks}
                    currentTime={props.currentTime}
                    activeSwipeId={props.activeSwipeId}
                    onActiveSwipeIdChange={props.onActiveSwipeIdChange}
                />
            ))}
         </div>
    )
}

export function TaskList(props: TaskListProps) {
    const parentTasks = props.tasks.filter(task => !task.parentId);

  if (props.tasks.length === 0) {
    return (
      <Card className="border-dashed shadow-none flex flex-col items-center justify-center p-8 text-center">
        <div className="rounded-full border border-dashed p-4">
            <ListTodo className="h-12 w-12 text-muted-foreground" />
        </div>
        <CardHeader className="p-4 pb-2">
            <CardTitle as="h2" className="text-xl">No tasks here!</CardTitle>
        </CardHeader>
        <CardDescription>Add a new task or adjust your filters to see your to-dos.</CardDescription>
      </Card>
    );
  }

  return (
    <div className="w-full grid gap-2" onClickCapture={() => props.onActiveSwipeIdChange(null)}>
      <RecursiveTaskList 
          {...props}
          tasksToRender={parentTasks}
      />
    </div>
  );
}
