// TypeScript Type Definitions
// Generated from Intent Model

export type Topic = {
  id: string
  // Add fields based on entity: Discussion topic with title, description, votes, and status
  createdAt: Date
  updatedAt: Date
}

export type Vote = {
  id: string
  // Add fields based on entity: Member vote record for a specific topic
  createdAt: Date
  updatedAt: Date
}

export type MemberName = {
  id: string
  // Add fields based on entity: Hardcoded team member identity from dropdown picker
  createdAt: Date
  updatedAt: Date
}

export type Session = {
  id: string
  // Add fields based on entity: Past completed design jam session with done topics
  createdAt: Date
  updatedAt: Date
}

