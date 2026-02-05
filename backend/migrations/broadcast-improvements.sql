-- Migration: Broadcast Improvements
-- Date: 2024
-- Description: Add scheduling, time window, deduplication, and history features to broadcasts

-- Add new columns to broadcasts table
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo';
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS time_window_start VARCHAR(5);
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS time_window_end VARCHAR(5);
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS current_index INTEGER DEFAULT 0;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS enable_deduplication BOOLEAN DEFAULT FALSE;

-- Create broadcast_history table for deduplication
CREATE TABLE IF NOT EXISTS broadcast_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    broadcast_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast lookup on deduplication queries
CREATE INDEX IF NOT EXISTS idx_broadcast_history_lookup
ON broadcast_history(user_id, broadcast_name, contact_phone);

-- Create index for scheduled broadcasts lookup
CREATE INDEX IF NOT EXISTS idx_broadcasts_scheduled
ON broadcasts(status, scheduled_at)
WHERE status = 'scheduled';

-- Create index for paused broadcasts lookup
CREATE INDEX IF NOT EXISTS idx_broadcasts_paused
ON broadcasts(status)
WHERE status = 'paused';
