
import * as React from 'react';
import { PieChart, CheckCircle2, ListTodo, AlertTriangle, Calendar, ChevronsUpDown, XCircle, Ban, Flame, BarChart3, Clock, Trophy, ShieldCheck, PauseCircle, Loader, Pin, ChevronLeft, ChevronRight, TrendingUp, ShieldAlert, Key, Copy, Plus, Trash2, Lock, Unlock, Sparkles, MessageSquareQuote } from 'lucide-react';
import { Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip, Cell, Legend, Bar, XAxis, YAxis, BarChart as RechartsBarChart, AreaChart, Area } from 'recharts';
import { format, isPast, startOfDay, subDays, isSameDay, differenceInCalendarDays, isFuture, parseISO, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, endOfDay, subMonths, addMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import Autoplay from "embla-carousel-autoplay"

import type { Priority, Task, Project, VaultItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
  } from "@/components/ui/carousel"
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { ScrollArea } from './ui/scroll-area';
import { Progress } from './ui/progress';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { useMainLayout } from './main-layout';

interface ProductivityDashboardProps {
  tasks: Task[];
  liveTasks: Task[];
  activeProject: Project | null;
  onChartClick?: (payload: any) => void;
  productivityStreak: number;
  personalBestStreak: number;
  streakSavers: number;
  weeklyCompletionCount: number;
  onUpdateTask: (task: Task) => void;
  onUpdateProjectVault?: (items: VaultItem[]) => void;
}

const priorityBadgeConfig: Record<Priority, { label: string; color: string; icon: React.ElementType }> = {
    urgent: { label: 'Urgent', color: 'border-transparent bg-red-500 text-red-50 hover:bg-red-500/80 dark:bg-red-900 dark:text-red-50 dark:hover:bg-red-900/80', icon: AlertTriangle },
    high: { label: 'High', color: 'border-transparent bg-amber-500 text-amber-50 hover:bg-amber-500/80 dark:bg-amber-800 dark:text-amber-50 dark:hover:bg-amber-800/80', icon: ChevronsUpDown },
    medium: { label: 'Medium', color: 'border-transparent bg-blue-500 text-blue-50 hover:bg-blue-500/80 dark:bg-blue-800 dark:text-blue-50 dark:hover:bg-blue-800/80', icon: ChevronsUpDown },
    low: { label: 'Low', color: 'border-transparent bg-green-400 text-green-950 hover:bg-green-400/80 dark:bg-green-700 dark:text-green-50 dark:hover:bg-green-700/80', icon: ChevronsUpDown },
};


const StatusChart = ({ data, onClick }: { data: any[], onClick: (payload: any) => void }) => {
    return (
    <ChartContainer config={{}} className="mx-auto aspect-square h-[220px] sm:h-[250px]">
      <RechartsPieChart>
        <Tooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} onClick={onClick} className="cursor-pointer" stroke="hsl(var(--card))" strokeWidth={2}>
          {data.map((entry) => (
            <Cell key={`cell-${entry.name}`} fill={entry.fill} />
          ))}
        </Pie>
        <Legend iconSize={10} verticalAlign="bottom" />
      </RechartsPieChart>
    </ChartContainer>
    );
};

const PriorityChart = ({ data, onClick }: { data: any[], onClick: (payload: any) => void }) => {
    return (
        <ChartContainer config={{}} className="mx-auto aspect-square h-[220px] sm:h-[250px]">
            <RechartsPieChart>
            <Tooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
            />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} onClick={onClick} className="cursor-pointer" stroke="hsl(var(--card))" strokeWidth={2}>
                {data.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                ))}
            </Pie>
            <Legend iconSize={10} verticalAlign="bottom" />
            </RechartsPieChart>
        </ChartContainer>
    );
};

const WeeklyCompletionChart = ({ data, onClick }: { data: any[], onClick: (payload: any) => void }) => {
    return (
        <ChartContainer config={{ completed: { label: 'Completed', color: 'hsl(var(--chart-2))' } }} className="h-[250px] w-full">
            <RechartsBarChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="completed" fill="var(--color-completed)" radius={4} onClick={onClick} className="cursor-pointer" />
            </RechartsBarChart>
        </ChartContainer>
    );
};


