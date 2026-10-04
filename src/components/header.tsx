import * as React from 'react';

export function Header({ children }: { children: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background px-4">
      {children}
    </header>
  );
}
