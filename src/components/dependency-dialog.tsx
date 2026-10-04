
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Task } from '@/lib/types';
import { Link, Link2Off, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

interface DependencyDialogProps {
  task: Task;
  allTasks: Task[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (dependsOn: string[]) => void;
}

export function DependencyDialog({
  task,
  allTasks,
  open,
  onOpenChange,
  onSave,
}: DependencyDialogProps) {
  const [selectedDependencies, setSelectedDependencies] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      setSelectedDependencies(task.dependsOn || []);
    }
  }, [open, task.dependsOn]);
  
  const getDescendants = (taskId: string, tasks: Task[]): string[] => {
    let children = tasks.filter(t => t.parentId === taskId).map(t => t.id);
    return children.reduce((acc, childId) => [...acc, ...getDescendants(childId, tasks)], children);
  }

  const possibleDependencies = React.useMemo(() => {
    const descendants = getDescendants(task.id, allTasks);
    // Tasks that depend on the current task
    const dependents = allTasks.filter(t => t.dependsOn?.includes(task.id)).map(t => t.id);
    const invalidIds = new Set([task.id, task.parentId, ...descendants, ...dependents]);
    
    return allTasks.filter(t => !invalidIds.has(t.id));
  }, [task, allTasks]);


  const handleCheckedChange = (taskId: string, checked: boolean) => {
    setSelectedDependencies(prev =>
      checked ? [...prev, taskId] : prev.filter(id => id !== taskId)
    );
  };

  const handleSave = () => {
    onSave(selectedDependencies);
  };
  
  const handleClear = () => {
    setSelectedDependencies([]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dependencies for: "{task.title}"</DialogTitle>
          <DialogDescription>
            Select tasks that must be completed before this task can be started.
            You cannot select the task itself, its sub-tasks, or tasks that already depend on it.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ScrollArea className="h-64 border rounded-md p-4">
            {possibleDependencies.length > 0 ? (
                 <div className="space-y-3">
                    {possibleDependencies.map(pTask => (
                        <div key={pTask.id} className="flex items-center gap-3">
                            <Checkbox
                                id={`dep-${pTask.id}`}
                                checked={selectedDependencies.includes(pTask.id)}
                                onCheckedChange={(checked) => handleCheckedChange(pTask.id, !!checked)}
                            />
                            <Label htmlFor={`dep-${pTask.id}`} className="flex-1 cursor-pointer">
                                {pTask.title}
                            </Label>
                            <Badge variant={pTask.status === 'completed' ? 'default' : 'secondary'} className={cn(pTask.status === 'completed' && 'bg-green-600')}>
                                {pTask.status}
                            </Badge>
                        </div>
                    ))}
                 </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <Link className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">No available tasks to set as dependencies.</p>
                </div>
            )}
          </ScrollArea>
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={handleClear} disabled={selectedDependencies.length === 0}>
                <Link2Off className="mr-2 h-4 w-4" />
                Clear All
            </Button>
            <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                    Cancel
                </Button>
                <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Dependencies
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