export function ProductivityDashboard({ tasks, liveTasks, activeProject, onChartClick, productivityStreak, personalBestStreak, streakSavers, weeklyCompletionCount, onUpdateTask, onUpdateProjectVault }: ProductivityDashboardProps) {
    const { vaultPasscode, isVaultUnlocked, setIsVaultUnlocked } = useMainLayout();
    const [weekOffset, setWeekOffset] = React.useState(0);
    const [monthOffset, setMonthOffset] = React.useState(0);
    const [isClient, setIsClient] = React.useState(false);
    const { toast } = useToast();

    // Vault Form State
    const [isAddingVaultItem, setIsAddingVaultItem] = React.useState(false);
    const [newVaultLabel, setNewVaultLabel] = React.useState('');
    const [newVaultValue, setNewVaultValue] = React.useState('');
    const [unlockPIN, setUnlockPIN] = React.useState('');

    React.useEffect(() => {
        setIsClient(true);
    }, []);
    
    const statusData = React.useMemo(() => {
        const statusCounts = tasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return [
            { name: 'Active', value: statusCounts.active || 0, fill: 'hsl(var(--chart-2))' },
            { name: 'In Progress', value: statusCounts['in-progress'] || 0, fill: 'hsl(var(--chart-5))' },
            { name: 'On Hold', value: statusCounts['on-hold'] || 0, fill: 'hsl(var(--chart-4))' },
            { name: 'Completed', value: statusCounts.completed || 0, fill: 'hsl(var(--success))' },
            { name: 'Canceled', value: statusCounts.canceled || 0, fill: 'hsl(var(--destructive))' },
        ].filter(item => item.value > 0);
    }, [tasks]);
    
    const priorityData = React.useMemo(() => {
        const priorities = tasks.reduce((acc, task) => {
            if (task.status === 'active' || task.status === 'in-progress') {
                acc[task.priority] = (acc[task.priority] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const priorityMap = {
            Urgent: { value: priorities.urgent || 0, fill: 'hsl(var(--destructive))' },
            High: { value: priorities.high || 0, fill: 'hsl(var(--chart-4))' },
            Medium: { value: priorities.medium || 0, fill: 'hsl(var(--chart-2))' },
            Low: { value: priorities.low || 0, fill: 'hsl(var(--chart-1))' },
        };

        return Object.entries(priorityMap)
          .map(([name, data]) => ({ name, ...data }))
          .filter(item => item.value > 0);

    }, [tasks]);
    
    const overdueTasks = React.useMemo(() => {
      if (!isClient || !tasks) return [];
      return tasks.filter(task => task.dueDate && task.status === 'active' && isPast(new Date(task.dueDate)));
    }, [tasks, isClient]);

    const upcomingTasks = React.useMemo(() => {
        if (!isClient) return [];
        return tasks
            .filter(task => task.status === 'active' && task.dueDate && isFuture(new Date(task.dueDate)))
            .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
            .slice(0, 3);
    }, [tasks, isClient]);
    
    const pinnedTasks = React.useMemo(() => {
        return tasks.filter(task => task.isPinned);
    }, [tasks]);

    const victoryLogTasks = React.useMemo(() => {
        return tasks
            .filter(t => t.status === 'completed' && t.outcomeNote)
            .sort((a, b) => {
                const dateA = a.completionDate ? new Date(a.completionDate).getTime() : 0;
                const dateB = b.completionDate ? new Date(b.completionDate).getTime() : 0;
                return dateB - dateA;
            })
            .slice(0, 6);
    }, [tasks]);

    const { weeklyCompletionData, weekDateRange } = React.useMemo(() => {
        const targetWeek = subWeeks(new Date(), weekOffset);
        const weekStart = startOfWeek(targetWeek);
        const weekEnd = endOfWeek(targetWeek);
        const weekInterval = eachDayOfInterval({ start: weekStart, end: weekEnd });

        const weeklyData = weekInterval.map(date => ({
            name: format(date, 'EEE'),
            date: startOfDay(date),
            completed: 0,
        }));
        
        const processCompletions = (task: Task, date: Date) => {
            const dayInData = weeklyData.find(d => isSameDay(d.date, startOfDay(date)));
            if (dayInData) {
                dayInData.completed++;
            }
        };

        tasks.forEach(task => {
            if (task.status === 'completed' && task.completionDate) {
                processCompletions(task, new Date(task.completionDate));
            }
            if (task.trackDailyProgress && task.progress) {
                task.progress.forEach(progressEntry => {
                    if (progressEntry && progressEntry.date) {
                        processCompletions(task, parseISO(progressEntry.date))
                    }
                });
            }
        });

        const dateRange = {
            start: format(weekStart, 'MMM d'),
            end: format(weekEnd, 'MMM d, yyyy')
        };


        return { weeklyCompletionData: weeklyData, weekDateRange: dateRange };
    }, [tasks, weekOffset]);

    const { monthlyCompletionData, monthLabel } = React.useMemo(() => {
        if (!isClient) return { monthlyCompletionData: [], monthLabel: '' };

        const completedTasks = tasks.filter(t => t.status === 'completed' && t.completionDate);
        const targetMonth = subMonths(new Date(), monthOffset);
        
        const monthStart = startOfMonth(targetMonth);
        const monthEnd = endOfMonth(targetMonth);
        
        const dateInterval = eachDayOfInterval({ start: monthStart, end: monthEnd });
        
        let cumulativeTotal = 0;
        const cumulativeData = dateInterval.map(date => {
            const dailyCompletions = completedTasks.filter(task => task.completionDate && isSameDay(new Date(task.completionDate), date)).length;
            const dailyProgress = tasks.reduce((acc, task) => {
                if (task.trackDailyProgress && task.progress) {
                    return acc + task.progress.filter(p => p && p.date && isSameDay(parseISO(p.date), date)).length;
                }
                return acc;
            }, 0);
            cumulativeTotal += dailyCompletions + dailyProgress;
            return {
                date: format(date, 'MMM d'),
                completed: cumulativeTotal
            }
        });

        return { monthlyCompletionData: cumulativeData, monthLabel: format(targetMonth, 'MMMM yyyy') };
    }, [tasks, isClient, monthOffset]);

    const getFlameClass = (streak: number) => {
        if (streak >= 14) return "h-6 w-6 text-red-500";
        if (streak >= 7) return "h-5 w-5 text-orange-500";
        if (streak >= 3) return "h-4 w-4 text-blue-500";
        return "h-4 w-4 text-muted-foreground";
    };

    const totalTasks = tasks.length;
    const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
    
    const handlePieClick = (data: any) => {
        if (onChartClick && data && data.payload) {
            onChartClick(data.payload);
        }
    };

    const handleBarClick = (data: any) => {
        if (onChartClick && data) {
            onChartClick(data);
        }
    }

    const handleCopyVault = (value: string) => {
        if (vaultPasscode && !isVaultUnlocked) return;
        navigator.clipboard.writeText(value);
        toast({ title: 'Copied to Clipboard!', description: 'Info ready to paste.' });
    };

    const handleAddVaultItem = () => {
        if (!newVaultLabel.trim() || !newVaultValue.trim()) return;
        const newItem: VaultItem = {
            id: uuidv4(),
            label: newVaultLabel.trim(),
            value: newVaultValue.trim()
        };
        const currentVault = activeProject?.vault || [];
        onUpdateProjectVault?.([...currentVault, newItem]);
        setNewVaultLabel('');
        setNewVaultValue('');
        setIsAddingVaultItem(false);
    };

    const handleDeleteVaultItem = (id: string) => {
        const currentVault = activeProject?.vault || [];
        onUpdateProjectVault?.(currentVault.filter(i => i.id !== id));
    };

    const handleUnlockVault = () => {
        if (unlockPIN === vaultPasscode) {
            setIsVaultUnlocked(true);
            setUnlockPIN('');
            toast({ title: 'Vault Unlocked' });
        } else {
            toast({ title: 'Incorrect PIN', variant: 'destructive' });
        }
    };
    
    const OverdueTaskCarousel = () => {
        if (!isClient || overdueTasks.length === 0) {
            return null;
        }

        const plugin = React.useRef(
            Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true })
        );

        return (
            <div 
                className="relative col-span-full rounded-lg border-2 border-destructive/50 bg-destructive/10 p-4 sm:p-6 animate-pulse cursor-pointer"
                onClick={() => onChartClick?.({ name: 'Overdue' })}
            >
                <div className="flex items-start sm:items-center gap-4 mb-4">
                    <AlertTriangle className="h-8 w-8 text-destructive flex-shrink-0 mt-1 sm:mt-0" />
                    <div>
                        <h3 className="text-lg font-bold text-destructive">
                            {overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? 's' : ''}
                        </h3>
                        <p className="text-sm text-destructive/80">These tasks need your immediate attention.</p>
                    </div>
                </div>
                <Carousel
                    plugins={[plugin.current]}
                    opts={{
                        align: "start",
                        loop: overdueTasks.length > 1,
                    }}
                    className="w-full"
                    onMouseEnter={plugin.current.stop}
                    onMouseLeave={plugin.current.reset}
                >
                    <CarouselContent className="-ml-2 sm:-ml-4">
                        {overdueTasks.map((task) => {
                            const { label, color, icon: Icon } = priorityBadgeConfig[task.priority];
                            return (
                                <CarouselItem key={task.id} className="pl-2 sm:pl-4 basis-4/5 sm:basis-1/2 lg:basis-1/3">
                                     <Card className="h-full">
                                        <CardContent className="flex flex-col gap-3 p-4">
                                            <p className="font-semibold leading-tight">{task.title}</p>
                                            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground mt-auto">
                                                {task.dueDate && (
                                                     <div className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        <span>{format(new Date(task.dueDate), 'MMM d, p')}</span>
                                                    </div>
                                                )}
                                                <Badge className={cn(color)} variant="secondary">
                                                    <Icon className="h-3 w-3 mr-1"/>
                                                    {label}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                     </Card>
                                </CarouselItem>
                            )
                        })}
                    </CarouselContent>
                    {overdueTasks.length > 1 && (
                        <>
                            <CarouselPrevious className="absolute -left-2 top-1/2 -translate-y-1/2 hidden sm:flex" />
                            <CarouselNext className="absolute -right-2 top-1/2 -translate-y-1/2 hidden sm:flex" />
                        </>
                    )}
                </Carousel>
            </div>
        );
    }
    
    const LiveTasksCard = () => {
        if (!isClient || !liveTasks || liveTasks.length === 0) {
            return null;
        }

        return (
            <Card className="col-span-full bg-primary/10 border-primary/40 animate-pulse">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/80 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                        Live Now
                    </CardTitle>
                    <CardDescription>Tasks currently in their scheduled time window.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {liveTasks.map(task => (
                        <Card key={task.id} className="bg-background">
                            <CardContent className="p-4 flex flex-col gap-2">
                                <p className="font-semibold leading-tight">{task.title}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>{task.startTime} - {task.endTime}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </CardContent>
            </Card>
        )
    }


    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in-0">
          <LiveTasksCard />
          <OverdueTaskCarousel />

           <Card className="col-span-full lg:col-span-2 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5 text-primary" />
                            Project Vault
                        </CardTitle>
                        <CardDescription>Quick reference items for this project.</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsAddingVaultItem(!isAddingVaultItem)}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {vaultPasscode && !isVaultUnlocked ? (
                         <div className="py-4 text-center space-y-4 bg-muted/30 rounded-xl border border-dashed">
                             <Lock className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
                             <div className="max-w-[200px] mx-auto space-y-2">
                                 <Input 
                                    type="password" 
                                    placeholder="Enter PIN" 
                                    className="h-8 text-center" 
                                    value={unlockPIN}
                                    onChange={(e) => setUnlockPIN(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUnlockVault()}
                                 />
                                 <Button size="sm" className="w-full h-8" onClick={handleUnlockVault}>
                                     <Unlock className="h-3 w-3 mr-2" />
                                     Unlock
                                 </Button>
                             </div>
                         </div>
                    ) : (
                        <>
                            {isAddingVaultItem && (
                                <div className="flex flex-col sm:flex-row gap-2 p-3 bg-muted/50 rounded-lg border border-dashed animate-in slide-in-from-top-2">
                                    <Input 
                                        placeholder="Label (e.g. Wi-Fi)" 
                                        value={newVaultLabel} 
                                        onChange={(e) => setNewVaultLabel(e.target.value)} 
                                        className="h-8 text-xs"
                                    />
                                    <Input 
                                        placeholder="Value (e.g. Password)" 
                                        value={newVaultValue} 
                                        onChange={(e) => setNewVaultValue(e.target.value)} 
                                        className="h-8 text-xs"
                                    />
                                    <div className="flex gap-2">
                                        <Button size="sm" className="h-8 flex-1" onClick={handleAddVaultItem}>Save</Button>
                                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setIsAddingVaultItem(false)}>Cancel</Button>
                                    </div>
                                </div>
                            )}
                            {activeProject?.vault && activeProject.vault.length > 0 ? (
                                <div className="grid gap-2">
                                    {activeProject.vault.map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-2 rounded-md bg-background border group">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                                                <p className="text-sm font-mono truncate">{item.value}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyVault(item.value)}>
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteVaultItem(item.id)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : !isAddingVaultItem && (
                                <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground opacity-40">
                                    <Key className="h-8 w-8 mb-2" />
                                    <p className="text-xs">Vault is empty. Store passwords or codes here.</p>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
           </Card>

           <Card className="col-span-full lg:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-5 w-5 text-muted-foreground" />Streak Saver</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="font-medium">Savers Available</p>
                        <p className="text-2xl font-bold">{streakSavers}</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Weekly Progress</span>
                            <span>{weeklyCompletionCount} / 10 tasks</span>
                        </div>
                        <Progress value={(weeklyCompletionCount / 10) * 100} />
                        <p className="text-xs text-muted-foreground">Complete 10 tasks in a week to earn a saver. Savers accumulate and do not reset.</p>
                    </div>
                </CardContent>
           </Card>

           <Card className="col-span-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-yellow-500" />
                        Victory Log
                    </CardTitle>
                    <CardDescription>Your latest accomplishments and their outcomes.</CardDescription>
                </CardHeader>
                <CardContent>
                    {victoryLogTasks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {victoryLogTasks.map(task => (
                                <div key={task.id} className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 shadow-sm relative group overflow-hidden">
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest mb-1">
                                                {task.completionDate ? format(new Date(task.completionDate), 'MMM d') : 'Done'}
                                            </p>
                                            <h4 className="font-bold text-sm truncate">{task.title}</h4>
                                        </div>
                                        <div className="bg-green-500 rounded-full p-1 shadow-lg">
                                            <CheckCircle2 className="h-4 w-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="bg-background/40 backdrop-blur-sm p-3 rounded-lg border border-white/20">
                                        <p className="text-sm italic leading-relaxed text-muted-foreground">
                                            <MessageSquareQuote className="h-3 w-3 inline mr-1 opacity-50" />
                                            {task.outcomeNote}
                                        </p>
                                    </div>
                                    <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Trophy className="h-20 w-20 text-green-600" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl opacity-40">
                            <Trophy className="h-10 w-10 mb-2" />
                            <p className="text-sm">Complete tasks and record an outcome to see your Victory Log grow!</p>
                        </div>
                    )}
                </CardContent>
           </Card>

           {pinnedTasks.length > 0 && (
            <Card className="col-span-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Pin className="h-5 w-5 text-muted-foreground" />Pinned Tasks</CardTitle>
                    <CardDescription>Your most important tasks are right here.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pinnedTasks.map(task => {
                        const { label, color, icon: Icon } = priorityBadgeConfig[task.priority];
                        return (
                             <Card key={task.id} className="flex flex-col">
                                <CardContent className="flex flex-col gap-3 p-4">
                                    <div className="flex justify-between items-start gap-2">
                                        <p className="font-semibold leading-tight">{task.title}</p>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 -mr-2 -mt-1 flex-shrink-0"
                                            onClick={() => onUpdateTask({ ...task, isPinned: false })}
                                        >
                                            <Pin className="h-4 w-4 text-primary" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground mt-auto">
                                        {task.dueDate && (
                                                <div className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                <span>{format(new Date(task.dueDate), 'MMM d, p')}</span>
                                            </div>
                                        )}
                                        <Badge className={cn(color)} variant="secondary">
                                            <Icon className="h-3 w-3 mr-1"/>
                                            {label}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </CardContent>
            </Card>
          )}

          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTasks}</div>
            </CardContent>
          </Card>
          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTasksCount}</div>
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {totalTasks > 0 ? `${Math.round((completedTasksCount / totalTasks) * 100)}% done` : 'No tasks'}
              </p>
            </CardContent>
          </Card>
          <TooltipProvider>
            <UITooltip>
                <TooltipTrigger asChild>
                    <Card className="col-span-2 lg:col-span-1">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Productivity Streak</CardTitle>
                            <Flame className={cn("transition-all", getFlameClass(productivityStreak))} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{productivityStreak} day{productivityStreak !== 1 ? 's' : ''}</div>
                            <p className="text-xs text-muted-foreground">Keep up the great work!</p>
                        </CardContent>
                    </Card>
                </TooltipTrigger>
                <TooltipContent>
                    <p>This shows how many days in a row you've completed a task. Finish at least one task each day to keep your streak alive!</p>
                </TooltipContent>
            </UITooltip>
          </TooltipProvider>
           <TooltipProvider>
                <UITooltip>
                    <TooltipTrigger asChild>
                        <Card className="col-span-2 lg:col-span-1">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Personal Best</CardTitle>
                            <Trophy className="h-4 w-4 text-amber-500" />
                            </CardHeader>
                            <CardContent>
                            <div className="text-2xl font-bold">{personalBestStreak} day{personalBestStreak !== 1 ? 's' : ''}</div>
                            <p className="text-xs text-muted-foreground">Your longest streak!</p>
                            </CardContent>
                        </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Your longest streak! A new record to aim for.</p>
                    </TooltipContent>
                </UITooltip>
            </TooltipProvider>
            <Card className="col-span-full">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-muted-foreground" />Productivity Trend</CardTitle>
                            <CardDescription>Cumulative tasks completed in {monthLabel}.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                             <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setMonthOffset(prev => prev + 1)}>
                                 <ChevronLeft className="h-4 w-4" />
                                 <span className="sr-only">Previous Month</span>
                             </Button>
                             <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setMonthOffset(prev => prev - 1)} disabled={monthOffset === 0}>
                                 <ChevronRight className="h-4 w-4" />
                                 <span className="sr-only">Next Month</span>
                             </Button>
                         </div>
                    </div>
                </CardHeader>
                <CardContent className="pl-2">
                     <ChartContainer config={{ completed: { label: 'Total Tasks', color: 'hsl(var(--chart-1))' } }} className="h-[250px] w-full">
                        <AreaChart data={monthlyCompletionData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                             <defs>
                                <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                                    <stop
                                    offset="5%"
                                    stopColor="var(--color-completed)"
                                    stopOpacity={0.8}
                                    />
                                    <stop
                                    offset="95%"
                                    stopColor="var(--color-completed)"
                                    stopOpacity={0.1}
                                    />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value, index) => index % 7 === 0 ? value : ''} />
                            <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                            <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                            <Area
                                dataKey="completed"
                                type="natural"
                                fill="url(#fillCompleted)"
                                stroke="var(--color-completed)"
                                stackId="a"
                            />
                        </AreaChart>
                     </ChartContainer>
                </CardContent>
             </Card>
           <Card className="col-span-2 lg:col-span-2">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="grid gap-1">
                            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-muted-foreground" />Weekly Completion</CardTitle>
                            <CardDescription>
                                {weekOffset === 0 ? "Tasks you've completed this week." : `Tasks from ${weekDateRange.start} to ${weekDateRange.end}.`}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setWeekOffset(prev => prev + 1)}>
                                <ChevronLeft className="h-4 w-4" />
                                <span className="sr-only">Previous Week</span>
                            </Button>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setWeekOffset(prev => prev - 1)} disabled={weekOffset === 0}>
                                <ChevronRight className="h-4 w-4" />
                                <span className="sr-only">Next Week</span>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pl-2">
                   <WeeklyCompletionChart data={weeklyCompletionData} onClick={handleBarClick} />
                </CardContent>
            </Card>
            <Card className="col-span-2 lg:col-span-1">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Task Status</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-0">
                    <StatusChart data={statusData} onClick={handlePieClick} />
                </CardContent>
            </Card>
             <Card className="col-span-2 lg:col-span-1">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Active Priorities</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-0">
                    <PriorityChart data={priorityData} onClick={handlePieClick} />
                </CardContent>
            </Card>
        </div>
    );
}
