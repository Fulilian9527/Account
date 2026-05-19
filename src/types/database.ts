export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string
          type: "income" | "expense"
          color: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          icon?: string
          type: "income" | "expense"
          color?: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          icon?: string
          type?: "income" | "expense"
          color?: string
          sort_order?: number
          created_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: "cash" | "bank" | "credit"
          balance: number
          currency: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: "cash" | "bank" | "credit"
          balance?: number
          currency?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: "cash" | "bank" | "credit"
          balance?: number
          currency?: string
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string
          category_id: string
          amount: number
          type: "income" | "expense"
          description: string
          date: string
          tags: string[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          category_id: string
          amount: number
          type: "income" | "expense"
          description?: string
          date: string
          tags?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          category_id?: string
          amount?: number
          type?: "income" | "expense"
          description?: string
          date?: string
          tags?: string[]
          created_at?: string
        }
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string
          amount: number
          period: "monthly" | "yearly"
          start_date: string
          end_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          amount: number
          period?: "monthly" | "yearly"
          start_date?: string
          end_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          amount?: number
          period?: "monthly" | "yearly"
          start_date?: string
          end_date?: string
          created_at?: string
        }
      }
      bills: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          category_id: string
          due_date: string
          repeat_mode: "none" | "monthly" | "yearly"
          status: "pending" | "paid" | "overdue"
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount: number
          category_id: string
          due_date: string
          repeat_mode?: "none" | "monthly" | "yearly"
          status?: "pending" | "paid" | "overdue"
          notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          category_id?: string
          due_date?: string
          repeat_mode?: "none" | "monthly" | "yearly"
          status?: "pending" | "paid" | "overdue"
          notes?: string
          created_at?: string
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          ai_provider: string
          ai_api_key: string
          ai_model: string
          theme: "light" | "dark" | "system"
          currency: string
          updated_at: string
          ai_base_url: string
          webdav_url: string
          webdav_username: string
          webdav_password: string
          webdav_path: string
        }
        Insert: {
          id?: string
          user_id: string
          ai_provider?: string
          ai_api_key?: string
          ai_model?: string
          theme?: "light" | "dark" | "system"
          currency?: string
          updated_at?: string
          ai_base_url?: string
          webdav_url?: string
          webdav_username?: string
          webdav_password?: string
          webdav_path?: string
        }
        Update: {
          id?: string
          user_id?: string
          ai_provider?: string
          ai_api_key?: string
          ai_model?: string
          theme?: "light" | "dark" | "system"
          currency?: string
          updated_at?: string
          ai_base_url?: string
          webdav_url?: string
          webdav_username?: string
          webdav_password?: string
          webdav_path?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
