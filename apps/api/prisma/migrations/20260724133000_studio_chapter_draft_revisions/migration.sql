CREATE TYPE "studio_generation_run_type" AS ENUM ('blueprint', 'chapter_draft');
CREATE TYPE "studio_chapter_revision_status" AS ENUM ('draft');

ALTER TABLE "studio_generation_runs"
  ADD COLUMN "chapter_plan_id" UUID,
  ADD COLUMN "type" "studio_generation_run_type" NOT NULL DEFAULT 'blueprint',
  ADD COLUMN "chapter_content" TEXT,
  ADD COLUMN "input_summary" TEXT,
  ADD COLUMN "model_config" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "studio_chapter_revisions" (
  "id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "chapter_plan_id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "chapter_number" INTEGER NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "studio_chapter_revision_status" NOT NULL DEFAULT 'draft',
  "content" TEXT NOT NULL,
  "word_count" INTEGER NOT NULL,
  "prompt_summary" TEXT NOT NULL DEFAULT '',
  "model_config" JSONB NOT NULL DEFAULT '{}',
  "source" VARCHAR(20) NOT NULL DEFAULT 'ai',
  "schema_version" INTEGER NOT NULL DEFAULT 1,
  "content_hash" CHAR(64) NOT NULL,
  "source_revision_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "studio_chapter_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "studio_chapter_revisions_run_id_key" UNIQUE ("run_id"),
  CONSTRAINT "studio_chapter_revisions_project_id_chapter_number_version_key"
    UNIQUE ("project_id", "chapter_number", "version")
);

CREATE INDEX "studio_generation_runs_chapter_plan_id_created_at_idx"
  ON "studio_generation_runs"("chapter_plan_id", "created_at" DESC);
CREATE INDEX "studio_chapter_revisions_project_id_chapter_number_created_at_idx"
  ON "studio_chapter_revisions"("project_id", "chapter_number", "created_at" DESC);

ALTER TABLE "studio_generation_runs"
  ADD CONSTRAINT "studio_generation_runs_chapter_plan_id_fkey"
  FOREIGN KEY ("chapter_plan_id") REFERENCES "studio_chapter_plans"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "studio_chapter_revisions"
  ADD CONSTRAINT "studio_chapter_revisions_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "studio_chapter_revisions_chapter_plan_id_fkey"
  FOREIGN KEY ("chapter_plan_id") REFERENCES "studio_chapter_plans"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "studio_chapter_revisions_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "studio_generation_runs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "studio_chapter_revisions_source_revision_id_fkey"
  FOREIGN KEY ("source_revision_id") REFERENCES "studio_chapter_revisions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
