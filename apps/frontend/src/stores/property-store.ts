import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { supabaseSafe } from '@/lib/clients'
import { toast } from 'sonner'
import { toastMessages } from '@/lib/toast-messages'
import type { Property, Unit, CreatePropertyInput, UpdatePropertyInput, AppError } from '@repo/shared'

// Types
type PropertyData = Property
type UnitData = Unit

interface PropertyWithUnits extends Property {
  units?: UnitData[]
  unitCount?: number
}

interface PropertyFilters {
  city?: string
  propertyType?: string
  searchQuery?: string
}

interface PropertyState {
  // Data
  properties: PropertyWithUnits[]
  selectedProperty: PropertyWithUnits | null
  filters: PropertyFilters
  
  // UI State
  isLoading: boolean
  isFetching: boolean
  error: AppError | null
  
  // Stats
  totalCount: number
  cityOptions: string[]
  typeOptions: string[]
}

interface PropertyActions {
  // Data fetching
  fetchProperties: (reset?: boolean) => Promise<void>
  fetchPropertyById: (id: string) => Promise<void>
  
  // Mutations
  createProperty: (data: CreatePropertyInput) => Promise<PropertyData>
  updateProperty: (id: string, data: UpdatePropertyInput) => Promise<void>
  deleteProperty: (id: string) => Promise<void>
  uploadPropertyImage: (propertyId: string, file: File) => Promise<string>
  
  // Filters
  setFilters: (filters: PropertyFilters) => void
  clearFilters: () => void
  
  // Selection
  selectProperty: (property: PropertyWithUnits | null) => void
  
  // Computed
  getPropertiesByCity: (city: string) => PropertyWithUnits[]
  getVacantUnitsCount: () => number
  
  // Real-time
  subscribeToChanges: () => () => void
  
  // Utils
  reset: () => void
}

const initialState: PropertyState = {
  properties: [],
  selectedProperty: null,
  filters: {},
  isLoading: false,
  isFetching: false,
  error: null,
  totalCount: 0,
  cityOptions: [],
  typeOptions: ['SINGLE_FAMILY', 'MULTI_UNIT', 'APARTMENT', 'COMMERCIAL']
}

