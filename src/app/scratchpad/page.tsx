'use client';

import * as React from 'react';
import MainLayout from '@/components/main-layout';
import { Scratchpad } from '@/components/scratchpad';
import { useMainLayout } from '@/components/main-layout';
import { useHasMounted } from '@/hooks/use-has-mounted';
import { Skeleton } from '@/components/ui/skeleton';

function ScratchpadPageContent() {
    const { activeProject } = useMainLayout();

    return (
        <>
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Project Notebook</h1>
                <p className="text-muted-foreground">Keep long-form records and notes for {activeProject?.name || 'your projects'}.</p>
            </div>
            <Scratchpad />
        </>
    );
}

export default function ScratchpadPage() {
    const hasMounted = useHasMounted();

    return (
        <MainLayout>
            {hasMounted ? (
                <ScratchpadPageContent />
            ) : (
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-[500px] w-full" />
                </div>
            )}
        </MainLayout>
    );
}
