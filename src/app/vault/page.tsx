
'use client';

import * as React from 'react';
import type { Project, VaultItem } from '@/lib/types';
import MainLayout, { useMainLayout } from '@/components/main-layout';
import { useHasMounted } from '@/hooks/use-has-mounted';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Key, Copy, Plus, Trash2, ShieldCheck, Info, Lock, Unlock, Settings, ShieldAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

function VaultPageContent() {
    const { activeProject, projects, setProjects, vaultPasscode, setVaultPasscode, isVaultUnlocked, setIsVaultUnlocked } = useMainLayout();
    const { toast } = useToast();

    const [isAddingItem, setIsAddingItem] = React.useState(false);
    const [newLabel, setNewLabel] = React.useState('');
    const [newValue, setNewValue] = React.useState('');
    const [showSettings, setShowSettings] = React.useState(false);
    const [newPIN, setNewPIN] = React.useState('');
    const [unlockPIN, setUnlockPIN] = React.useState('');

    const handleCopy = (value: string) => {
        if (!isVaultUnlocked && vaultPasscode) {
            toast({ title: 'Vault Locked', description: 'Unlock the vault to copy contents.', variant: 'destructive' });
            return;
        }
        navigator.clipboard.writeText(value);
        toast({ title: 'Copied to Clipboard!', description: 'Your info is ready to paste.' });
    };

    const handleAddItem = () => {
        if (!activeProject || !newLabel.trim() || !newValue.trim()) return;
        
        const newItem: VaultItem = {
            id: uuidv4(),
            label: newLabel.trim(),
            value: newValue.trim()
        };

        const updatedProjects = (projects || []).map(p => 
            p.id === activeProject.id ? { ...p, vault: [...(p.vault || []), newItem] } : p
        );

        setProjects(updatedProjects);
        setNewLabel('');
        setNewValue('');
        setIsAddingItem(false);
        toast({ title: 'Item Added', description: 'Reference information saved to vault.' });
    };

    const handleDeleteItem = (id: string) => {
        if (!activeProject) return;
        const updatedProjects = (projects || []).map(p => 
            p.id === activeProject.id ? { ...p, vault: (p.vault || []).filter(i => i.id !== id) } : p
        );
        setProjects(updatedProjects);
        toast({ title: 'Item Deleted', variant: 'destructive' });
    };

    const handleSavePasscode = () => {
        if (newPIN.trim().length === 0) {
            setVaultPasscode(null);
            setIsVaultUnlocked(false);
            toast({ title: 'Protection Removed', description: 'Your vault is now public.' });
        } else {
            setVaultPasscode(newPIN.trim());
            setIsVaultUnlocked(true);
            toast({ title: 'Passcode Set', description: 'Your vault is now protected.' });
        }
        setNewPIN('');
        setShowSettings(false);
    };

    const handleUnlock = () => {
        if (unlockPIN === vaultPasscode) {
            setIsVaultUnlocked(true);
            setUnlockPIN('');
            toast({ title: 'Vault Unlocked' });
        } else {
            toast({ title: 'Incorrect PIN', variant: 'destructive' });
        }
    };

    if (!activeProject) return <Skeleton className="h-64 w-full" />;

    const vaultItems = activeProject.vault || [];
    const isProtected = !!vaultPasscode;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Key className="h-8 w-8 text-primary" />
                        Project Vault
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Securely store and copy quick reference data for <strong>{activeProject.name}</strong>.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowSettings(!showSettings)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Security
                    </Button>
                    <Button onClick={() => setIsAddingItem(!isAddingItem)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Item
                    </Button>
                </div>
            </div>

            {showSettings && (
                <Card className="border-primary/50 bg-primary/5 animate-in slide-in-from-top-4 duration-300">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-primary" />
                            Vault Security Settings
                        </CardTitle>
                        <CardDescription>Set a PIN to hide your vault values from others.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-end">
                            <div className="flex-1 space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Global PIN / Passcode</label>
                                <Input 
                                    type="password" 
                                    placeholder="Enter 4-digit PIN (leave empty to remove protection)" 
                                    value={newPIN} 
                                    onChange={(e) => setNewPIN(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => setShowSettings(false)}>Cancel</Button>
                                <Button onClick={handleSavePasscode}>Save PIN</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {isProtected && !isVaultUnlocked ? (
                <Card className="max-w-md mx-auto py-12 text-center animate-in zoom-in-95 duration-500">
                    <CardContent className="space-y-6">
                        <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                            <Lock className="h-8 w-8 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold">Vault Locked</h3>
                            <p className="text-sm text-muted-foreground">Enter your passcode to view sensitive information.</p>
                        </div>
                        <div className="flex gap-2 max-w-[200px] mx-auto">
                            <Input 
                                type="password" 
                                autoFocus
                                placeholder="••••" 
                                value={unlockPIN} 
                                onChange={(e) => setUnlockPIN(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                                className="text-center text-xl tracking-[0.5em]"
                            />
                        </div>
                        <Button className="w-full max-w-[200px]" onClick={handleUnlock}>
                            <Unlock className="mr-2 h-4 w-4" />
                            Unlock Vault
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Card className="bg-muted/30 border-dashed">
                        <CardContent className="p-4 flex items-start gap-3">
                            <ShieldCheck className={cn("h-5 w-5 shrink-0 mt-0.5", isProtected ? "text-primary" : "text-amber-500")} />
                            <div>
                                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">
                                    {isProtected ? "Protected Vault" : "Public Vault (Unprotected)"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {isProtected 
                                        ? "This vault is protected by your PIN. Values are masked and locked when the session ends." 
                                        : "Anyone using this device can see your vault entries. Click 'Security' above to set a protection PIN."}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {isAddingItem && (
                        <Card className="animate-in slide-in-from-top-4 duration-300">
                            <CardHeader>
                                <CardTitle className="text-lg">Add New Reference</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-muted-foreground">Label</label>
                                        <Input 
                                            placeholder="e.g., Office Wi-Fi" 
                                            value={newLabel} 
                                            onChange={(e) => setNewLabel(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-muted-foreground">Value</label>
                                        <Input 
                                            placeholder="e.g., GuestPass2024" 
                                            value={newValue} 
                                            onChange={(e) => setNewValue(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" onClick={() => setIsAddingItem(false)}>Cancel</Button>
                                    <Button onClick={handleAddItem}>Save to Vault</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        {vaultItems.length > 0 ? (
                            vaultItems.map(item => (
                                <Card key={item.id} className="group hover:border-primary/50 transition-colors">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                                                    {item.label}
                                                </p>
                                                <p className="text-lg font-mono font-medium truncate">
                                                    {item.value}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button 
                                                    variant="secondary" 
                                                    size="icon" 
                                                    className="h-9 w-9" 
                                                    onClick={() => handleCopy(item.value)}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                                                    onClick={() => handleDeleteItem(item.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : !isAddingItem && (
                            <div className="col-span-full py-20 text-center space-y-4">
                                <div className="bg-muted rounded-full w-20 h-20 flex items-center justify-center mx-auto opacity-40">
                                    <Key className="h-10 w-10" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Your Vault is Empty</h3>
                                    <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                                        Start adding quick reference info for your project like passwords, links, or codes.
                                    </p>
                                    <Button className="mt-6" variant="outline" onClick={() => setIsAddingItem(true)}>
                                        Add Your First Item
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default function VaultPage() {
    const hasMounted = useHasMounted();
    return (
        <MainLayout>
            {hasMounted ? <VaultPageContent /> : <Skeleton className="h-96 w-full" />}
        </MainLayout>
    );
}