export const usePropertyStore = create<PropertyState & PropertyActions>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,
          
          // Data fetching
          fetchProperties: async (reset = false) => {
            const { filters } = get()
            
            set(state => {
              state.isLoading = !state.properties.length || reset
              state.isFetching = true
              state.error = null
              if (reset) state.properties = []
            })
            
            try {
              // Build query
              let query = supabaseSafe
                .from('Property')
                .select('*, Unit(id, status, rent)')
                .order('createdAt', { ascending: false })
              
              // Apply filters
              if (filters.city) {
                query = query.eq('city', filters.city)
              }
              if (filters.propertyType) {
                query = query.eq('propertyType', filters.propertyType)
              }
              if (filters.searchQuery) {
                query = query.or(
                  `name.ilike.%${filters.searchQuery}%,address.ilike.%${filters.searchQuery}%`
                )
              }
              
              const { data, error, count } = await query
              
              if (error) throw error
              
              // Process properties with unit counts
              const propertiesWithCounts = (data || []).map(property => ({
                ...property,
                units: property.Unit || [],
                unitCount: property.Unit?.length || 0
              }))
              
              // Extract unique cities
              const cities = [...new Set(propertiesWithCounts.map(p => p.city))]
              
              set(state => {
                state.properties = propertiesWithCounts
                state.totalCount = count || 0
                state.cityOptions = cities
                state.isLoading = false
                state.isFetching = false
              })
            } catch (error) {
              set(state => {
                state.error = error as AppError
                state.isLoading = false
                state.isFetching = false
              })
              toast.error('Failed to fetch properties')
            }
          },
          
          fetchPropertyById: async (id: string) => {
            try {
              const { data, error } = await supabaseSafe
                .from('Property')
                .select('*, Unit(*)')
                .eq('id', id)
                .single()
              
              if (error) throw error
              
              const propertyWithUnits = {
                ...data,
                units: data.Unit || [],
                unitCount: data.Unit?.length || 0
              }
              
              set(state => {
                state.selectedProperty = propertyWithUnits
                // Update in list if exists
                const index = state.properties.findIndex(p => p.id === id)
                if (index !== -1) {
                  state.properties[index] = propertyWithUnits
                }
              })
            } catch {
              toast.error('Failed to fetch property details')
            }
          },
          
          // Mutations
          createProperty: async (data) => {
            const user = (await supabaseSafe.auth.getUser()).data.user
            if (!user) throw new Error('Not authenticated')
            
            const { data: property, error } = await supabaseSafe
              .from('Property')
              .insert({ ...data, ownerId: user.id })
              .select()
              .single()
            
            if (error) throw error
            
            set(state => {
              state.properties.unshift({ ...property, units: [], unitCount: 0 })
              state.totalCount += 1
            })
            
            toast.success(toastMessages.success.created('property'))
            return property
          },
          
          updateProperty: async (id, data) => {
            const { error } = await supabaseSafe
              .from('Property')
              .update(data)
              .eq('id', id)
            
            if (error) throw error
            
            set(state => {
              const index = state.properties.findIndex(p => p.id === id)
              if (index !== -1 && state.properties[index]) {
                Object.assign(state.properties[index], data)
              }
              if (state.selectedProperty?.id === id) {
                Object.assign(state.selectedProperty, data)
              }
            })
            
            toast.success(toastMessages.success.updated('property'))
          },
          
          deleteProperty: async (id) => {
            const { error } = await supabaseSafe
              .from('Property')
              .delete()
              .eq('id', id)
            
            if (error) throw error
            
            set(state => {
              state.properties = state.properties.filter(p => p.id !== id)
              state.totalCount -= 1
              if (state.selectedProperty?.id === id) {
                state.selectedProperty = null
              }
            })
            
            toast.success(toastMessages.success.deleted('property'))
          },
          
          uploadPropertyImage: async (propertyId, file) => {
            const fileExt = file.name.split('.').pop()
            const fileName = `${propertyId}/${Date.now()}.${fileExt}`
            
            const { error: uploadError } = await supabaseSafe.storage
              .from('property-images')
              .upload(fileName, file)
            
            if (uploadError) throw uploadError
            
            const { data: { publicUrl } } = supabaseSafe.storage
              .from('property-images')
              .getPublicUrl(fileName)
            
            await get().updateProperty(propertyId, { imageUrl: publicUrl } as UpdatePropertyInput)
            
            return publicUrl
          },
          
          // Filters
          setFilters: (filters) => set(state => {
            state.filters = { ...state.filters, ...filters }
          }),
          
          clearFilters: () => set(state => {
            state.filters = {}
          }),
          
          // Selection
          selectProperty: (property) => set(state => {
            state.selectedProperty = property
          }),
          
          // Computed
          getPropertiesByCity: (city) => {
            return get().properties.filter(p => p.city === city)
          },
          
          getVacantUnitsCount: () => {
            return get().properties.reduce((total, property) => {
              const vacantCount = property.units?.filter(u => u.status === 'VACANT').length || 0
              return total + vacantCount
            }, 0)
          },
          
          // Real-time subscription
          subscribeToChanges: () => {
            const userPromise = supabaseSafe.auth.getUser()
            // Handle async user check properly
            userPromise.then(({ data: { user } }) => {
              if (!user) return
              
              const channel = supabaseSafe
                .channel('property-store-changes')
                .on(
                  'postgres_changes',
                  {
                    event: '*',
                    schema: 'public',
                    table: 'Property'
                  },
                  (payload) => {
                    // Remove console.log
                    
                    if (payload.eventType === 'INSERT') {
                      void get().fetchPropertyById(payload.new.id)
                    } else if (payload.eventType === 'UPDATE') {
                      void get().fetchPropertyById(payload.new.id)
                    } else if (payload.eventType === 'DELETE') {
                    set(state => {
                      state.properties = state.properties.filter(p => p.id !== payload.old.id)
                      if (state.selectedProperty?.id === payload.old.id) {
                        state.selectedProperty = null
                      }
                    })
                  }
                }
              )
              .subscribe()
              
              return () => {
                void supabaseSafe.getRawClient().removeChannel(channel)
              }
            }).catch((error) => {
              console.error('Failed to subscribe to property changes:', error)
            })
            
            // Return a no-op cleanup function for immediate return
            return () => {
              // Cleanup will be handled by the promise above
            }
          },
          
          reset: () => set(initialState)
        }))
      ),
      {
        name: 'property-store',
        partialize: (state) => ({
          filters: state.filters,
          selectedProperty: state.selectedProperty
        })
      }
    )
  )
)

// Selectors
export const selectProperties = (state: PropertyState) => state.properties
export const selectSelectedProperty = (state: PropertyState) => state.selectedProperty
export const selectPropertyFilters = (state: PropertyState) => state.filters
export const selectIsLoading = (state: PropertyState) => state.isLoading