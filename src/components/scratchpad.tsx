
'use client';

import * as React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from './ui/button';
import { Save, Trash, Plus, FileText, Search, Clock, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useMainLayout } from './main-layout';
import type { Note } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { Input } from './ui/input';
import { format } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

export function Scratchpad() {
  const { activeProject, notes, setNotes } = useMainLayout();
  const { toast } = useToast();
  
  const [activeNoteId, setActiveNoteId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const projectNotes = React.useMemo(() => {
    if (!notes || !activeProject) return [];
    return notes.filter(n => n.projectId === activeProject.id)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [notes, activeProject]);

  const filteredNotes = React.useMemo(() => {
    if (!searchQuery) return projectNotes;
    const q = searchQuery.toLowerCase();
    return projectNotes.filter(n => 
        n.title.toLowerCase().includes(q) || 
        n.content.toLowerCase().includes(q)
    );
  }, [projectNotes, searchQuery]);

  const activeNote = React.useMemo(() => {
    return projectNotes.find(n => n.id === activeNoteId) || null;
  }, [projectNotes, activeNoteId]);

  const handleCreateNote = () => {
    if (!activeProject) return;
    const newNote: Note = {
      id: uuidv4(),
      title: 'Untitled Note',
      content: '',
      projectId: activeProject.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setNotes(prev => [...(prev || []), newNote]);
    setActiveNoteId(newNote.id);
  };

  const handleUpdateNote = (updates: Partial<Note>) => {
    if (!activeNoteId) return;
    setNotes(prev => (prev || []).map(n => 
        n.id === activeNoteId ? { ...n, ...updates, updatedAt: new Date() } : n
    ));
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => (prev || []).filter(n => n.id !== id));
    if (activeNoteId === id) setActiveNoteId(null);
    toast({ title: 'Note Deleted', variant: 'destructive' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-12rem)] animate-in fade-in duration-500">
      {/* Sidebar */}
      <Card className="lg:col-span-4 flex flex-col overflow-hidden">
        <CardHeader className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <CardTitle className="text-lg">My Notes</CardTitle>
                <Button size="sm" onClick={handleCreateNote}>
                    <Plus className="h-4 w-4 mr-2" />
                    New
                </Button>
            </div>
            <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search notes..." 
                    className="pl-8 h-9" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </CardHeader>
        <Separator />
        <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
                {filteredNotes.length > 0 ? filteredNotes.map(note => (
                    <button
                        key={note.id}
                        onClick={() => setActiveNoteId(note.id)}
                        className={cn(
                            "w-full text-left p-3 rounded-lg transition-all group relative",
                            activeNoteId === note.id ? "bg-primary/10 border-primary/20" : "hover:bg-muted"
                        )}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className={cn("font-semibold truncate text-sm", activeNoteId === note.id && "text-primary")}>
                                    {note.title || 'Untitled Note'}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                    {note.content || 'Empty note...'}
                                </p>
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-1">
                                <span className="text-[10px] text-muted-foreground">
                                    {format(note.updatedAt, 'MMM d')}
                                </span>
                            </div>
                        </div>
                    </button>
                )) : (
                    <div className="py-12 text-center text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No notes found</p>
                    </div>
                )}
            </div>
        </ScrollArea>
      </Card>

      {/* Editor */}
      <Card className="lg:col-span-8 flex flex-col overflow-hidden">
        {activeNote ? (
            <>
                <CardHeader className="p-4 flex flex-row items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <Input 
                            value={activeNote.title}
                            onChange={(e) => handleUpdateNote({ title: e.target.value })}
                            className="text-xl font-bold border-none focus-visible:ring-0 px-0 h-auto bg-transparent"
                            placeholder="Note Title"
                        />
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            <span>Last saved {format(activeNote.updatedAt, 'MMM d, h:mm a')}</span>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteNote(activeNote.id)}>
                        <Trash className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <Separator />
                <CardContent className="flex-1 p-0">
                    <Textarea
                        value={activeNote.content}
                        onChange={(e) => handleUpdateNote({ content: e.target.value })}
                        className="w-full h-full min-h-[500px] p-6 border-none focus-visible:ring-0 text-base resize-none leading-relaxed"
                        placeholder="Start typing your records here..."
                    />
                </CardContent>
            </>
        ) : (
            <CardContent className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground p-12">
                <div className="bg-muted rounded-full p-6 mb-4">
                    <FileText className="h-12 w-12 opacity-50" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Select a note to view</h3>
                <p className="max-w-xs mt-2">
                    Pick a note from the list or create a new one to keep track of your records for this project.
                </p>
                <Button className="mt-6" onClick={handleCreateNote}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Note
                </Button>
            </CardContent>
        )}
      </Card>
    </div>
  );
}

