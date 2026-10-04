
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Play, Pause, RefreshCw, Coffee, Brain, Settings, Save } from 'lucide-react';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

const DEFAULT_DURATIONS: Record<TimerMode, number> = {
  work: 25,
  shortBreak: 5,
  longBreak: 15,
};

const MODE_LABELS: Record<TimerMode, string> = {
    work: 'Focus Time',
    shortBreak: 'Short Break',
    longBreak: 'Long Break',
}

const MODE_ICONS: Record<TimerMode, React.ElementType> = {
    work: Brain,
    shortBreak: Coffee,
    longBreak: Coffee,
}

const getInitialDurations = (): Record<TimerMode, number> => {
    if (typeof window === 'undefined') {
      return DEFAULT_DURATIONS;
    }
    try {
      const storedDurations = localStorage.getItem('pomodoroDurations');
      if (storedDurations) {
        const parsed = JSON.parse(storedDurations);
        // Basic validation to ensure format is correct
        if (parsed.work && parsed.shortBreak && parsed.longBreak) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Failed to parse pomodoro durations from localStorage", error);
    }
    return DEFAULT_DURATIONS;
};


export function PomodoroTimer() {
  const [durations, setDurations] = React.useState<Record<TimerMode, number>>(DEFAULT_DURATIONS);
  const [mode, setMode] = React.useState<TimerMode>('work');
  const [timeRemaining, setTimeRemaining] = React.useState(0);
  const [isActive, setIsActive] = React.useState(false);
  const [pomodorosCompleted, setPomodorosCompleted] = React.useState(0);
  const { toast } = useToast();

  // Load durations from localStorage on mount and initialize timer
  React.useEffect(() => {
    const initialDurations = getInitialDurations();
    setDurations(initialDurations);
    setTimeRemaining(initialDurations.work * 60);
    // Audio playback was removed to prevent errors.
    // You can re-enable it by adding a valid audio file to /public/alarm.mp3
    // and uncommenting the audioRef logic.
  }, []);

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => time - 1);
      }, 1000);
    } else if (isActive && timeRemaining === 0) {
      // audioRef.current?.play().catch(e => console.error("Error playing sound", e));
      handleTimerEnd();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeRemaining]);
  
  const handleTimerEnd = () => {
    setIsActive(false);
    if (mode === 'work') {
      const newCompletedCount = pomodorosCompleted + 1;
      setPomodorosCompleted(newCompletedCount);
      if (newCompletedCount > 0 && newCompletedCount % 4 === 0) {
        switchMode('longBreak');
      } else {
        switchMode('shortBreak');
      }
    } else {
      switchMode('work');
    }
  };


  const toggleTimer = () => {
    // If timer is at 0 and user hits start, reset to current mode's duration
    if (timeRemaining === 0 && !isActive) {
        setTimeRemaining(durations[mode] * 60);
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeRemaining(durations[mode] * 60);
  };
  
  const switchMode = (newMode: TimerMode) => {
    if (isActive) {
        toast({
            title: "Cannot switch mode while timer is active",
            description: "Please pause the timer first.",
            variant: "destructive"
        })
        return;
    }
    setMode(newMode);
    setTimeRemaining(durations[newMode] * 60);
  }
  
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>, changedMode: TimerMode) => {
    const value = e.target.valueAsNumber;
    // Prevent negative or zero values
    if (value > 0) {
      const newDurations = { ...durations, [changedMode]: value };
      setDurations(newDurations);

      // If the user is changing the current mode, update the timer
      if (changedMode === mode && !isActive) {
          setTimeRemaining(value * 60);
      }
    }
  }

  const saveSettings = () => {
     localStorage.setItem('pomodoroDurations', JSON.stringify(durations));
     toast({
        title: "Settings Saved",
        description: "Your new Pomodoro durations have been saved.",
     });
  }


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  
  const totalDuration = durations[mode] * 60;
  const progress = totalDuration > 0 ? (1 - timeRemaining / totalDuration) * 100 : 0;
  const CurrentIcon = MODE_ICONS[mode];


  return (
    <Card className="w-full max-w-md mx-auto animate-fade-in">
      <CardHeader>
        <CardTitle className="text-center text-2xl flex items-center justify-center gap-2">
            <CurrentIcon className="h-6 w-6" />
            <span>{MODE_LABELS[mode]}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-6">
        <div className="relative h-48 w-48">
            <Progress value={progress} className="h-full w-full rounded-full" />
             <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl font-bold font-mono tracking-tighter">
                    {formatTime(timeRemaining)}
                </span>
            </div>
        </div>

        <div className="flex justify-center gap-2">
            <Button variant={mode === 'work' ? 'default' : 'outline'} onClick={() => switchMode('work')}>Focus</Button>
            <Button variant={mode === 'shortBreak' ? 'default' : 'outline'} onClick={() => switchMode('shortBreak')}>Short Break</Button>
            <Button variant={mode === 'longBreak' ? 'default' : 'outline'} onClick={() => switchMode('longBreak')}>Long Break</Button>
        </div>
        
        <div className="flex items-center justify-center gap-4">
          <Button onClick={toggleTimer} size="lg" className="w-32">
            {isActive ? <Pause className="mr-2" /> : <Play className="mr-2" />}
            {isActive ? 'Pause' : 'Start'}
          </Button>
          <Button onClick={resetTimer} variant="outline" size="lg">
            <RefreshCw />
          </Button>
        </div>
        <div className="text-center text-muted-foreground">
            <p>Pomodoros completed: {pomodorosCompleted}</p>
        </div>
      </CardContent>
      <CardFooter>
          <Collapsible className="w-full">
            <CollapsibleTrigger asChild>
                <div className="flex justify-center -mb-4">
                    <Button variant="ghost">
                        <Settings className="mr-2"/>
                        Timer Settings
                    </Button>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
                    <div>
                        <Label htmlFor="work-duration">Focus (min)</Label>
                        <Input id="work-duration" type="number" value={durations.work} onChange={(e) => handleDurationChange(e, 'work')} min="1" />
                    </div>
                     <div>
                        <Label htmlFor="short-break-duration">Short Break (min)</Label>
                        <Input id="short-break-duration" type="number" value={durations.shortBreak} onChange={(e) => handleDurationChange(e, 'shortBreak')} min="1" />
                    </div>
                     <div>
                        <Label htmlFor="long-break-duration">Long Break (min)</Label>
                        <Input id="long-break-duration" type="number" value={durations.longBreak} onChange={(e) => handleDurationChange(e, 'longBreak')} min="1" />
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <Button onClick={saveSettings}>
                        <Save className="mr-2"/>
                        Save Settings
                    </Button>
                </div>
            </CollapsibleContent>
          </Collapsible>
      </CardFooter>
    </Card>
  );
}

    