import type { UseFormReturn } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, DollarSign } from 'lucide-react'
import type { LeaseFormData } from '@repo/shared'

interface LeaseTermsSectionProps {
    form: UseFormReturn<LeaseFormData>
}

export function LeaseTermsSection({ form }: LeaseTermsSectionProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Lease Terms & Payment
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="rentAmount" className="text-sm font-medium">
                            Monthly Rent Amount *
                        </Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="rentAmount"
                                type="number"
                                placeholder="1500"
                                className={`pl-9 ${form.formState.errors.rentAmount ? 'border-destructive' : ''}`}
                                {...form.register('rentAmount', { valueAsNumber: true })}
                            />
                        </div>
                        {form.formState.errors.rentAmount && (
                            <p className="text-destructive text-sm">
                                {form.formState.errors.rentAmount.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="securityDeposit" className="text-sm font-medium">
                            Security Deposit *
                        </Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="securityDeposit"
                                type="number"
                                placeholder="1500"
                                className={`pl-9 ${form.formState.errors.securityDeposit ? 'border-destructive' : ''}`}
                                {...form.register('securityDeposit', { valueAsNumber: true })}
                            />
                        </div>
                        {form.formState.errors.securityDeposit && (
                            <p className="text-destructive text-sm">
                                {form.formState.errors.securityDeposit.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="leaseStartDate" className="text-sm font-medium">
                            Lease Start Date *
                        </Label>
                        <Input
                            id="leaseStartDate"
                            type="date"
                            className={form.formState.errors.leaseStartDate ? 'border-destructive' : ''}
                            {...form.register('leaseStartDate')}
                        />
                        {form.formState.errors.leaseStartDate && (
                            <p className="text-destructive text-sm">
                                {form.formState.errors.leaseStartDate.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="leaseEndDate" className="text-sm font-medium">
                            Lease End Date *
                        </Label>
                        <Input
                            id="leaseEndDate"
                            type="date"
                            className={form.formState.errors.leaseEndDate ? 'border-destructive' : ''}
                            {...form.register('leaseEndDate')}
                        />
                        {form.formState.errors.leaseEndDate && (
                            <p className="text-destructive text-sm">
                                {form.formState.errors.leaseEndDate.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="paymentDueDate" className="text-sm font-medium">
                            Payment Due Date
                        </Label>
                        <Select
                            onValueChange={(value: string) =>
                                form.setValue('paymentDueDate', parseInt(value))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="1st of month" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                    <SelectItem key={day} value={day.toString()}>
                                        {day}
                                        {day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of month
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="paymentMethod" className="text-sm font-medium">
                            Payment Method
                        </Label>
                        <Select
                            onValueChange={(value: 'check' | 'online' | 'bank_transfer' | 'cash') =>
                                form.setValue('paymentMethod', value)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="check">Check</SelectItem>
                                <SelectItem value="online">Online Payment</SelectItem>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                <SelectItem value="cash">Cash</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="lateFeeAmount" className="text-sm font-medium">
                            Late Fee Amount
                        </Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="lateFeeAmount"
                                type="number"
                                placeholder="50"
                                className="pl-9"
                                {...form.register('lateFeeAmount', { valueAsNumber: true })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="lateFeeDays" className="text-sm font-medium">
                            Late Fee After (Days)
                        </Label>
                        <Input
                            id="lateFeeDays"
                            type="number"
                            placeholder="5"
                            {...form.register('lateFeeDays', { valueAsNumber: true })}
                        />
                    </div>
                </div>

                {form.watch('paymentMethod') === 'check' && (
                    <div className="space-y-2">
                        <Label htmlFor="paymentAddress" className="text-sm font-medium">
                            Payment Address
                        </Label>
                        <Input
                            id="paymentAddress"
                            placeholder="Where should checks be mailed?"
                            {...form.register('paymentAddress')}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}