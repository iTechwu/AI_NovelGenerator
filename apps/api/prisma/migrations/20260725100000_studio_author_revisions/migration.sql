-- Author-created chapter revisions have no Python generation run. PostgreSQL
-- preserves the existing unique index while allowing multiple NULL run IDs.
ALTER TABLE "studio_chapter_revisions"
  ALTER COLUMN "run_id" DROP NOT NULL;
