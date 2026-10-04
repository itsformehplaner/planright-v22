import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      <WifiOff className="h-24 w-24 text-muted-foreground mb-6" />
      <h1 className="text-4xl font-bold mb-2">You're Offline</h1>
      <p className="text-lg text-muted-foreground mb-4">
        It looks like you've lost your internet connection.
      </p>
      <p className="text-md text-muted-foreground">
        Don't worry, any pages you've already visited should still be available. You can continue to manage your tasks.
      </p>
    </div>
  );
}
