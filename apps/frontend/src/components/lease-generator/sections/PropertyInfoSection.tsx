import React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { LeaseGeneratorForm } from '@/types/lease-generator'

interface PropertyInfoSectionProps {
    form: UseFormReturn<LeaseGeneratorForm>
    supportedStates: Array<{ value: string; label: string }>
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
                        <Label htmlFor="propertyCity">City *</Label>
                        <Input
                            id="propertyCity"
                            placeholder="Los Angeles"
                            {...register('propertyCity')}
                            className={errors.propertyCity ? 'border-red-500' : ''}
                        />
                        {errors.propertyCity && (
                            <p className="text-sm text-red-500">
                                {errors.propertyCity.message}
                            </p>
                        )}
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="propertyState">State *</Label>
                        <Select
                            value={watch('propertyState')}
                            onValueChange={(value) => setValue('propertyState', value)}
                        >
                            <SelectTrigger className={errors.propertyState ? 'border-red-500' : ''}>
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
                        {errors.propertyState && (
                            <p className="text-sm text-red-500">
                                {errors.propertyState.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="propertyZip">ZIP Code *</Label>
                        <Input
                            id="propertyZip"
                            placeholder="90210"
                            {...register('propertyZip')}
                            className={errors.propertyZip ? 'border-red-500' : ''}
                        />
                        {errors.propertyZip && (
                            <p className="text-sm text-red-500">
                                {errors.propertyZip.message}
                            </p>
                        )}
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="propertyType">Property Type *</Label>
                        <Select
                            value={watch('propertyType')}
                            onValueChange={(value) => setValue('propertyType', value)}
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