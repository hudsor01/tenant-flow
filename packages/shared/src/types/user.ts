// Centralized User interface for workspace-wide usage
import { Role } from './role'

export interface User {
  id: string
  supabaseId: string
  email: string
  name: string
  role: Role
}
