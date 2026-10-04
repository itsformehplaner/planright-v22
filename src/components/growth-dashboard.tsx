
'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Area, AreaChart, Bar, BarChart as RechartsBarChart, Cell, Legend, Line, LineChart, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookOpen, BrainCircuit, CheckCircle2, List, Sparkles, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from './ui/chart';
import { format, isSameDay, startOfDay, subDays, eachDayOfInterval, endOfDay, startOfWeek, endOfWeek, subWeeks, addWeeks, parseISO } from 'date-fns';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface GrowthDashboardProps {
    tasks: Task[];
}

export function GrowthDashboard({ tasks }: GrowthDashboardProps) {
    const [weekOffset, setWeekOffset] = React.useState(0);

    const growthTasks = React.useMemo(() => {
        return tasks.filter(task => task.category === 'Learning' || task.category === 'Personal');
    }, [tasks]);

    const { weeklyCompletionData, cumulativeCompletionData, activeTasks, recentlyCompleted, weekDateRange } = React.useMemo(() => {
        const completed = growthTasks.filter(t => t.status === 'completed' && t.completionDate);
        const active = growthTasks.filter(t => t.status === 'active' || (t.trackDailyProgress && t.status !== 'completed'));
        const recent = [...completed].sort((a,b) => new Date(b.completionDate!).getTime() - new Date(a.completionDate!).getTime()).slice(0, 5);
        
        const targetWeek = subWeeks(new Date(), weekOffset);
        const weekStart = startOfWeek(targetWeek);
        const weekEnd = endOfWeek(targetWeek);
        const weekInterval = eachDayOfInterval({ start: weekStart, end: weekEnd });

        // Weekly completion data for the target week
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

        completed.forEach(task => {
            if (task.completionDate) processCompletions(task, new Date(task.completionDate));
        });

        growthTasks.forEach(task => {
            if (task.trackDailyProgress && task.progress) {
                task.progress.forEach(progressEntry => {
                    if (progressEntry && progressEntry.date) {
                        processCompletions(task, parseISO(progressEntry.date))
                    }
                });
            }
        });
        
        // Cumulative completion data (last 30 days)
        const today = endOfDay(new Date());
        const thirtyDaysAgo = startOfDay(subDays(today, 29));
        const dateInterval = eachDayOfInterval({ start: thirtyDaysAgo, end: today });
        let cumulativeTotal = 0;
        const cumulativeData = dateInterval.map(date => {
            const dailyCompletions = completed.filter(task => isSameDay(new Date(task.completionDate!), date)).length;
            const dailyProgress = growthTasks.reduce((acc, task) => {
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

        const dateRange = {
            start: format(weekStart, 'MMM d'),
            end: format(weekEnd, 'MMM d, yyyy')
        };


        return { weeklyCompletionData: weeklyData, cumulativeCompletionData: cumulativeData, activeTasks: active, recentlyCompleted: recent, weekDateRange: dateRange };
    }, [growthTasks, weekOffset]);

    if (growthTasks.length === 0) {
        return (
             <Card className="border-dashed shadow-none flex flex-col items-center justify-center p-8 text-center">
                <div className="rounded-full border border-dashed p-4">
                    <Sparkles className="h-12 w-12 text-muted-foreground" />
                </div>
                <CardHeader className="p-4 pb-2">
                    <CardTitle as="h2" className="text-xl">No Growth Tasks Yet</CardTitle>
                </CardHeader>
                <CardDescription>Add tasks with the 'Personal' or 'Learning' category to see your progress here.</CardDescription>
            </Card>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in fade-in-0">
             <Card className="col-span-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-muted-foreground" />30-Day Growth Trend</CardTitle>
                    <CardDescription>Cumulative personal and learning tasks completed over the last 30 days.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                     <ChartContainer config={{ completed: { label: 'Total Tasks', color: 'hsl(var(--chart-1))' } }} className="h-[250px] w-full">
                        <AreaChart data={cumulativeCompletionData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
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
            <Card className="col-span-1 lg:col-span-2">
                <CardHeader>
                    <div className="flex items-center justify-between">
                         <CardTitle className="flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-muted-foreground" />Weekly Consistency</CardTitle>
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
                    <CardDescription>
                        {weekOffset === 0 ? "Tasks completed this week." : `Tasks completed from ${weekDateRange.start} to ${weekDateRange.end}.`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <ChartContainer config={{ completed: { label: 'Completed', color: 'hsl(var(--chart-2))' } }} className="h-[250px] w-full">
                        <RechartsBarChart data={weeklyCompletionData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                            <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                            <Bar dataKey="completed" fill="var(--color-completed)" radius={4} />
                        </RechartsBarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
            <Card className="col-span-1">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><List className="h-5 w-5 text-muted-foreground" />Skills in Focus</CardTitle>
                    <CardDescription>Your active personal and learning tasks.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[250px]">
                        {activeTasks.length > 0 ? (
                            <div className="space-y-3">
                                {activeTasks.map(task => (
                                    <div key={task.id} className="flex items-center gap-2 text-sm">
                                        <Badge variant={task.category === 'Learning' ? 'default' : 'secondary'} className="shrink-0">
                                            {task.category}
                                        </Badge>
                                        <p className="truncate font-medium">{task.title}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                <CheckCircle2 className="h-10 w-10 mb-2" />
                                <p>All caught up!</p>
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
             <Card className="col-span-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-muted-foreground" />Recently Completed</CardTitle>
                    <CardDescription>Your latest growth achievements.</CardDescription>
                </CardHeader>
                <CardContent>
                     {recentlyCompleted.length > 0 ? (
                            <div className="space-y-3">
                                {recentlyCompleted.map(task => (
                                    <div key={task.id} className="flex items-center gap-3 text-sm p-2 rounded-md bg-muted/50">
                                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                        <div className="flex-1">
                                            <p className="font-semibold">{task.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Completed on {format(new Date(task.completionDate!), 'MMM d, yyyy')}
                                            </p>
                                        </div>
                                         <Badge variant={task.category === 'Learning' ? 'default' : 'secondary'} className="shrink-0">
                                            {task.category}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-24 text-center text-muted-foreground">
                                <p>No growth tasks completed yet.</p>
                            </div>
                        )}
                </CardContent>
            </Card>
        </div>
    );
}
