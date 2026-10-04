
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoreHorizontal, Plus, Folder, Trash2, Edit, Download } from 'lucide-react';
import type { Project, Task, TaskTemplate } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useRouter } from 'next/navigation';
import MainLayout, { useMainLayout } from '@/components/main-layout';

interface ProjectFormProps {
    project?: Project;
    onSave: (project: Omit<Project, 'id' | 'createdAt'>) => void;
    onUpdate?: (project: Project) => void;
    children: React.ReactNode;
}

function ProjectDialog({ project, onSave, onUpdate, children }: ProjectFormProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    
    const isEditing = !!project;

    React.useEffect(() => {
        if (isOpen) {
            setName(project?.name || '');
            setDescription(project?.description || '');
        }
    }, [isOpen, project]);

    const handleSubmit = () => {
        if (name.trim()) {
            if (isEditing && onUpdate && project) {
                onUpdate({ ...project, name, description });
            } else {
                onSave({ name, description });
            }
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Project' : 'Create New Project'}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Update the details for your project.' : 'Start a new plan or project to organize your tasks.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="project-name">Project Name</Label>
                        <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Q4 Marketing Campaign" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="project-description">Description (Optional)</Label>
                        <Textarea id="project-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., A project to boost brand awareness." />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit}>{isEditing ? 'Save Changes' : 'Create Project'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ProjectCard({ project, taskCount, onSelect, onUpdate, onExport, onDelete }: {
    project: Project;
    taskCount: number;
    onSelect: (id: string) => void;
    onUpdate: (project: Project) => void;
    onExport: (project: Project) => void;
    onDelete: () => void;
}) {
    const [timeAgo, setTimeAgo] = React.useState('');

    React.useEffect(() => {
        if (project.createdAt) {
            const date = new Date(project.createdAt);
            if (!isNaN(date.getTime())) {
                setTimeAgo(formatDistanceToNow(date, { addSuffix: true }));
            }
        }
    }, [project.createdAt]);

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Folder className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">{project.name}</CardTitle>
                            <CardDescription>{taskCount} tasks</CardDescription>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <ProjectDialog project={project} onSave={() => {}} onUpdate={onUpdate}>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                            </ProjectDialog>
                            <DropdownMenuItem onClick={() => onExport(project)}>
                                <Download className="mr-2 h-4 w-4" /> Export Project
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground min-h-[40px]">
                    {project.description || `Created ${timeAgo}`}
                </p>
            </CardContent>
            <div className="p-6 pt-0">
                <Button className="w-full" onClick={() => onSelect(project.id)}>
                    Open Project
                </Button>
            </div>
        </Card>
    );
}

function ProjectsPageContent() {
    const { projects, setProjects, tasks, setTasks, notes, setNotes, setActiveProjectId, activeProjectId } = useMainLayout();
    const [deleteAlert, setDeleteAlert] = React.useState<Project | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    React.useEffect(() => {
        if (!activeProjectId && projects && projects.length > 0) {
            setActiveProjectId(projects[0].id);
        }
    }, [activeProjectId, projects, setActiveProjectId]);

    const handleAddProject = (projectData: Omit<Project, 'id' | 'createdAt'>) => {
        const newProject = { ...projectData, id: uuidv4(), createdAt: new Date() };
        setProjects(prev => [...(prev || []), newProject]);
        toast({
            title: "Project Created!",
            description: `Project "${newProject.name}" has been created.`
        });
    };

    const handleUpdateProject = (updatedProject: Project) => {
        setProjects(prev => (prev || []).map(p => p.id === updatedProject.id ? updatedProject : p));
        toast({
            title: "Project Updated!",
            description: `Project "${updatedProject.name}" has been updated.`
        });
    };

    const handleDeleteProject = (projectId: string) => {
        const projectToDelete = projects?.find(p => p.id === projectId);
        if (projectToDelete) {
            setProjects(prev => (prev || []).filter(p => p.id !== projectId));
            setTasks(prev => (prev || []).filter(t => t.projectId !== projectId));
            setNotes(prev => (prev || []).filter(n => n.projectId !== projectId));
            
            if (activeProjectId === projectId) {
                const remainingProjects = (projects || []).filter(p => p.id !== projectId);
                const newActiveId = remainingProjects.length > 0 ? remainingProjects[0].id : null;
                setActiveProjectId(newActiveId);
            }
            
            toast({
                title: "Project Deleted",
                description: `Project "${projectToDelete.name}" and all its records have been deleted.`,
                variant: 'destructive'
            });
        }
        setDeleteAlert(null);
    };

    const handleSelectProject = (projectId: string) => {
        setActiveProjectId(projectId);
        router.push('/dashboard');
    }

    const handleExportProject = (project: Project) => {
        if (!tasks || !notes) return;
        const projectTasks = tasks.filter(t => t.projectId === project.id);
        const projectNotes = notes.filter(n => n.projectId === project.id);
        
        const dataToExport = {
            project,
            tasks: projectTasks,
            notes: projectNotes
        };
        
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(dataToExport, null, 2)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `${project.name.replace(/\s+/g, '_')}_backup.json`;
        link.click();
        toast({
            title: "Project Exported",
            description: `"${project.name}" structure and records have been saved.`,
        });
    };

    const getProjectTaskCount = (projectId: string) => {
        return tasks?.filter(t => t.projectId === projectId).length || 0;
    }

    if (!projects) return null;

    return (
        <>
             <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Projects</h1>
                    <p className="text-muted-foreground">Organize your life into separate plans.</p>
                </div>
                <ProjectDialog onSave={handleAddProject}>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Project
                    </Button>
                </ProjectDialog>
            </div>
             <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {projects.map(project => (
                       <ProjectCard 
                            key={project.id}
                            project={project}
                            taskCount={getProjectTaskCount(project.id)}
                            onSelect={handleSelectProject}
                            onUpdate={handleUpdateProject}
                            onExport={handleExportProject}
                            onDelete={() => setDeleteAlert(project)}
                       />
                    ))}
                </div>
            
            <AlertDialog open={!!deleteAlert} onOpenChange={(open) => !open && setDeleteAlert(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{deleteAlert?.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the project and all of its associated tasks and notebook entries. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => deleteAlert && handleDeleteProject(deleteAlert.id)}
                        >
                            Delete Project
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default function ProjectsPage() {
    return (
        <MainLayout>
            <ProjectsPageContent />
        </MainLayout>
    );
}

