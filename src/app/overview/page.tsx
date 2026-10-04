
'use client';

import * as React from 'react';
import type { Task, Project } from '@/lib/types';
import MainLayout, { useMainLayout } from '@/components/main-layout';
import { useHasMounted } from '@/hooks/use-has-mounted';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, CheckCircle2, ListTodo, TrendingUp, AlertTriangle, Clock, Trophy, Zap, Sparkles, MessageSquareQuote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { isSameDay, parse, format, isPast } from 'date-fns';

const isTaskLive = (task: Task, now: Date): boolean => {
    if (!task.dueDate || !task.startTime || !task.endTime || (task.status !== 'active' && task.status !== 'in-progress')) {
        return false;
    }
    try {
        const taskDate = new Date(task.dueDate);
        if (!isSameDay(now, taskDate)) {
            return false;
        }
        const start = parse(task.startTime, 'HH:mm', taskDate);
        const end = parse(task.endTime, 'HH:mm', taskDate);
        return now >= start && now < end;
    } catch (e) {
        return false;
    }
};

function OverviewPageContent() {
    const { projects, tasks, setActiveProjectId } = useMainLayout();
    const router = useRouter();
    const [now, setNow] = React.useState<Date | null>(null);

    React.useEffect(() => {
        setNow(new Date());
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const stats = React.useMemo(() => {
        if (!tasks || !projects || !now) return null;

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const globalProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        const projectSummaries = projects.map(project => {
            const projectTasks = tasks.filter(t => t.projectId === project.id);
            const pTotal = projectTasks.length;
            const pCompleted = projectTasks.filter(t => t.status === 'completed').length;
            const pProgress = pTotal > 0 ? (pCompleted / pTotal) * 100 : 0;
            
            const activeCount = projectTasks.filter(t => ['active', 'in-progress'].includes(t.status)).length;
            const overdueCount = projectTasks.filter(t => t.dueDate && ['active', 'in-progress'].includes(t.status) && isPast(new Date(t.dueDate)) && !isSameDay(new Date(t.dueDate), now)).length;
            const liveCount = projectTasks.filter(t => isTaskLive(t, now)).length;

            return {
                ...project,
                total: pTotal,
                completed: pCompleted,
                progress: pProgress,
                active: activeCount,
                overdue: overdueCount,
                live: liveCount
            };
        });

        const globalCritical = tasks
            .filter(t => (t.priority === 'urgent' || t.priority === 'high') && (t.status === 'active' || t.status === 'in-progress'))
            .sort((a, b) => {
                const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                if (a.priority === b.priority) return dateA - dateB;
                return a.priority === 'urgent' ? -1 : 1;
            })
            .slice(0, 5);

        const recentWins = tasks
            .filter(t => t.status === 'completed' && t.outcomeNote)
            .sort((a, b) => new Date(b.completionDate!).getTime() - new Date(a.completionDate!).getTime())
            .slice(0, 6);

        return {
            totalTasks,
            completedTasks,
            globalProgress,
            projectSummaries,
            globalCritical,
            recentWins
        };
    }, [tasks, projects, now]);

    const handleEnterProject = (projectId: string) => {
        setActiveProjectId(projectId);
        router.push('/dashboard');
    };

    if (!stats) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-32 w-full" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in-0 duration-500">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                        <ListTodo className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalTasks}</div>
                        <p className="text-xs text-muted-foreground">Across {projects?.length} projects</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.completedTasks}</div>
                        <p className="text-xs text-muted-foreground">{Math.round(stats.globalProgress)}% completion rate</p>
                    </CardContent>
                </Card>
                <Card className="col-span-1 md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Global Progress</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-2xl font-bold">{Math.round(stats.globalProgress)}%</div>
                        <Progress value={stats.globalProgress} className="h-2" />
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-1">
                 <Card className="col-span-full border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Sparkles className="h-6 w-6 text-yellow-500" />
                            Global Victory Log
                        </CardTitle>
                        <CardDescription>Top achievements across all your projects.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.recentWins.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {stats.recentWins.map(task => (
                                    <div key={task.id} className="p-4 rounded-xl bg-background border shadow-sm relative group overflow-hidden">
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">
                                                    {projects?.find(p => p.id === task.projectId)?.name}
                                                </p>
                                                <h4 className="font-bold text-sm truncate">{task.title}</h4>
                                            </div>
                                            <div className="bg-green-500 rounded-full p-1 shadow-lg">
                                                <CheckCircle2 className="h-4 w-4 text-white" />
                                            </div>
                                        </div>
                                        <div className="bg-muted/50 p-3 rounded-lg border border-dashed">
                                            <p className="text-xs italic leading-relaxed text-muted-foreground line-clamp-2">
                                                <MessageSquareQuote className="h-3 w-3 inline mr-1 opacity-50" />
                                                {task.outcomeNote}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                <Trophy className="h-10 w-10 mb-2 opacity-20" />
                                <p className="text-sm">Start recording task outcomes to see your global victory log!</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-500" />
                            Top Global Priorities
                        </CardTitle>
                        <CardDescription>The most urgent tasks across all your projects.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.globalCritical.length > 0 ? (
                            <div className="space-y-4">
                                {stats.globalCritical.map(task => (
                                    <div key={task.id} className="flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{task.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {projects?.find(p => p.id === task.projectId)?.name}
                                            </p>
                                        </div>
                                        <Badge variant={task.priority === 'urgent' ? 'destructive' : 'default'} className="shrink-0 uppercase text-[10px]">
                                            {task.priority}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-4 text-center text-muted-foreground">
                                <Trophy className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-sm">No high-priority tasks left! Great job.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Project Health
                        </CardTitle>
                        <CardDescription>Status summary of your active projects.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         {stats.projectSummaries.slice(0, 4).map(p => (
                             <div key={p.id} className="space-y-1">
                                 <div className="flex justify-between text-xs font-medium">
                                     <span>{p.name}</span>
                                     <span className={cn(p.overdue > 0 && "text-destructive")}>{p.overdue > 0 ? `${p.overdue} Overdue` : `${Math.round(p.progress)}%`}</span>
                                 </div>
                                 <Progress value={p.progress} className="h-1.5" />
                             </div>
                         ))}
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">Project Summaries</h2>
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {stats.projectSummaries.map(project => (
                        <Card key={project.id} className="group hover:border-primary/50 transition-colors">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                                        <CardDescription className="line-clamp-1">{project.description || 'No description'}</CardDescription>
                                    </div>
                                    <Badge 
                                        variant={project.progress === 100 ? 'default' : 'secondary'} 
                                        className={cn(project.progress === 100 && "bg-green-500 hover:bg-green-600 shrink-0 ml-2")}
                                    >
                                        {Math.round(project.progress)}%
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Progress value={project.progress} className="h-2" />
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Completion</span>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            <span className="text-sm font-semibold">{project.completed} / {project.total}</span>
                                        </div>
                                    </div>
                                    {project.live > 0 ? (
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-primary uppercase font-bold tracking-wider">Live Now</span>
                                            <div className="flex items-center gap-2 animate-pulse">
                                                <Zap className="h-4 w-4 text-primary fill-primary" />
                                                <span className="text-sm font-semibold text-primary">{project.live} Active</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1 opacity-50">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Tasks</span>
                                            <div className="flex items-center gap-2">
                                                <ListTodo className="h-4 w-4" />
                                                <span className="text-sm font-semibold">{project.active}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {project.overdue > 0 && (
                                    <Badge variant="destructive" className="w-full justify-center gap-2 py-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        {project.overdue} Overdue
                                    </Badge>
                                )}

                                <Button 
                                    variant="outline" 
                                    className="w-full text-xs h-8 group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                                    onClick={() => handleEnterProject(project.id)}
                                >
                                    Enter Project
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function OverviewPage() {
    const hasMounted = useHasMounted();
    
    return (
        <MainLayout>
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold tracking-tight">Global Overview</h1>
                <p className="text-muted-foreground mt-2">Aggregate metrics and mission control across your projects.</p>
            </div>
            {hasMounted ? <OverviewPageContent /> : (
                 <div className="space-y-6">
                    <Skeleton className="h-32 w-full" />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                </div>
            )}
        </MainLayout>
    );
}
