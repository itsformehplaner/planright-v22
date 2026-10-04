
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Command, Plus, Calendar, Flag, Clock } from 'lucide-react';
import type { Task, Priority, TaskCategory } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskSave: (data: Omit<Task, 'id' | 'status' | 'createdAt' | 'projectId'>) => void;
}

export function CommandMenu({ open, onOpenChange, onTaskSave }: CommandMenuProps) {
  const [value, setValue] = React.useState('');
  const [priority, setPriority] = React.useState<Priority>('medium');
  const [category, setCategory] = React.useState<TaskCategory>('Work');
  
  const handleSave = () => {
    if (!value.trim()) return;
    
    onTaskSave({
      title: value.trim(),
      priority,
      category,
      createdAt: new Date(),
    });
    
    setValue('');
    onOpenChange(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
    if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 gap-0 outline-none overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Command className="h-4 w-4" />
                Quick Capture Task
            </DialogTitle>
        </DialogHeader>
        <div className="p-4">
            <Input
                autoFocus
                placeholder="What needs to be done?"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKeyDown}
                className="text-lg h-12 border-none focus-visible:ring-0 px-0"
            />
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                    <span className="font-semibold">Priority:</span>
                    <div className="flex gap-1">
                        {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => (
                            <Badge
                                key={p}
                                variant={priority === p ? 'default' : 'outline'}
                                className={cn("cursor-pointer capitalize px-2 py-0", priority === p ? "opacity-100" : "opacity-50")}
                                onClick={() => setPriority(p)}
                            >
                                {p}
                            </Badge>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-semibold">Category:</span>
                    <div className="flex gap-1">
                        {(['Work', 'Personal', 'Chore', 'Learning'] as TaskCategory[]).map((c) => (
                            <Badge
                                key={c}
                                variant={category === c ? 'secondary' : 'outline'}
                                className={cn("cursor-pointer px-2 py-0", category === c ? "opacity-100" : "opacity-50")}
                                onClick={() => setCategory(c)}
                            >
                                {c}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>
        </div>
        <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-t">
            <p className="text-[10px] text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 rounded bg-background border font-mono">Enter</kbd> to save, <kbd className="px-1.5 py-0.5 rounded bg-background border font-mono">Esc</kbd> to close.
            </p>
            <Button size="sm" onClick={handleSave} disabled={!value.trim()}>
                <Plus className="h-3 w-3 mr-1" />
                Save Task
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
