-- Structured chapter plans are the author-confirmed input for all future draft runs.
CREATE TYPE "studio_chapter_plan_status" AS ENUM ('draft', 'confirmed');

CREATE TABLE "studio_chapter_plans" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,
    "blueprint_id" UUID NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "studio_chapter_plan_status" NOT NULL DEFAULT 'draft',
    "title" VARCHAR(200) NOT NULL,
    "goal" TEXT NOT NULL,
    "conflict" TEXT NOT NULL DEFAULT '',
    "characters" JSONB NOT NULL DEFAULT '[]',
    "location" VARCHAR(200) NOT NULL DEFAULT '',
    "time_constraint" VARCHAR(500) NOT NULL DEFAULT '',
    "foreshadowing" TEXT NOT NULL DEFAULT '',
    "hook" TEXT NOT NULL DEFAULT '',
    "source" VARCHAR(20) NOT NULL DEFAULT 'author',
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "content_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "studio_chapter_plans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "studio_chapter_plans_project_id_chapter_number_version_key"
      UNIQUE ("project_id", "chapter_number", "version"),
    CONSTRAINT "studio_chapter_plans_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "studio_chapter_plans_blueprint_id_fkey"
      FOREIGN KEY ("blueprint_id") REFERENCES "studio_blueprints"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "studio_chapter_plans_project_id_chapter_number_version_idx"
  ON "studio_chapter_plans"("project_id", "chapter_number", "version" DESC);
CREATE INDEX "studio_chapter_plans_project_id_status_chapter_number_idx"
  ON "studio_chapter_plans"("project_id", "status", "chapter_number");
