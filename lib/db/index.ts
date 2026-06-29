// Thin data-access layer. Everything that touches Supabase lives under lib/db
// so the storage backend can be swapped without touching UI or server actions.
// Import from '@/lib/db', never from '@supabase/*' directly in app code.

export * from './seasons'
export * from './stats'
export * from './career'
export * from './players'
export * from './games'
export * from './lineups'
export * from './gameStats'
export * from './atbats'
export * from './commit'
export * from './lineupLab'
export * from './awards'
export * from './eligibility'
export * from './records'
export * from './milestones'
