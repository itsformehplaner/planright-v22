
import type { Project } from '@/lib/types';
import { sub } from 'date-fns';

export const getInitialProjects = (): Project[] => [
    {
        id: '1',
        name: 'Personal',
        description: 'My personal tasks and goals. This is the default project.',
        createdAt: sub(new Date(), { days: 30 }),
    }
];
