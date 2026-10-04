'use client';

import * as React from 'react';
import type { Task, TaskTemplate, Project, Note } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus, Download, Upload, BellOff, Trash2, ChevronsLeft, ChevronsRight, PanelLeft, Home, Bell, Folder, LogOut, User as UserIcon, BarChart3, Search, Command, Key, Lock, Unlock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

import { ThemeToggle } from '@/components/theme-toggle';
import { AddTaskDialog } from '@/components/add-task-dialog';
import PlanRightLogo from '@/components/planright-logo';
import { Separator } from '@/components/ui/separator';
import { Header } from '@/components/header';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import * as ics from 'ics';
import {
  LayoutDashboard,
  ListTodo,
  Calendar,
  TrendingUp,
  Timer,
  Layers,
  FileText,
  Trello,
  Grid2X2,
  Zap,
  BookMarked
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { getInitialTasks } from '@/lib/get-initial-tasks';
import { getInitialProjects } from '@/lib/get-initial-projects';
import { swManager } from '@/lib/sw-manager';
import { useHasMounted } from '@/hooks/use-has-mounted';
import { ScrollArea } from './ui/scroll-area';
import { ImportDialog } from '@/components/import-dialog';
import { CommandMenu } from '@/components/command-menu';

const navItems = [
  { href: '/', icon: Home, label: 'Projects' },
  { href: '/overview', icon: BarChart3, label: 'Global Overview' },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Current Dashboard' },
  { href: '/focus', icon: Zap, label: 'Focus Mode' },
  { href: '/vault', icon: Key, label: 'Project Vault' },
  { href: '/tasks', icon: ListTodo, label: 'Tasks' },
  { href: '/kanban', icon: Trello, label: 'Kanban Board' },
  { href: '/matrix', icon: Grid2X2, label: 'Eisenhower Matrix' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/growth', icon: TrendingUp, label: 'Growth' },
  { href: '/scratchpad', icon: BookMarked, label: 'Project Notebook' },
  { href: '/pomodoro', icon: Timer, label: 'Pomodoro' },
  { href: '/templates', icon: Layers, label: 'Templates' },
];

type MainLayoutContextType = {
    handleAddToCalendar: (task: Pick<Task, 'title' | 'description' | 'dueDate' | 'startTime' | 'endTime'>) => void;
    activeProject: Project | null;
    projects: Project[] | null;
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    tasks: Task[] | null;
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    templates: TaskTemplate[] | null;
    setTemplates: React.Dispatch<React.SetStateAction<TaskTemplate[]>>;
    notes: Note[] | null;
    setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
    activeProjectId: string | null;
    setActiveProjectId: React.Dispatch<React.SetStateAction<string | null>>;
    onTaskSave: (data: Omit<Task, 'id' | 'status' | 'createdAt' | 'projectId'>) => void;
    vaultPasscode: string | null;
    setVaultPasscode: (code: string | null) => void;
    isVaultUnlocked: boolean;
    setIsVaultUnlocked: (unlocked: boolean) => void;
};

const MainLayoutContext = React.createContext<MainLayoutContextType | null>(null);

export const useMainLayout = () => {
    const context = React.useContext(MainLayoutContext);
    if (!context) {
        throw new Error('useMainLayout must be used within a MainLayoutProvider');
    }
    return context;
}

const NotificationsPanel = ({
    notificationsEnabled,
    onToggleNotifications,
    notificationLeadTime,
    onLeadTimeChange,
    isCollapsed,
    renderButton,
    isServiceWorkerReady,
}: {
    notificationsEnabled: boolean;
    onToggleNotifications: () => void;
    notificationLeadTime: number;
    onLeadTimeChange: (value: string) => void;
    isCollapsed: boolean;
    isServiceWorkerReady: boolean;
    renderButton: (icon: React.ReactNode, label: string, onClick?: () => void, props?: any) => JSX.Element;
}) => {
    const hasMounted = useHasMounted();

    if (!hasMounted || !('Notification' in window) || !('serviceWorker' in navigator)) {
        return null;
    }

    return (
        <div className="space-y-2 rounded-lg border p-3">
            <h3 className={cn("font-semibold text-sm text-center", isCollapsed && "sr-only")}>Notifications</h3>
            {renderButton(notificationsEnabled ? <BellOff /> : <Bell />, notificationsEnabled ? 'Disable Alerts' : 'Enable Alerts', onToggleNotifications, { disabled: !isServiceWorkerReady })}
            <div className={cn("space-y-1", isCollapsed && "hidden")}>
                <Label htmlFor="lead-time" className="text-xs text-muted-foreground">Remind Me Before</Label>
                <Select
                    value={String(notificationLeadTime)}
                    onValueChange={onLeadTimeChange}
                    disabled={!notificationsEnabled || !isServiceWorkerReady}
                >
                    <SelectTrigger id="lead-time">
                        <SelectValue placeholder="Select lead time" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="0">At time of event</SelectItem>
                        <SelectItem value="60000">1 minute before</SelectItem>
                        <SelectItem value="300000">5 minutes before</SelectItem>
                        <SelectItem value="600000">10 minutes before</SelectItem>
                        <SelectItem value="1800000">30 minutes before</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};

const SidebarContent = ({ 
    onTaskSave, 
    onExport, 
    onImport, 
    onToggleNotifications, 
    onResetApp,
    notificationsEnabled,
    notificationLeadTime,
    onLeadTimeChange,
    isCollapsed,
    onToggleCollapse,
    onMobileLinkClick,
    isServiceWorkerReady,
    activeProjectName,
}: { 
    onTaskSave: (data: Omit<Task, 'id' | 'status' | 'createdAt' | 'projectId'>) => void 
    onExport: () => void;
    onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onToggleNotifications: () => void;
    onResetApp: () => void;
    notificationsEnabled: boolean;
    notificationLeadTime: number;
    onLeadTimeChange: (value: string) => void;
    isCollapsed: boolean;
    onToggleCollapse?: () => void;
    onMobileLinkClick?: () => void;
    isServiceWorkerReady: boolean;
    activeProjectName?: string;
}) => {
    const pathname = usePathname();

    const renderButton = (icon: React.ReactNode, label: string, onClick?: () => void, props: any = {}) => {
        const component = (
            <Button variant="ghost" onClick={onClick} className={cn("w-full justify-start", isCollapsed && "justify-center px-2")} {...props}>
                {icon}
                <span className={cn(isCollapsed && "sr-only")}>{label}</span>
            </Button>
        );

        if (isCollapsed) {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                           {component}
                        </TooltipTrigger>
                        <TooltipContent side="right">
                           <p>{label}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        }
        return component;
    }
    
    const renderImportButton = () => {
        const component = (
             <Button variant="ghost" asChild className={cn("w-full justify-start", isCollapsed && "justify-center px-2")}>
                <label htmlFor="import-tasks" className="cursor-pointer flex items-center gap-2 w-full h-full">
                    <Upload className="h-4 w-4" />
                    <span className={cn(isCollapsed && "sr-only")}>Import Data</span>
                    <input type="file" id="import-tasks" className="sr-only" accept=".json" onChange={onImport} />
                </label>
            </Button>
        );

         if (isCollapsed) {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                           {component}
                        </TooltipTrigger>
                        <TooltipContent side="right">
                           <p>Import Data</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        }

        return component;
    }
    
    return (
        <>
            <div className={cn("flex items-center gap-2 px-2", isCollapsed && "justify-center")}>
                <Link href="/" className="flex items-center gap-2">
                    <PlanRightLogo className="h-8 w-8 text-primary" />
                    <h1 className={cn("text-xl font-bold tracking-tighter", isCollapsed && "sr-only")}>PlanRight</h1>
                </Link>
                 {onToggleCollapse && (
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("ml-auto", isCollapsed && "hidden")}
                        onClick={onToggleCollapse}
                     >
                        <ChevronsLeft />
                     </Button>
                 )}
            </div>
            <Separator className="my-4" />
            <div className="flex-1 px-2 overflow-hidden">
                <ScrollArea className="h-full pr-4 -mr-4">
                    <div className="flex flex-col gap-4">
                        <AddTaskDialog onTaskSave={onTaskSave}>
                            <Button className={cn("w-full", isCollapsed && "w-auto justify-center px-2")}>
                                <Plus className={cn("mr-2", isCollapsed && "mr-0")} />
                                <span className={cn(isCollapsed && "sr-only")}>Add New Task</span>
                            </Button>
                        </AddTaskDialog>
                        <nav className="flex flex-col gap-1">
                            {navItems.map(item => {
                                const isActive = pathname === item.href;
                                const component = (
                                    <Link href={item.href} key={item.href} onClick={onMobileLinkClick}>
                                        <Button
                                            variant={isActive ? 'secondary' : 'ghost'}
                                            className={cn('w-full justify-start', isCollapsed && 'justify-center px-2')}
                                        >
                                            <item.icon className="h-4 w-4" />
                                            <span className={cn('ml-2', isCollapsed && 'sr-only')}>{item.label}</span>
                                        </Button>
                                    </Link>
                                );
                                if (isCollapsed) {
                                    return (
                                        <TooltipProvider key={item.href}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                {component}
                                                </TooltipTrigger>
                                                <TooltipContent side="right">
                                                <p>{item.label}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )
                                }
                                return component;
                            })}
                        </nav>
                        <Separator />
                        <div className="flex flex-col gap-2">
                            {renderButton(<Download className="h-4 w-4" />, "Export All Data", onExport)}
                            {renderImportButton()}
                            {renderButton(<Trash2 className="h-4 w-4" />, "Reset Application", onResetApp, { className: "text-destructive hover:bg-destructive/10 hover:text-destructive" })}
                        </div>
                        <NotificationsPanel
                            notificationsEnabled={notificationsEnabled}
                            onToggleNotifications={onToggleNotifications}
                            notificationLeadTime={notificationLeadTime}
                            onLeadTimeChange={onLeadTimeChange}
                            isCollapsed={isCollapsed}
                            isServiceWorkerReady={isServiceWorkerReady}
                            renderButton={renderButton}
                        />
                    </div>
                </ScrollArea>
            </div>
            <div className={cn("mt-auto flex px-2 pt-4", isCollapsed ? "justify-center" : "justify-start")}>
                <p className={cn("text-xs text-muted-foreground", isCollapsed && "sr-only")}>@BigA-Mehregan. All Rights Reserved.</p>
            </div>
        </>
    );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const hasMounted = useHasMounted();
    const isMobile = useIsMobile();

    const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', getInitialTasks(), {
        deserializer: (str) => {
            try {
                const parsed = JSON.parse(str) as any[];
                return parsed.map((task) => ({
                    ...task,
                    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
                    completionDate: task.completionDate ? new Date(task.completionDate) : undefined,
                    createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
                    recurrence: task.recurrence ? {
                        ...task.recurrence,
                        endDate: task.recurrence.endDate ? new Date(task.recurrence.endDate) : undefined,
                    } : undefined,
                }));
            } catch (e) {
                return getInitialTasks();
            }
        }
    });
    const [templates, setTemplates] = useLocalStorage<TaskTemplate[]>('taskTemplates', []);
    const [projects, setProjects] = useLocalStorage<Project[]>('projects', getInitialProjects(), {
        deserializer: (str) => {
             try {
                const parsed = JSON.parse(str) as any[];
                return parsed.map((p) => ({
                    ...p,
                    createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
                }));
            } catch (e) {
                return getInitialProjects();
            }
        }
    });
    const [notes, setNotes] = useLocalStorage<Note[]>('projectNotes', [], {
        deserializer: (str) => {
            try {
                const parsed = JSON.parse(str) as any[];
                return parsed.map(n => ({
                    ...n,
                    createdAt: new Date(n.createdAt),
                    updatedAt: new Date(n.updatedAt)
                }));
            } catch(e) { return []; }
        }
    });

    const [activeProjectId, setActiveProjectId] = useLocalStorage<string | null>('activeProjectId', '1');
    const [notificationLeadTime, setNotificationLeadTime] = useLocalStorage<number>('notificationLeadTime', 300000); // Default 5 minutes
    const [vaultPasscode, setVaultPasscode] = useLocalStorage<string | null>('vaultPasscode', null);
    const [isVaultUnlocked, setIsVaultUnlocked] = React.useState(false);
    
    const [isSheetOpen, setIsSheetOpen] = React.useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = React.useState<boolean>(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
    const [isResetDialogOpen, setResetDialogOpen] = React.useState(false);
    const [isServiceWorkerReady, setIsServiceWorkerReady] = React.useState(false);
    const [isCommandMenuOpen, setIsCommandMenuOpen] = React.useState(false);
    
    const [importData, setImportData] = React.useState<string | null>(null);
    const [isFullBackupDetected, setIsFullBackupDetected] = React.useState(false);
    
    const activeProject = React.useMemo(() => {
        if (!projects || !activeProjectId) return null;
        return projects.find(p => p.id === activeProjectId) || null;
    }, [projects, activeProjectId]);

    const syncNotificationState = React.useCallback(async () => {
        const state = await swManager.getPermissionState();
        setNotificationsEnabled(state);
    }, []);

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsCommandMenuOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    React.useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(registration => {
                const handleControllerChange = () => {
                    setIsServiceWorkerReady(true);
                    syncNotificationState();
                };

                navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
                
                if (registration.active) {
                    setIsServiceWorkerReady(true);
                }

                return () => {
                    navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
                };

            }).catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
        }
    }, [syncNotificationState]);
    
    React.useEffect(() => {
        if (isServiceWorkerReady) {
            syncNotificationState();
        }
    }, [isServiceWorkerReady, syncNotificationState]);


    React.useEffect(() => {
        if (isServiceWorkerReady && tasks !== null) {
            swManager.updateTasks(tasks, notificationLeadTime);
        }
    }, [tasks, notificationLeadTime, isServiceWorkerReady]);


    const handleToggleNotifications = async () => {
        if (!isServiceWorkerReady) {
            toast({ title: "Notifications Not Ready", description: "The notification service is still starting up. Please try again in a moment.", variant: "destructive" });
            return;
        }

        const browserPermission = await swManager.getBrowserPermissionState();

        if (browserPermission === 'denied') {
            toast({ title: "Permission Denied", description: "You have blocked notifications. You'll need to enable them in your browser or system settings.", variant: "destructive" });
            return;
        }

        if (browserPermission === 'granted') {
            const currentInternalState = await swManager.getPermissionState();
            await swManager.setNotificationsEnabled(!currentInternalState);
            await syncNotificationState();
            toast({ title: !currentInternalState ? "Push Notifications Enabled!" : "Push Notifications Disabled" });
            return;
        }

        const permissionGranted = await swManager.requestPermission();
        if (permissionGranted) {
            await swManager.setNotificationsEnabled(true);
            await syncNotificationState();
            swManager.updateTasks(tasks ?? [], notificationLeadTime);
            toast({ title: "Push Notifications Enabled!", description: "You'll receive alerts for upcoming tasks." });
        } else {
            toast({ title: "Permission Not Granted", description: "You won't receive push notifications.", variant: "destructive" });
        }
    };
    
    const handleLeadTimeChange = (value: string) => {
        setNotificationLeadTime(parseInt(value, 10));
    };

    const handleAddToCalendar = (task: Pick<Task, 'title' | 'description' | 'dueDate' | 'startTime' | 'endTime'>) => {
        if (!task.dueDate) return;

        const eventDate = new Date(task.dueDate);
        const startArray: ics.DateArray = [eventDate.getUTCFullYear(), eventDate.getUTCMonth() + 1, eventDate.getUTCDate(), eventDate.getUTCHours(), eventDate.getUTCMinutes()];

        const event = {
            title: task.title,
            description: task.description,
            start: startArray,
            duration: { hours: 1 },
        };

        ics.createEvent(event, (error, value) => {
            if (error) {
                console.error(error);
                toast({
                    title: "Error creating calendar event",
                    variant: "destructive",
                });
                return;
            }

            const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${task.title.replace(/\s+/g, '_')}.ics`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }

    const handleAddTask = (data: Omit<Task, 'id' | 'status' | 'createdAt' | 'projectId'>) => {
        if (!activeProjectId) {
            toast({ title: "No active project", description: "Please select a project before adding tasks.", variant: "destructive" });
            return;
        }
        const newTask: Task = {
            ...data,
            id: uuidv4(),
            status: data.trackDailyProgress ? 'in-progress' : 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
            progress: data.trackDailyProgress ? [] : undefined,
            projectId: activeProjectId,
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
        
        if (hasMounted && isMobile) setIsSheetOpen(false);
    };
    
    const handleExportTasks = () => {
        if (!tasks || !projects || !templates || !notes) return;
        const dataToExport = {
            projects,
            tasks,
            templates,
            notes
        };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(dataToExport, null, 2)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `planright_full_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
        link.click();
        toast({
            title: "Global Export Successful",
            description: "All projects, tasks, templates, and records have been downloaded.",
        });
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result;
            if (typeof text === 'string') {
                try {
                    const data = JSON.parse(text);
                    setIsFullBackupDetected(!!data.projects);
                    setImportData(text);
                } catch(e) {
                    toast({ title: "Import Failed", description: "Invalid JSON file.", variant: "destructive" });
                }
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleConfirmImport = (text: string, targetProjectId: string) => {
        try {
            const importedData = JSON.parse(text);

            // CASE 1: FULL BACKUP (Restoring Entire Project Structure)
            if (importedData.projects && Array.isArray(importedData.projects)) {
                const newProjects = [...(projects || [])];
                const newTasks = [...(tasks || [])];
                const newTemplates = [...(templates || [])];
                const newNotes = [...(notes || [])];

                // Merge projects
                importedData.projects.forEach((p: any) => {
                    const exists = newProjects.find(ep => ep.id === p.id);
                    if (!exists) newProjects.push({ ...p, createdAt: new Date(p.createdAt) });
                });

                // Merge tasks (maintaining their projectId)
                importedData.tasks.forEach((t: any) => {
                    const exists = newTasks.find(et => et.id === t.id);
                    if (!exists) newTasks.push({ 
                        ...t, 
                        createdAt: new Date(t.createdAt), 
                        dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
                        completionDate: t.completionDate ? new Date(t.completionDate) : undefined
                    });
                });

                // Merge others
                if (importedData.templates) {
                    importedData.templates.forEach((tm: any) => {
                        if (!newTemplates.find(et => et.id === tm.id)) newTemplates.push(tm);
                    });
                }
                if (importedData.notes) {
                    importedData.notes.forEach((n: any) => {
                        if (!newNotes.find(en => en.id === n.id)) newNotes.push({
                            ...n,
                            createdAt: new Date(n.createdAt),
                            updatedAt: new Date(n.updatedAt)
                        });
                    });
                }

                setProjects(newProjects);
                setTasks(newTasks);
                setTemplates(newTemplates);
                setNotes(newNotes);

                toast({
                    title: "Full Backup Restored",
                    description: `Restored ${importedData.projects.length} projects and ${importedData.tasks.length} tasks.`,
                });
            } 
            // CASE 2: SINGLE PROJECT EXPORT OR TASK LIST
            else {
                let rawTasks: any[] = [];
                let rawNotes: any[] = [];

                if (importedData.tasks && Array.isArray(importedData.tasks)) {
                    rawTasks = importedData.tasks;
                    if (importedData.notes) rawNotes = importedData.notes;
                } else if (Array.isArray(importedData)) {
                    rawTasks = importedData;
                }

                const existingTaskIds = new Set(tasks?.map(t => t.id));
                const tasksToAdd: Task[] = [];
                
                rawTasks.forEach((task: any) => {
                    if (!existingTaskIds.has(task.id || 'none')) {
                        tasksToAdd.push({
                            ...task,
                            id: task.id || uuidv4(),
                            createdAt: new Date(task.createdAt || Date.now()),
                            dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
                            projectId: targetProjectId
                        });
                    }
                });

                setTasks(prev => [...(prev || []), ...tasksToAdd]);
                
                // Also import associated notes if any
                if (rawNotes.length > 0) {
                    const existingNoteIds = new Set(notes?.map(n => n.id));
                    const notesToAdd: Note[] = [];
                    rawNotes.forEach((note: any) => {
                        if (!existingNoteIds.has(note.id || 'none')) {
                            notesToAdd.push({
                                ...note,
                                id: note.id || uuidv4(),
                                projectId: targetProjectId,
                                createdAt: new Date(note.createdAt),
                                updatedAt: new Date(note.updatedAt)
                            });
                        }
                    });
                    setNotes(prev => [...(prev || []), ...notesToAdd]);
                }

                toast({
                    title: "Import Successful",
                    description: `Imported ${tasksToAdd.length} tasks into the selected project.`,
                });
            }
            
        } catch (error) {
            toast({
                title: "Import Failed",
                description: "The selected file is not a valid or supported data file.",
                variant: "destructive",
            });
        }
        setImportData(null);
        if (hasMounted && isMobile) setIsSheetOpen(false);
    };

    const handleResetApp = async () => {
        localStorage.clear();
        swManager.setNotificationsEnabled(false);
        swManager.clearTasks();
        setProjects(getInitialProjects());
        setTasks(getInitialTasks());
        setTemplates([]);
        setNotes([]);
        setActiveProjectId('1');
        setNotificationsEnabled(false);
        setResetDialogOpen(false);
        toast({ title: "Application Reset", description: "All data has been cleared." });
        setTimeout(() => window.location.reload(), 500);
    };

    const sidebar = <SidebarContent 
                        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)} 
                        isCollapsed={isSidebarCollapsed} 
                        onTaskSave={handleAddTask} 
                        onExport={handleExportTasks} 
                        onImport={handleFileSelect} 
                        onToggleNotifications={handleToggleNotifications} 
                        onResetApp={() => setResetDialogOpen(true)} 
                        notificationsEnabled={notificationsEnabled} 
                        notificationLeadTime={notificationLeadTime} 
                        onLeadTimeChange={handleLeadTimeChange} 
                        onMobileLinkClick={() => setIsSheetOpen(false)}
                        isServiceWorkerReady={isServiceWorkerReady}
                        activeProjectName={activeProject?.name}
                    />;
    
    return (
        <MainLayoutContext.Provider value={{ 
            handleAddToCalendar, 
            activeProject, 
            projects, 
            setProjects, 
            tasks, 
            setTasks, 
            templates, 
            setTemplates, 
            notes,
            setNotes,
            activeProjectId, 
            setActiveProjectId, 
            onTaskSave: handleAddTask,
            vaultPasscode,
            setVaultPasscode,
            isVaultUnlocked,
            setIsVaultUnlocked
        }}>
            <div className="flex min-h-screen w-full bg-background font-sans">
                {hasMounted && !isMobile && (
                    <aside className={cn("flex flex-col border-r bg-card py-4 transition-all duration-300 ease-in-out", isSidebarCollapsed ? "w-20" : "w-72")}>
                        {sidebar}
                    </aside>
                )}
                
                <div className="flex flex-1 flex-col">
                    <Header>
                        <div className="flex items-center gap-4">
                            {hasMounted && !isMobile && isSidebarCollapsed && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setIsSidebarCollapsed(false)}
                                >
                                    <ChevronsRight />
                                </Button>
                            )}
                            {hasMounted && isMobile && (
                                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                                    <SheetTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <PanelLeft />
                                            <span className="sr-only">Open Menu</span>
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="left" className="flex flex-col p-0 w-[85vw]">
                                    <div className="p-4">
                                        <SheetHeader>
                                                <SheetTitle className="sr-only">Menu</SheetTitle>
                                        </SheetHeader>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        <SidebarContent 
                                            isCollapsed={false} 
                                            onTaskSave={handleAddTask} 
                                            onExport={handleExportTasks} 
                                            onImport={handleFileSelect} 
                                            onToggleNotifications={handleToggleNotifications} 
                                            onResetApp={() => setResetDialogOpen(true)} 
                                            notificationsEnabled={notificationsEnabled} 
                                            notificationLeadTime={notificationLeadTime} 
                                            onLeadTimeChange={handleLeadTimeChange} 
                                            onMobileLinkClick={() => setIsSheetOpen(false)} 
                                            isServiceWorkerReady={isServiceWorkerReady}
                                        />
                                    </div>
                                    </SheetContent>
                                </Sheet>
                            )}
                             <div className="flex items-center gap-2 font-semibold">
                                {pathname !== '/' && activeProject && (
                                    <>
                                        <Folder className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-muted-foreground">/</span>
                                        <span className="text-foreground">{activeProject.name}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                             <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => setIsCommandMenuOpen(true)}>
                                            <Command className="h-5 w-5" />
                                            <span className="sr-only">Quick Capture</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Quick Capture (Cmd+K)</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            {hasMounted && vaultPasscode && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => setIsVaultUnlocked(!isVaultUnlocked)}
                                                className={cn(isVaultUnlocked ? "text-primary" : "text-muted-foreground")}
                                            >
                                                {isVaultUnlocked ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{isVaultUnlocked ? 'Lock Vault' : 'Unlock Vault'}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}

                            {hasMounted && isMobile && (
                                <AddTaskDialog onTaskSave={handleAddTask}>
                                    <Button variant="ghost" size="icon">
                                        <Plus />
                                        <span className="sr-only">Add Task</span>
                                    </Button>
                                </AddTaskDialog>
                            )}
                            <ThemeToggle />
                        </div>
                    </Header>
                    <main className="flex-1 p-4 sm:p-6 lg:p-8">
                        {children}
                    </main>
                </div>
                
                 <CommandMenu 
                    open={isCommandMenuOpen} 
                    onOpenChange={setIsCommandMenuOpen} 
                    onTaskSave={handleAddTask}
                 />

                 <ImportDialog 
                    isOpen={!!importData}
                    onClose={() => setImportData(null)}
                    projects={projects || []}
                    isFullBackup={isFullBackupDetected}
                    onConfirmImport={(projectId) => {
                        if (importData) {
                            handleConfirmImport(importData, projectId);
                        }
                    }}
                />
                <AlertDialog open={isResetDialogOpen} onOpenChange={setResetDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Reset Application?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete all tasks and stored data. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button variant="outline" onClick={handleExportTasks}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Data First
                                </Button>
                                <AlertDialogAction
                                    className="bg-destructive hover:bg-destructive/90"
                                    onClick={handleResetApp}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete All Data
                                </AlertDialogAction>
                            </div>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </MainLayoutContext.Provider>
    );
}
