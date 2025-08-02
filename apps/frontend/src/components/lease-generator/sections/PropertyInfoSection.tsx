import type { UseFormReturn } from 'react-hook-form'
import { MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { LeaseFormData } from '@tenantflow/shared/types/lease-generator'

interface PropertyInfoSectionProps {
    form: UseFormReturn<LeaseFormData>
    supportedStates: { value: string; label: string }[]
}

export function PropertyInfoSection({ form, supportedStates }: PropertyInfoSectionProps) {
    const { register, formState: { errors }, setValue, watch } = form

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Property Information
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="propertyAddress">Property Address *</Label>
                        <Input
                            id="propertyAddress"
                            placeholder="123 Main Street"
                            {...register('propertyAddress')}
                            className={errors.propertyAddress ? 'border-red-500' : ''}
                        />
                        {errors.propertyAddress && (
                            <p className="text-sm text-red-500">
                                {errors.propertyAddress.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Input
                            id="city"
                            placeholder="Los Angeles"
                            {...register('city')}
                            className={errors.city ? 'border-red-500' : ''}
                        />
                        {errors.city && (
                            <p className="text-sm text-red-500">
                                {errors.city.message}
                            </p>
                        )}
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="state">State *</Label>
                        <Select
                            value={watch('state')}
                            onValueChange={(value: string) => setValue('state', value)}
                        >
                            <SelectTrigger className={errors.state ? 'border-red-500' : ''}>
                                <SelectValue placeholder="Select a state" />
                            </SelectTrigger>
                            <SelectContent>
                                {supportedStates.map((state) => (
                                    <SelectItem key={state.value} value={state.value}>
                                        {state.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.state && (
                            <p className="text-sm text-red-500">
                                {errors.state.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="zipCode">ZIP Code *</Label>
                        <Input
                            id="zipCode"
                            placeholder="90210"
                            {...register('zipCode')}
                            className={errors.zipCode ? 'border-red-500' : ''}
                        />
                        {errors.zipCode && (
                            <p className="text-sm text-red-500">
                                {errors.zipCode.message}
                            </p>
                        )}
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="propertyType">Property Type *</Label>
                        <Select
                            value={watch('propertyType')}
                            onValueChange={(value: 'house' | 'apartment' | 'condo' | 'townhouse' | 'duplex' | 'other') => setValue('propertyType', value)}
                        >
                            <SelectTrigger className={errors.propertyType ? 'border-red-500' : ''}>
                                <SelectValue placeholder="Select property type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="house">Single Family House</SelectItem>
                                <SelectItem value="apartment">Apartment</SelectItem>
                                <SelectItem value="condo">Condominium</SelectItem>
                                <SelectItem value="townhouse">Townhouse</SelectItem>
                                <SelectItem value="duplex">Duplex</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.propertyType && (
                            <p className="text-sm text-red-500">
                                {errors.propertyType.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bedrooms">Bedrooms</Label>
                        <Input
                            id="bedrooms"
                            type="number"
                            min="0"
                            placeholder="2"
                            {...register('bedrooms', { valueAsNumber: true })}
                        />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="bathrooms">Bathrooms</Label>
                        <Input
                            id="bathrooms"
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="1.5"
                            {...register('bathrooms', { valueAsNumber: true })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="squareFootage">Square Footage</Label>
                        <Input
                            id="squareFootage"
                            type="number"
                            min="0"
                            placeholder="1200"
                            {...register('squareFootage', { valueAsNumber: true })}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}