/**
 * Inspection Domain Types
 *
 * Types for the move-in/move-out inspection system.
 * These match the database schema for inspections, inspection_rooms, and inspection_photos.
 */

export interface InspectionPhoto {
  id: string
  inspection_room_id: string
  inspection_id: string
  storage_path: string
  file_name: string
  file_size: number | null
  mime_type: string
  caption: string | null
  uploaded_by: string | null
  created_at: string
  publicUrl?: string
}

export interface InspectionRoom {
  id: string
  inspection_id: string
  room_name: string
  room_type: string
  condition_rating: string
  notes: string | null
  created_at: string
  updated_at: string
  photos?: InspectionPhoto[]
}

export interface Inspection {
  id: string
  lease_id: string
  property_id: string
  unit_id: string | null
  owner_user_id: string
  inspection_type: 'move_in' | 'move_out'
  status: 'pending' | 'in_progress' | 'completed' | 'tenant_reviewing' | 'finalized'
  scheduled_date: string | null
  completed_at: string | null
  tenant_reviewed_at: string | null
  tenant_signature_data: string | null
  overall_condition: string | null
  owner_notes: string | null
  tenant_notes: string | null
  created_at: string
  updated_at: string
  rooms?: InspectionRoom[]
  property?: { name: string; address_line1: string } | null
  unit?: { name: string } | null
}

export interface InspectionListItem {
  id: string
  lease_id: string
  property_id: string
  inspection_type: 'move_in' | 'move_out'
  status: string
  scheduled_date: string | null
  completed_at: string | null
  created_at: string
  property_name: string
  unit_name: string | null
  room_count: number
}
