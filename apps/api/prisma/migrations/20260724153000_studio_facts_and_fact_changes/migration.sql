CREATE TYPE "studio_fact_status" AS ENUM ('confirmed', 'retired');
CREATE TYPE "studio_fact_change_operation" AS ENUM ('add', 'update', 'remove');
CREATE TYPE "studio_fact_change_status" AS ENUM ('proposed', 'accepted', 'rejected');

CREATE TABLE "studio_facts" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "project_id" UUID NOT NULL,
  "source_change_id" UUID,
  "fact_type" VARCHAR(80) NOT NULL,
  "subject" VARCHAR(200) NOT NULL,
  "predicate" VARCHAR(200) NOT NULL,
  "value" TEXT NOT NULL,
  "effective_chapter" INTEGER NOT NULL,
  "status" "studio_fact_status" NOT NULL DEFAULT 'confirmed',
  "schema_version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "studio_facts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "studio_facts_source_change_id_key" UNIQUE ("source_change_id")
);

CREATE TABLE "studio_fact_changes" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "project_id" UUID NOT NULL,
  "revision_id" UUID NOT NULL,
  "chapter_number" INTEGER NOT NULL,
  "fact_id" UUID,
  "operation" "studio_fact_change_operation" NOT NULL,
  "fact_type" VARCHAR(80) NOT NULL,
  "subject" VARCHAR(200) NOT NULL,
  "predicate" VARCHAR(200) NOT NULL,
  "proposed_value" TEXT NOT NULL DEFAULT '',
  "rationale" TEXT NOT NULL DEFAULT '',
  "evidence" TEXT NOT NULL DEFAULT '',
  "source" VARCHAR(20) NOT NULL DEFAULT 'ai',
  "status" "studio_fact_change_status" NOT NULL DEFAULT 'proposed',
  "resolved_value" TEXT,
  "resolved_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "studio_fact_changes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "studio_facts_project_id_status_effective_chapter_idx"
  ON "studio_facts"("project_id", "status", "effective_chapter");
CREATE INDEX "studio_facts_project_id_fact_type_subject_idx"
  ON "studio_facts"("project_id", "fact_type", "subject");
CREATE INDEX "studio_fact_changes_project_id_chapter_number_status_idx"
  ON "studio_fact_changes"("project_id", "chapter_number", "status");
CREATE INDEX "studio_fact_changes_revision_id_status_idx"
  ON "studio_fact_changes"("revision_id", "status");

ALTER TABLE "studio_facts"
  ADD CONSTRAINT "studio_facts_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "studio_fact_changes"
  ADD CONSTRAINT "studio_fact_changes_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "studio_fact_changes_revision_id_fkey"
  FOREIGN KEY ("revision_id") REFERENCES "studio_chapter_revisions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "studio_fact_changes_fact_id_fkey"
  FOREIGN KEY ("fact_id") REFERENCES "studio_facts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "studio_facts"
  ADD CONSTRAINT "studio_facts_source_change_id_fkey"
  FOREIGN KEY ("source_change_id") REFERENCES "studio_fact_changes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
