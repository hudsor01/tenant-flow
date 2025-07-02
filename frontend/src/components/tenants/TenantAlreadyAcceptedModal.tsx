import { motion } from 'framer-motion'
import { CheckCircle, Users, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useNavigate } from 'react-router-dom'

interface TenantAlreadyAcceptedModalProps {
  isOpen: boolean
  onClose: () => void
  tenantName: string
  tenantEmail: string
}

export default function TenantAlreadyAcceptedModal({
  isOpen,
  onClose,
  tenantName,
  tenantEmail
}: TenantAlreadyAcceptedModalProps) {
  const navigate = useNavigate()

  const handleGoToTenants = () => {
    navigate('/tenants')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <DialogTitle className="text-xl font-bold text-center">
            Tenant Already Accepted!
          </DialogTitle>
          <DialogDescription className="text-center space-y-2">
            <p>
              <strong>{tenantName}</strong> ({tenantEmail}) has already accepted their invitation and is now an active tenant.
            </p>
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4"
        >
          <div className="flex items-start space-x-3">
            <Users className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">You can find them here:</h4>
              <p className="text-sm text-blue-700 mt-1">
                Go to <strong>Tenants</strong> in the sidebar to view their profile, lease details, and manage their account.
              </p>
            </div>
          </div>
        </motion.div>

        <DialogFooter className="flex space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
          <Button
            type="button"
            onClick={handleGoToTenants}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Go to Tenants
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
