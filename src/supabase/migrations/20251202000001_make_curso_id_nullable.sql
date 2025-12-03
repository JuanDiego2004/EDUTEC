-- Migration: Make curso_id nullable in matriculas table
-- Date: 2025-12-02
-- Description: Allow creating matriculas without a specific course (Generic Enrollment)

BEGIN;

-- 1. Make curso_id nullable
ALTER TABLE matriculas ALTER COLUMN curso_id DROP NOT NULL;

COMMIT;
