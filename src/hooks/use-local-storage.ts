
'use client';

import * as React from 'react';

// Define a type for the options to allow for custom serializers/deserializers
interface UseLocalStorageOptions<T> {
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
}

// Custom event name for cross-component communication within the same tab
const customStorageEventName = 'onLocalStorageChange';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageOptions<T>
): [T | null, React.Dispatch<React.SetStateAction<T>>] {
  const serializer = options?.serializer ?? JSON.stringify;
  const deserializer = options?.deserializer ?? JSON.parse;
  const [hasMounted, setHasMounted] = React.useState(false);

  const [storedValue, setStoredValue] = React.useState<T | null>(() => {
    // On the server, we return null to avoid hydration mismatches
    if (typeof window === 'undefined') {
      return null;
    }
    // On the client, we check for the value
    try {
      const item = window.localStorage.getItem(key);
      return item ? deserializer(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  React.useEffect(() => {
    setHasMounted(true);
    // This effect runs only on the client.
    // If the storedValue was initialized to null on the server,
    // we now read the value from localStorage.
    if (storedValue === null) {
      try {
        const item = window.localStorage.getItem(key);
        setStoredValue(item ? deserializer(item) : initialValue);
      } catch (error) {
        console.error(error);
        setStoredValue(initialValue);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setValue: React.Dispatch<React.SetStateAction<T>> = React.useCallback(
    (value) => {
        try {
            // The value can be a function, just like with useState
            const valueToStore = value instanceof Function ? value(storedValue as T) : value;
            setStoredValue(valueToStore);
            if (typeof window !== 'undefined') {
                const serializedValue = serializer(valueToStore);
                window.localStorage.setItem(key, serializedValue);
                // Dispatch a custom event to notify other components in the same tab
                window.dispatchEvent(new CustomEvent(customStorageEventName, { detail: { key, newValue: serializedValue } }));
            }
        } catch (error) {
            console.error(error);
        }
    }, [key, serializer, storedValue]
  );

  React.useEffect(() => {
    const handleStorageChange = (event: StorageEvent | CustomEvent) => {
      if ((event as StorageEvent).key && (event as StorageEvent).key !== key) {
        return;
      }
      if ((event as CustomEvent).detail && (event as CustomEvent).detail.key !== key) {
        return;
      }

      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(deserializer(item));
        } else {
            // Item was removed from localStorage, reset to initial value
            setStoredValue(initialValue);
        }
      } catch (error) {
        console.error(error);
      }
    };

    // Listen for changes from other tabs
    window.addEventListener('storage', handleStorageChange);
    // Listen for changes from the same tab via our custom event
    window.addEventListener(customStorageEventName, handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(customStorageEventName, handleStorageChange);
    };
  }, [key, deserializer, initialValue]);

  return [hasMounted ? storedValue : null, setValue as any];
}

    