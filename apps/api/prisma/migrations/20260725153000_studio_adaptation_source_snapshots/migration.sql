CREATE TYPE "studio_adaptation_target_format" AS ENUM ('series', 'short_drama');
CREATE TYPE "studio_adaptation_status" AS ENUM (
  'brief_draft',
  'blueprint_review',
  'scene_planning',
  'script_writing',
  'review_ready',
  'deliverable'
);

CREATE TABLE "studio_adaptation_projects" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "owner_id" UUID NOT NULL,
  "source_project_id" UUID NOT NULL,
  "target_format" "studio_adaptation_target_format" NOT NULL,
  "episode_count" INTEGER NOT NULL,
  "minutes_per_episode" INTEGER NOT NULL,
  "target_audience" VARCHAR(500) NOT NULL DEFAULT '',
  "adaptation_goal" TEXT NOT NULL DEFAULT '',
  "must_preserve" TEXT NOT NULL DEFAULT '',
  "rights_confirmed_at" TIMESTAMPTZ(6) NOT NULL,
  "status" "studio_adaptation_status" NOT NULL DEFAULT 'brief_draft',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "studio_adaptation_projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "studio_adaptation_source_snapshots" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "adaptation_id" UUID NOT NULL,
  "source_project_id" UUID NOT NULL,
  "source_project_title" VARCHAR(120) NOT NULL,
  "source_project_updated_at" TIMESTAMPTZ(6) NOT NULL,
  "source_chapter_count" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "studio_adaptation_source_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "studio_adaptation_source_chapters" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "snapshot_id" UUID NOT NULL,
  "source_revision_id" UUID NOT NULL,
  "chapter_number" INTEGER NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "content" TEXT NOT NULL,
  "content_hash" CHAR(64) NOT NULL,
  "word_count" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "studio_adaptation_source_chapters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_adaptation_source_snapshots_adaptation_id_key"
  ON "studio_adaptation_source_snapshots"("adaptation_id");
CREATE UNIQUE INDEX "studio_adaptation_source_chapters_snapshot_id_chapter_number_key"
  ON "studio_adaptation_source_chapters"("snapshot_id", "chapter_number");
CREATE INDEX "studio_adaptation_projects_owner_id_created_at_idx"
  ON "studio_adaptation_projects"("owner_id", "created_at" DESC);
CREATE INDEX "studio_adaptation_projects_source_project_id_created_at_idx"
  ON "studio_adaptation_projects"("source_project_id", "created_at" DESC);
CREATE INDEX "studio_adaptation_source_snapshots_source_project_id_created_at_idx"
  ON "studio_adaptation_source_snapshots"("source_project_id", "created_at" DESC);
CREATE INDEX "studio_adaptation_source_chapters_source_revision_id_idx"
  ON "studio_adaptation_source_chapters"("source_revision_id");

ALTER TABLE "studio_adaptation_projects"
  ADD CONSTRAINT "studio_adaptation_projects_source_project_id_fkey"
  FOREIGN KEY ("source_project_id") REFERENCES "studio_projects"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "studio_adaptation_source_snapshots"
  ADD CONSTRAINT "studio_adaptation_source_snapshots_adaptation_id_fkey"
  FOREIGN KEY ("adaptation_id") REFERENCES "studio_adaptation_projects"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "studio_adaptation_source_snapshots"
  ADD CONSTRAINT "studio_adaptation_source_snapshots_source_project_id_fkey"
  FOREIGN KEY ("source_project_id") REFERENCES "studio_projects"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "studio_adaptation_source_chapters"
  ADD CONSTRAINT "studio_adaptation_source_chapters_snapshot_id_fkey"
  FOREIGN KEY ("snapshot_id") REFERENCES "studio_adaptation_source_snapshots"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "studio_adaptation_source_chapters"
  ADD CONSTRAINT "studio_adaptation_source_chapters_source_revision_id_fkey"
  FOREIGN KEY ("source_revision_id") REFERENCES "studio_chapter_revisions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
