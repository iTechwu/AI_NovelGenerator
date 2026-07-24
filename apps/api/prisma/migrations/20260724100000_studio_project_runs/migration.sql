-- Persistent NestJS source of truth for the M0 studio vertical slice.
CREATE TYPE "studio_generation_run_status" AS ENUM ('queued', 'running', 'succeeded', 'failed');

CREATE TABLE "studio_projects" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "owner_id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "format" VARCHAR(20) NOT NULL DEFAULT 'novel',
    "genre" VARCHAR(80) NOT NULL,
    "premise" TEXT NOT NULL,
    "chapter_count" INTEGER NOT NULL,
    "target_words_per_chapter" INTEGER NOT NULL,
    "guidance" TEXT NOT NULL DEFAULT '',
    "generate_outline" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "studio_projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "studio_generation_runs" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "status" "studio_generation_run_status" NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "current_step" VARCHAR(255) NOT NULL DEFAULT 'Queued for generation',
    "architecture" TEXT,
    "outline" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "studio_generation_runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "studio_generation_runs_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "studio_projects_owner_id_created_at_idx" ON "studio_projects"("owner_id", "created_at" DESC);
CREATE INDEX "studio_generation_runs_project_id_created_at_idx" ON "studio_generation_runs"("project_id", "created_at" DESC);
CREATE INDEX "studio_generation_runs_status_updated_at_idx" ON "studio_generation_runs"("status", "updated_at" DESC);
