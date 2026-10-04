
'use client';

import * as React from 'react';
import type { User } from 'firebase/auth';
import { useToast } from './use-toast';


export function useAuth() {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();
  
  React.useEffect(() => {
    setLoading(false);
  }, []);

  const signIn = async () => {
    toast({ title: "Sync feature is not available.", variant: "destructive"});
  };

  const signOut = async () => {
    // Does nothing in local-only mode
  };

  return { user, loading, signIn, signOut };
}
