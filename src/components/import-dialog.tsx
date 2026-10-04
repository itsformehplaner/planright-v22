
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Project } from '@/lib/types';
import { Upload, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  isFullBackup?: boolean;
  onConfirmImport: (projectId: string) => void;
}

export function ImportDialog({
  isOpen,
  onClose,
  projects,
  isFullBackup,
  onConfirmImport,
}: ImportDialogProps) {
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('1');

  React.useEffect(() => {
    // Default to the first project if available
    if (isOpen && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [isOpen, projects]);

  const handleConfirm = () => {
    // projectId is only needed if not a full backup, but we pass it anyway
    onConfirmImport(selectedProjectId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            {isFullBackup 
              ? "We detected a full application backup. This will restore your entire project structure, notebooks, and tasks exactly as they were." 
              : "Choose a project to import your tasks into. All tasks and records from this file will be added to the selected project."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {isFullBackup ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Smart Sync Active</AlertTitle>
              <AlertDescription>
                Project names and task relationships will be preserved. No data will be overwritten; only new items will be added.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="project-select">Target Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger id="project-select">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            <Upload className="mr-2 h-4 w-4" />
            {isFullBackup ? "Restore All Data" : "Import Tasks"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

