import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Ban, Save } from "lucide-react"

const cancelTaskFormSchema = z.object({
  note: z.string().min(10, { message: "Please provide a brief reason (at least 10 characters)." }),
})

type CancelTaskFormValues = z.infer<typeof cancelTaskFormSchema>

interface CancelTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCancelTask: (note: string) => void
  taskTitle: string
}

export function CancelTaskDialog({ open, onOpenChange, onCancelTask, taskTitle }: CancelTaskDialogProps) {
  const form = useForm<CancelTaskFormValues>({
    resolver: zodResolver(cancelTaskFormSchema),
    defaultValues: {
      note: "",
    },
  })

  React.useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  function onSubmit(data: CancelTaskFormValues) {
    onCancelTask(data.note)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Task: "{taskTitle}"</DialogTitle>
          <DialogDescription>
            Please provide a brief reason for canceling this task. This helps with future planning and tracking.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cancellation Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Project scope changed, no longer necessary."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Go Back
              </Button>
              <Button type="submit" variant="destructive">
                <Ban className="mr-2 h-4 w-4" />
                Confirm Cancellation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

    