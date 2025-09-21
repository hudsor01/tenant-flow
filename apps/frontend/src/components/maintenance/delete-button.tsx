'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Trash2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceApi } from '@/lib/api-client'
import { toast } from 'sonner'

interface DeleteMaintenanceButtonProps {
  maintenance: {
    id: string
    title: string
  }
}

export function DeleteMaintenanceButton({ maintenance }: DeleteMaintenanceButtonProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => maintenanceApi.remove(maintenance.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
      queryClient.invalidateQueries({ queryKey: ['maintenance-stats'] })
      toast.success('Maintenance request deleted successfully')
      setOpen(false)
    },
    onError: (error) => {
      toast.error(`Failed to delete request: ${error.message}`)
    }
  })

  const handleDelete = () => {
    deleteMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2 text-[var(--color-system-red)] hover:text-[var(--color-system-red-85)]">
          <Trash2 className="size-4" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Maintenance Request</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this maintenance request? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-[var(--color-label-secondary)]">
            <strong>Request:</strong> {maintenance.title}
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}