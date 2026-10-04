
'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PomodoroTimer } from '@/components/pomodoro-timer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Zap, Brain, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FocusSessionProps {
  tasks: Task[];
  onCompleteTask: (taskId: string) => void;
}

export function FocusSession({ tasks, onCompleteTask }: FocusSessionProps) {
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);
  
  const currentTask = React.useMemo(() => {
    return tasks.find(t => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  // Try to pick an "in-progress" task by default if available
  React.useEffect(() => {
    if (!selectedTaskId && tasks.length > 0) {
        const inProgress = tasks.find(t => t.status === 'in-progress');
        if (inProgress) setSelectedTaskId(inProgress.id);
        else setSelectedTaskId(tasks[0].id);
    }
  }, [tasks, selectedTaskId]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-2">
            <Zap className="h-6 w-6 text-primary fill-primary" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">Focus Mode</h1>
        <p className="text-muted-foreground">Eliminate distractions and get things done.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Brain className="h-5 w-5 text-primary" />
                        Current Objective
                    </CardTitle>
                    <CardDescription>Select the task you want to focus on.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Select value={selectedTaskId || ''} onValueChange={setSelectedTaskId}>
                        <SelectTrigger className="h-12 text-lg">
                            <SelectValue placeholder="Pick a task to focus on..." />
                        </SelectTrigger>
                        <SelectContent>
                            {tasks.map(task => (
                                <SelectItem key={task.id} value={task.id}>
                                    {task.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {currentTask ? (
                        <div className="p-6 bg-muted/30 rounded-xl border-2 border-dashed border-primary/20 text-center animate-in zoom-in-95 duration-300">
                            <h3 className="text-2xl font-bold mb-2">{currentTask.title}</h3>
                            {currentTask.description && (
                                <p className="text-muted-foreground text-sm mb-6">{currentTask.description}</p>
                            )}
                            <Button 
                                size="lg" 
                                className="w-full h-14 text-lg font-bold"
                                onClick={() => onCompleteTask(currentTask.id)}
                            >
                                <CheckCircle2 className="mr-2 h-6 w-6" />
                                Finish Task
                            </Button>
                        </div>
                    ) : (
                        <div className="h-40 flex flex-col items-center justify-center text-center opacity-50 border-2 border-dashed rounded-xl">
                            <ArrowRight className="h-8 w-8 mb-2 animate-bounce" />
                            <p>Select a task to begin your focus session</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                <CardContent className="p-6">
                    <h4 className="font-bold text-primary mb-2">Pro Tip</h4>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        Focus Mode hides all sidebars and distractions. The single objective helps your brain maintain flow.
                        Try to work for one Pomodoro block (25m) without checking any other apps.
                    </p>
                </CardContent>
            </Card>
        </div>

        <div className="lg:sticky lg:top-24">
            <PomodoroTimer />
        </div>
      </div>
    </div>
  );
}
