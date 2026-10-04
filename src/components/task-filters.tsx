
import { ChevronsUpDown, Filter, Search, ListTodo, SlidersHorizontal } from 'lucide-react';
import * as React from 'react';

import type { SortOption } from '@/app/tasks/page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Priority, TaskStatus, TaskCategory } from '@/lib/types';
import { Input } from './ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { ScrollArea } from './ui/scroll-area';

interface TaskFiltersProps {
  status: TaskStatus | 'all';
  onStatusChange: (status: TaskStatus | 'all') => void;
  priorities: Priority[];
  onPrioritiesChange: (priorities: Priority[]) => void;
  categories: TaskCategory[];
  onCategoriesChange: (categories: TaskCategory[]) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'dueDate', label: 'Due Date' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'createdAt', label: 'Added Date' },
    { value: 'completionDate', label: 'Completed Date' },
  ];

const priorityOptions: { value: Priority; label: string }[] = [
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];
  
const categoryOptions: { value: TaskCategory; label: string }[] = [
    { value: 'Work', label: 'Work' },
    { value: 'Personal', label: 'Personal' },
    { value: 'Chore', label: 'Chore' },
    { value: 'Learning', label: 'Learning' },
];

const statusOptions: { value: TaskStatus | 'all', label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'completed', label: 'Done' },
    { value: 'canceled', label: 'Canceled' },
];

export function TaskFilters({ 
    status, onStatusChange, 
    priorities, onPrioritiesChange, 
    categories, onCategoriesChange,
    sortOption, onSortChange,
    searchQuery, onSearchChange 
}: TaskFiltersProps) {
  const isMobile = useIsMobile();
  const selectedSortLabel = sortOptions.find(opt => opt.value === sortOption)?.label;

  const handlePriorityChange = (priority: Priority) => {
    const newPriorities = priorities.includes(priority)
      ? priorities.filter(p => p !== priority)
      : [...priorities, priority];
    onPrioritiesChange(newPriorities);
  };

  const handleCategoryChange = (category: TaskCategory) => {
    const newCategories = categories.includes(category)
        ? categories.filter(c => c !== category)
        : [...categories, category];
    onCategoriesChange(newCategories);
  };
  
  const getPriorityLabel = () => {
    if (priorities.length === 0) return "All Priorities";
    if (priorities.length === 1) {
        return priorityOptions.find(p => p.value === priorities[0])?.label;
    }
    return `${priorities.length} priorities selected`;
  }
  
  const getCategoryLabel = () => {
    if (categories.length === 0) return "All Categories";
    if (categories.length === 1) {
        return categoryOptions.find(c => c.value === categories[0])?.label;
    }
    return `${categories.length} categories selected`;
  };

  if (isMobile) {
    const activeFilterCount = priorities.length + categories.length + (status !== 'all' ? 1 : 0);
    return (
        <Card>
            <CardContent className="p-4 flex flex-col gap-4">
                 <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10 w-full"
                    />
                </div>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" className="w-full relative">
                            <SlidersHorizontal className="mr-2 h-4 w-4" />
                            Filters & Sort
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="flex flex-col">
                        <SheetHeader>
                            <SheetTitle>Filters & Sort</SheetTitle>
                        </SheetHeader>
                        <ScrollArea className="flex-1 pr-4 -mr-4">
                            <div className="py-4 space-y-6">
                                <div>
                                    <Label className="text-base font-semibold">Status</Label>
                                    <RadioGroup value={status} onValueChange={(value) => onStatusChange(value as any)} className="mt-2 space-y-1">
                                        {statusOptions.map(option => (
                                            <div key={option.value} className="flex items-center space-x-2">
                                                <RadioGroupItem value={option.value} id={`status-${option.value}`} />
                                                <Label htmlFor={`status-${option.value}`}>{option.label}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                                <Separator />
                                <div>
                                    <Label className="text-base font-semibold">Categories</Label>
                                    <div className="mt-2 space-y-2">
                                        {categoryOptions.map(option => (
                                            <div key={option.value} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`cat-${option.value}`}
                                                    checked={categories.includes(option.value)}
                                                    onCheckedChange={() => handleCategoryChange(option.value)}
                                                />
                                                <Label htmlFor={`cat-${option.value}`} className="font-normal">{option.label}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <Separator />
                                <div>
                                    <Label className="text-base font-semibold">Priorities</Label>
                                    <div className="mt-2 space-y-2">
                                        {priorityOptions.map(option => (
                                            <div key={option.value} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`pri-${option.value}`}
                                                    checked={priorities.includes(option.value)}
                                                    onCheckedChange={() => handlePriorityChange(option.value)}
                                                />
                                                <Label htmlFor={`pri-${option.value}`} className="font-normal">{option.label}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <Separator />
                                <div>
                                    <Label className="text-base font-semibold">Sort By</Label>
                                    <RadioGroup value={sortOption} onValueChange={(val) => onSortChange(val as SortOption)} className="mt-2 space-y-1">
                                        {sortOptions.map(option => (
                                            <div key={option.value} className="flex items-center space-x-2">
                                                <RadioGroupItem value={option.value} id={`sort-${option.value}`} />
                                                <Label htmlFor={`sort-${option.value}`}>{option.label}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                            </div>
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
            </CardContent>
        </Card>
    )
  }


  return (
    <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
            <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10 w-full"
                />
            </div>
            <div className="w-full sm:w-auto">
                <Tabs value={status} onValueChange={(value) => onStatusChange(value as any)}>
                    <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                        <TabsTrigger value="on-hold">On Hold</TabsTrigger>
                        <TabsTrigger value="completed">Done</TabsTrigger>
                        <TabsTrigger value="canceled">Canceled</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            <div className="flex w-full sm:w-auto items-center gap-2 sm:gap-4 flex-wrap">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full flex-1 sm:w-auto justify-between min-w-[180px]">
                        {getCategoryLabel()}
                        <ListTodo className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                     {categoryOptions.map(option => (
                        <DropdownMenuCheckboxItem
                            key={option.value}
                            checked={categories.includes(option.value)}
                            onSelect={(e) => {
                                e.preventDefault();
                                handleCategoryChange(option.value)
                            }}
                        >
                            {option.label}
                        </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full flex-1 sm:w-auto justify-between min-w-[180px]">
                        {getPriorityLabel()}
                        <Filter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                     {priorityOptions.map(option => (
                        <DropdownMenuCheckboxItem
                            key={option.value}
                            checked={priorities.includes(option.value)}
                            onSelect={(e) => {
                                e.preventDefault();
                                handlePriorityChange(option.value)
                            }}
                        >
                            {option.label}
                        </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full flex-1 sm:w-auto justify-between min-w-[180px]">
                        Sort by: {selectedSortLabel}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Sort Tasks By</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={sortOption} onValueChange={(val) => onSortChange(val as SortOption)}>
                        {sortOptions.map(option => (
                        <DropdownMenuRadioItem key={option.value} value={option.value}>{option.label}</DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </CardContent>
    </Card>
  );
}

    