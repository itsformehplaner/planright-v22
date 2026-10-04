
'use client';

import * as React from 'react';
import MainLayout from '@/components/main-layout';
import { PomodoroTimer } from '@/components/pomodoro-timer';

export default function PomodoroPage() {
    return (
        <MainLayout>
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Pomodoro Timer</h1>
                    <p className="text-muted-foreground">Focus on your tasks using the Pomodoro Technique.</p>
                </div>
            </div>
            <PomodoroTimer />
        </MainLayout>
    );
}
