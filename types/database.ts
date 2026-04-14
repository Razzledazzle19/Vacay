export type Role = 'host' | 'cleaner'

export interface Profile {
  id: string
  role: Role
  full_name: string
  created_at: string
}

export interface Property {
  id: string
  owner_id: string
  name: string
  address: string
  created_at: string
}

export type JobStatus = 'pending' | 'in_progress' | 'completed'

export interface Job {
  id: string
  property_id: string
  cleaner_id: string | null
  status: JobStatus
  scheduled_date: string
  notes: string | null
  created_at: string
}
