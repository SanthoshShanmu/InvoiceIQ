export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          vendor: string
          invoice_number: string | null
          issue_date: string
          due_date: string
          amount: number
          tax: number | null
          currency: string
          status: string
          category: string | null
          notes: string | null
          file_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          vendor: string
          invoice_number?: string | null
          issue_date: string
          due_date: string
          amount: number
          tax?: number | null
          currency?: string
          status?: string
          category?: string | null
          notes?: string | null
          file_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          vendor?: string
          invoice_number?: string | null
          issue_date?: string
          due_date?: string
          amount?: number
          tax?: number | null
          currency?: string
          status?: string
          category?: string | null
          notes?: string | null
          file_path?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      account_connections: {
        Row: {
          id: string
          user_id: string
          provider: string
          credentials: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          credentials: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          credentials?: Json
          created_at?: string
          updated_at?: string
        }
      }
      payment_records: {
        Row: {
          id: string
          invoice_id: string
          amount: number
          payment_date: string
          payment_method: string
          stripe_payment_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          amount: number
          payment_date: string
          payment_method: string
          stripe_payment_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          amount?: number
          payment_date?: string
          payment_method?: string
          stripe_payment_id?: string | null
          created_at?: string
        }
      }
      reminders: {
        Row: {
          id: string
          invoice_id: string
          reminder_date: string
          status: string
          message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          reminder_date: string
          status?: string
          message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          reminder_date?: string
          status?: string
          message?: string | null
          created_at?: string
        }
      }
    }
  }
}