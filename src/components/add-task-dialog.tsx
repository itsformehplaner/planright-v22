

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { format, setHours, setMinutes, parse, addHours } from "date-fns"
import { CalendarIcon, Save, X } from "lucide-react"
import { useForm } from "react-hook-form"
import * as z from "zod"

import type { Priority, Task, TaskCategory, Recurrence } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "./ui/checkbox"
import { Label } from "./ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group"
import { useMainLayout } from "./main-layout"

const recurrenceSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.coerce.number().min(1).optional().default(1),
  endDate: z.date().optional(),
  daysOfWeek: z.array(z.number()).optional(),
}).optional();

const taskFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters long." }),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  category: z.enum(['Work', 'Personal', 'Chore', 'Learning']),
  parentId: z.string().optional(),
  completionDate: z.date().optional(),
  trackDailyProgress: z.boolean().optional(),
  recurrence: recurrenceSchema,
})

export type TaskFormValues = z.infer<typeof taskFormSchema>

interface AddTaskDialogProps {
  children?: React.ReactNode
  task?: Task
  parentId?: string
  defaultDueDate?: Date;
  onTaskSave: (data: Omit<Task, "id" | "status" | "createdAt" | "projectId">) => void
  onTaskUpdate?: (data: Task) => void
  isEditing?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddTaskDialog({ children, task, parentId, defaultDueDate, onTaskSave, onTaskUpdate, isEditing: isEditingProp, open: externalOpen, onOpenChange: externalOnOpenChange }: AddTaskDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const { activeProject } = useMainLayout();

  const isControlled = externalOpen !== undefined && externalOnOpenChange !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? externalOnOpenChange : setInternalOpen;
  
  const isEditing = isEditingProp !== undefined ? isEditingProp : !!task;
  const title = isEditing ? "Edit Task" : parentId ? "Add Sub-task" : "Add Task";

  const defaultValues: Partial<TaskFormValues> = {
    title: task?.title || "",
    description: task?.description || "",
    dueDate: task?.dueDate || defaultDueDate,
    startTime: task?.startTime || (defaultDueDate ? "09:00" : ""),
    endTime: task?.endTime || (defaultDueDate ? "10:00" : ""),
    priority: task?.priority || "medium",
    category: task?.category || 'Work',
    parentId: task?.parentId || parentId,
    completionDate: task?.completionDate,
    trackDailyProgress: task?.trackDailyProgress || false,
    recurrence: task?.recurrence ? {
      ...task.recurrence,
      endDate: task.recurrence.endDate ? new Date(task.recurrence.endDate) : undefined,
    } : undefined,
  }

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues,
  })
  
  const watchRecurrence = form.watch("recurrence");
  const watchDueDate = form.watch("dueDate");
  const watchStartTime = form.watch("startTime");

  React.useEffect(() => {
    if (watchStartTime) {
      try {
        const [hours, minutes] = watchStartTime.split(':').map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
          const tempDate = new Date();
          tempDate.setHours(hours, minutes);
          const newEndDate = addHours(tempDate, 1);
          const endHours = String(newEndDate.getHours()).padStart(2, '0');
          const endMinutes = String(newEndDate.getMinutes()).padStart(2, '0');
          form.setValue('endTime', `${endHours}:${endMinutes}`);
        }
      } catch (e) {
        // Start time might be in an intermediate invalid state, do nothing
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchStartTime, form.setValue]);

  React.useEffect(() => {
    if (open) {
      form.reset({
        title: task?.title || '',
        description: task?.description || '',
        dueDate: task?.dueDate || defaultDueDate,
        startTime: task?.startTime || (defaultDueDate ? "09:00" : ""),
        endTime: task?.endTime || (defaultDueDate ? "10:00" : ""),
        priority: task?.priority || 'medium',
        category: task?.category || 'Work',
        parentId: task?.parentId || parentId,
        completionDate: task?.completionDate,
        trackDailyProgress: task?.trackDailyProgress || false,
        recurrence: task?.recurrence ? {
          ...task.recurrence,
          endDate: task.recurrence.endDate ? new Date(task.recurrence.endDate) : undefined,
        } : undefined,
      });
    }
  }, [open, task, parentId, form, defaultDueDate]);


  function onSubmit(data: TaskFormValues) {
    if (!activeProject) return; // Should not happen if button is disabled

    let finalDueDate: Date | undefined = data.dueDate;

    if (data.dueDate && data.startTime) {
        try {
            const time = parse(data.startTime, "HH:mm", new Date());
            const hours = time.getHours();
            const minutes = time.getMinutes();
            finalDueDate = setMinutes(setHours(data.dueDate, hours), minutes);
        } catch(e) {
            console.error("Invalid start time format", e);
        }
    }
    
    // Clear daysOfWeek if frequency is not weekly
    if (data.recurrence && data.recurrence.frequency !== 'weekly') {
      data.recurrence.daysOfWeek = undefined;
    }

    const taskData = { ...data, dueDate: finalDueDate, parentId: data.parentId || parentId };
    
    if (isEditing && task && onTaskUpdate) {
      onTaskUpdate({ ...task, ...taskData, status: data.trackDailyProgress ? 'in-progress' : task.status });
    } else {
      onTaskSave(taskData as Omit<Task, 'id' | 'status' | 'createdAt' | 'projectId'>);
    }
    form.reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild disabled={!activeProject}>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the details of your existing task." : "Fill out the form to add a new task to your list."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-6 -mr-6">
          <Form {...form}>
            <form id="task-form" onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Finalize project report" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add more details about the task..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col sm:col-span-1">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                             <FormControl>
                                <Button
                                  variant={"outline"}
                                  type="button"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                              />
                              <div className="p-2 border-t border-border">
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      type="button"
                                      className="w-full justify-center text-muted-foreground"
                                      onClick={() => field.onChange(undefined)}
                                  >
                                      <X className="mr-2 h-4 w-4" />
                                      Clear
                                  </Button>
                              </div>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                          <FormItem className="sm:col-span-1">
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                              <Input
                              type="time"
                              {...field}
                              disabled={!form.watch("dueDate")}
                              />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
                   <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                          <FormItem className="sm:col-span-1">
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                              <Input
                              type="time"
                              {...field}
                              disabled={!form.watch("dueDate")}
                              />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Work">Work</SelectItem>
                            <SelectItem value="Personal">Personal</SelectItem>
                            <SelectItem value="Chore">Chore</SelectItem>
                            <SelectItem value="Learning">Learning</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
               <FormField
                control={form.control}
                name="trackDailyProgress"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Track Daily Progress
                      </FormLabel>
                      <FormDescription>
                        Check this for habits or long tasks. This will set the task to "In-Progress".
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="link" className="p-0 -mb-2" type="button">Repeat</Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                   <div className="mt-4 p-4 border rounded-md space-y-4">
                      <FormField
                        control={form.control}
                        name="recurrence.frequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Frequency</FormLabel>
                            <Select onValueChange={(value) => field.onChange(value as Recurrence['frequency'])} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger disabled={!watchDueDate}>
                                  <SelectValue placeholder="Does not repeat" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                              </SelectContent>
                            </Select>
                             {!watchDueDate && <FormDescription>Set a due date to enable recurrence.</FormDescription>}
                          </FormItem>
                        )}
                      />
                      {watchRecurrence?.frequency && (
                        <>
                          <FormField
                            control={form.control}
                            name="recurrence.interval"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Repeat Every</FormLabel>
                                <div className="flex items-center gap-2">
                                  <FormControl>
                                    <Input type="number" min="1" {...field} className="w-20" />
                                  </FormControl>
                                  <span>{watchRecurrence.frequency.slice(0, -2)}{(field.value || 1) > 1 ? 's' : ''}</span>
                                </div>
                              </FormItem>
                            )}
                          />
                          {watchRecurrence.frequency === 'weekly' && (
                             <FormField
                                control={form.control}
                                name="recurrence.daysOfWeek"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Repeat On</FormLabel>
                                    <FormControl>
                                      <ToggleGroup
                                          type="multiple"
                                          variant="outline"
                                          value={field.value?.map(String) || []}
                                          onValueChange={(value) => field.onChange(value.map(Number))}
                                          className="flex-wrap justify-start"
                                      >
                                          <ToggleGroupItem value="0">S</ToggleGroupItem>
                                          <ToggleGroupItem value="1">M</ToggleGroupItem>
                                          <ToggleGroupItem value="2">T</ToggleGroupItem>
                                          <ToggleGroupItem value="3">W</ToggleGroupItem>
                                          <ToggleGroupItem value="4">T</ToggleGroupItem>
                                          <ToggleGroupItem value="5">F</ToggleGroupItem>
                                          <ToggleGroupItem value="6">S</ToggleGroupItem>
                                      </ToggleGroup>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                          )}
                           <FormField
                            control={form.control}
                            name="recurrence.endDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Ends On (Optional)</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                          variant={"outline"}
                                          type="button"
                                          className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                          )}
                                        >
                                          {field.value ? (
                                            format(field.value, "PPP")
                                          ) : (
                                            <span>Never</span>
                                          )}
                                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                      </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                          mode="single"
                                          selected={field.value}
                                          onSelect={field.onChange}
                                          disabled={{ before: watchDueDate || new Date() }}
                                          initialFocus
                                      />
                                  </PopoverContent>
                                </Popover>
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                      {watchRecurrence && (
                        <Button
                          variant="ghost"
                          type="button"
                          className="text-destructive hover:text-destructive"
                          onClick={() => form.setValue('recurrence', undefined)}
                        >
                          Remove Recurrence
                        </Button>
                      )}
                   </div>
                </CollapsibleContent>
              </Collapsible>
              {isEditing && task?.status === 'completed' && (
                <FormField
                  control={form.control}
                  name="completionDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Completion Date</FormLabel>
                      <Popover>
                         <PopoverTrigger asChild>
                           <FormControl>
                              <Button
                                variant={"outline"}
                                type="button"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                            <div className="p-2 border-t border-border">
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      type="button"
                                      className="w-full justify-center text-muted-foreground"
                                      onClick={() => field.onChange(undefined)}
                                  >
                                      <X className="mr-2 h-4 w-4" />
                                      Clear
                                  </Button>
                              </div>
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                         If you need to change when a task was completed.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </form>
          </Form>
        </div>
        <DialogFooter className="pt-4 border-t">
          <Button type="submit" form="task-form">
            <Save className="mr-2 h-4 w-4" />
            {isEditing ? "Save Changes" : "Save Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
