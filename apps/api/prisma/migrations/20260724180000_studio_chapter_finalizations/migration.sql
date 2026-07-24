ALTER TYPE "studio_chapter_revision_status"
  ADD VALUE IF NOT EXISTS 'finalized';

ALTER TYPE "studio_chapter_revision_status"
  ADD VALUE IF NOT EXISTS 'superseded';

CREATE TYPE "studio_chapter_finalization_status" AS ENUM ('finalized');

CREATE TYPE "studio_finalization_task_status" AS ENUM (
  'pending',
  'completed',
  'failed'
);

CREATE TABLE "studio_chapter_final_pointers" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "project_id" UUID NOT NULL,
  "chapter_number" INTEGER NOT NULL,
  "revision_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "studio_chapter_final_pointers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "studio_chapter_finalizations" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "project_id" UUID NOT NULL,
  "revision_id" UUID NOT NULL,
  "chapter_number" INTEGER NOT NULL,
  "status" "studio_chapter_finalization_status" NOT NULL DEFAULT 'finalized',
  "summary_status" "studio_finalization_task_status" NOT NULL DEFAULT 'pending',
  "index_status" "studio_finalization_task_status" NOT NULL DEFAULT 'pending',
  "summary" TEXT,
  "error" TEXT,
  "finalized_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "studio_chapter_finalizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_chapter_final_pointers_revision_id_key"
  ON "studio_chapter_final_pointers"("revision_id");

CREATE UNIQUE INDEX "studio_chapter_final_pointers_project_id_chapter_number_key"
  ON "studio_chapter_final_pointers"("project_id", "chapter_number");

CREATE UNIQUE INDEX "studio_chapter_finalizations_revision_id_key"
  ON "studio_chapter_finalizations"("revision_id");

CREATE INDEX "studio_chapter_finalizations_project_id_chapter_number_finalized_at_idx"
  ON "studio_chapter_finalizations"("project_id", "chapter_number", "finalized_at" DESC);

ALTER TABLE "studio_chapter_final_pointers"
  ADD CONSTRAINT "studio_chapter_final_pointers_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "studio_chapter_final_pointers"
  ADD CONSTRAINT "studio_chapter_final_pointers_revision_id_fkey"
  FOREIGN KEY ("revision_id") REFERENCES "studio_chapter_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "studio_chapter_finalizations"
  ADD CONSTRAINT "studio_chapter_finalizations_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "studio_chapter_finalizations"
  ADD CONSTRAINT "studio_chapter_finalizations_revision_id_fkey"
  FOREIGN KEY ("revision_id") REFERENCES "studio_chapter_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
