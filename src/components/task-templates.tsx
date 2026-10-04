
'use client';

import * as React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Plus, Trash, X, Layers, Edit, MoreHorizontal, Copy, CalendarIcon } from 'lucide-react';
import type { TaskTemplate, TaskTemplateSubTask, TaskStatus, TaskCategory } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Textarea } from './ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const statusOptions: { value: TaskStatus; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'completed', label: 'Done' },
    { value: 'canceled', label: 'Canceled' },
];

const categoryOptions: { value: TaskCategory; label: string }[] = [
    { value: 'Work', label: 'Work' },
    { value: 'Personal', label: 'Personal' },
    { value: 'Chore', label: 'Chore' },
    { value: 'Learning', label: 'Learning' },
];

interface TemplateFormProps {
    template?: TaskTemplate;
    onSave: (template: Omit<TaskTemplate, 'id'>) => void;
    onUpdate?: (template: TaskTemplate) => void;
    children: React.ReactNode;
}

function TemplateDialog({ template, onSave, onUpdate, children }: TemplateFormProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [name, setName] = React.useState('');
    const [subTasks, setSubTasks] = React.useState<TaskTemplateSubTask[]>([]);
    
    const isEditing = !!template;

    React.useEffect(() => {
        if (isOpen) {
            setName(template?.name || '');
            setSubTasks(template?.subTasks || [{ id: uuidv4(), title: '', description: '', status: 'active', category: 'Work', dueDayOffset: 0 }]);
        }
    }, [isOpen, template]);

    const handleSubTaskChange = (id: string, field: 'title' | 'description' | 'status' | 'category' | 'dueDayOffset', value: string | number) => {
        setSubTasks(prev => prev.map(task => task.id === id ? { ...task, [field]: value } : task));
    };

    const addSubTask = () => {
        setSubTasks(prev => [...prev, { id: uuidv4(), title: '', description: '', status: 'active', category: 'Work', dueDayOffset: 0 }]);
    };

    const removeSubTask = (id: string) => {
        setSubTasks(prev => prev.filter(task => task.id !== id));
    };

    const handleSubmit = () => {
        const finalSubTasks = subTasks.filter(task => task.title.trim() !== '');
        if (name.trim() && finalSubTasks.length > 0) {
            if (isEditing && onUpdate && template) {
                onUpdate({ ...template, name, subTasks: finalSubTasks });
            } else {
                onSave({ name, subTasks: finalSubTasks });
            }
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Template' : 'Create New Template'}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Update your task template.' : 'Create a reusable template for your common projects and checklists.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-6 -mr-6 space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="template-name">Template Name</Label>
                        <Input id="template-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., New Client Onboarding" />
                    </div>
                    <div className="space-y-3">
                        <Label>Tasks</Label>
                        {subTasks.map((task, index) => (
                            <div key={task.id} className="flex items-start gap-2 p-3 border rounded-lg">
                                <div className="flex-1 space-y-2">
                                    <Input
                                        placeholder={`Task ${index + 1} Title`}
                                        value={task.title}
                                        onChange={(e) => handleSubTaskChange(task.id, 'title', e.target.value)}
                                    />
                                     <Textarea
                                        placeholder="Optional: Add a description"
                                        value={task.description}
                                        onChange={(e) => handleSubTaskChange(task.id, 'description', e.target.value)}
                                        rows={2}
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label htmlFor={`due-offset-${task.id}`} className="text-xs">Due After (Days)</Label>
                                            <Input
                                                id={`due-offset-${task.id}`}
                                                type="number"
                                                min="0"
                                                placeholder="e.g., 7"
                                                value={task.dueDayOffset ?? ''}
                                                onChange={(e) => handleSubTaskChange(task.id, 'dueDayOffset', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                                            />
                                        </div>
                                         <Select
                                            value={task.category}
                                            onValueChange={(value) => handleSubTaskChange(task.id, 'category', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Set category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categoryOptions.map(option => (
                                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => removeSubTask(task.id)} disabled={subTasks.length <= 1}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                     <Button variant="outline" onClick={addSubTask}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Task
                    </Button>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit}>Save Template</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface UseTemplateDialogProps {
    template: TaskTemplate;
    onConfirm: (template: TaskTemplate, prefix: string, startDate: Date) => void;
    children: React.ReactNode;
}

function UseTemplateDialog({ template, onConfirm, children }: UseTemplateDialogProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [prefix, setPrefix] = React.useState('');
    const [startDate, setStartDate] = React.useState<Date | undefined>(new Date());

    const handleConfirm = () => {
        if (!startDate) return;
        onConfirm(template, prefix.trim(), startDate);
        setIsOpen(false);
        setPrefix('');
        setStartDate(new Date());
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Use Template: "{template.name}"</DialogTitle>
                    <DialogDescription>
                        This will create {template.subTasks.length} new tasks in your list. Choose a start date to automatically set due dates.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div>
                        <Label htmlFor="prefix">Task Prefix (Optional)</Label>
                        <Input id="prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="e.g., Project X" />
                        <p className="text-sm text-muted-foreground mt-2">
                            Example: "{prefix ? prefix + ': ' : ''}{template.subTasks[0]?.title || 'Sample Task'}"
                        </p>
                    </div>
                     <div>
                        <Label>Project Start Date</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !startDate && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={startDate}
                                    onSelect={setStartDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={!startDate}>Create Tasks</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


interface TaskTemplatesProps {
    templates: TaskTemplate[];
    onAddTemplate: (template: Omit<TaskTemplate, 'id'>) => void;
    onUpdateTemplate: (template: TaskTemplate) => void;
    onDeleteTemplate: (id: string) => void;
    onUseTemplate: (template: TaskTemplate, prefix: string, startDate: Date) => void;
}

export function TaskTemplates({ templates, onAddTemplate, onUpdateTemplate, onDeleteTemplate, onUseTemplate }: TaskTemplatesProps) {
    const [deleteAlert, setDeleteAlert] = React.useState<TaskTemplate | null>(null);

    return (
        <>
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Task Templates</h1>
                    <p className="text-muted-foreground">Create reusable checklists for your common projects.</p>
                </div>
                <TemplateDialog onSave={onAddTemplate}>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Template
                    </Button>
                </TemplateDialog>
            </div>
            {templates.length === 0 ? (
                <Card className="border-dashed shadow-none flex flex-col items-center justify-center p-8 text-center">
                    <div className="rounded-full border border-dashed p-4">
                        <Layers className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle as="h2" className="text-xl">No Templates Yet</CardTitle>
                    </CardHeader>
                    <CardDescription>Click "Create Template" to get started.</CardDescription>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {templates.map(template => (
                        <Card key={template.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle>{template.name}</CardTitle>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <TemplateDialog template={template} onSave={() => {}} onUpdate={onUpdateTemplate}>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                            </TemplateDialog>
                                            <DropdownMenuItem onClick={() => setDeleteAlert(template)} className="text-destructive focus:text-destructive">
                                                <Trash className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <CardDescription>{template.subTasks.length} task(s)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                                    {template.subTasks.slice(0, 3).map(task => (
                                        <li key={task.id} className="truncate">{task.title}</li>
                                    ))}
                                    {template.subTasks.length > 3 && <li>...and {template.subTasks.length - 3} more</li>}
                                </ul>
                                <UseTemplateDialog template={template} onConfirm={onUseTemplate}>
                                    <Button className="w-full mt-4">
                                        <Copy className="mr-2 h-4 w-4" />
                                        Use Template
                                    </Button>
                                </UseTemplateDialog>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
             <AlertDialog open={!!deleteAlert} onOpenChange={(open) => !open && setDeleteAlert(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the "{deleteAlert?.name}" template. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => {
                                if (deleteAlert) {
                                    onDeleteTemplate(deleteAlert.id);
                                    setDeleteAlert(null);
                                }
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
