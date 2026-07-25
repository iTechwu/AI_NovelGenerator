ALTER TABLE "studio_chapter_finalizations"
  ADD COLUMN "fact_snapshot_recorded" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "studio_finalization_fact_snapshots" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "finalization_id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "source_fact_id" UUID NOT NULL,
  "fact_type" VARCHAR(80) NOT NULL,
  "subject" VARCHAR(200) NOT NULL,
  "predicate" VARCHAR(200) NOT NULL,
  "value" TEXT NOT NULL,
  "effective_chapter" INTEGER NOT NULL,
  "status" "studio_fact_status" NOT NULL,
  "schema_version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "studio_finalization_fact_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_finalization_fact_snapshots_finalization_id_source_fact_id_key"
  ON "studio_finalization_fact_snapshots"("finalization_id", "source_fact_id");
CREATE INDEX "studio_finalization_fact_snapshots_project_id_finalization_id_idx"
  ON "studio_finalization_fact_snapshots"("project_id", "finalization_id");

ALTER TABLE "studio_finalization_fact_snapshots"
  ADD CONSTRAINT "studio_finalization_fact_snapshots_finalization_id_fkey"
  FOREIGN KEY ("finalization_id") REFERENCES "studio_chapter_finalizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "studio_finalization_fact_snapshots"
  ADD CONSTRAINT "studio_finalization_fact_snapshots_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
