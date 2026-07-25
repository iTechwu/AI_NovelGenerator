-- PRD P13: surface adaptation state changes through the project event stream.
ALTER TYPE "studio_project_event_type" ADD VALUE IF NOT EXISTS 'adaptation_status';
