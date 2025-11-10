// Direct Supabase client for frontend
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://gjtkdrrvnffrmzigdqyp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdGtkcnJ2bmZmcm16aWdkcXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NzcyMjcsImV4cCI6MjA3ODM1MzIyN30.IlE2yODTRQCl29OlwuZ-CtMxkg1OSPpSEqQVl-X0DtA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Helper functions
export async function signUp(email, password, userData) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData
    }
  })
  return { data, error }
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email)
  return { data, error }
}
