-- PRD P13 来源更新复核: snapshot history (1:N) + current pointer.
-- Drop the 1:1 unique on adaptation_id so re-snapshot can append immutable rows.
DROP INDEX IF EXISTS "studio_adaptation_source_snapshots_adaptation_id_key";

-- Add the current-snapshot pointer on the adaptation.
ALTER TABLE "studio_adaptation_projects" ADD COLUMN "current_snapshot_id" UUID;

-- Backfill: each adaptation points at its single pre-existing snapshot.
UPDATE "studio_adaptation_projects" AS p
SET "current_snapshot_id" = s.id
FROM "studio_adaptation_source_snapshots" AS s
WHERE s."adaptation_id" = p.id;

-- 1:1 current pointer (multiple NULLs allowed).
CREATE UNIQUE INDEX "studio_adaptation_projects_current_snapshot_id_key"
  ON "studio_adaptation_projects"("current_snapshot_id");

-- FK current_snapshot_id -> snapshots.id
ALTER TABLE "studio_adaptation_projects"
  ADD CONSTRAINT "studio_adaptation_projects_current_snapshot_id_fkey"
  FOREIGN KEY ("current_snapshot_id") REFERENCES "studio_adaptation_source_snapshots"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Index for listing snapshot history by adaptation, newest first.
CREATE INDEX "studio_adaptation_source_snapshots_adaptation_id_created_at_idx"
  ON "studio_adaptation_source_snapshots"("adaptation_id", "created_at" DESC);
