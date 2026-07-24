-- Versioned, author-confirmed blueprints are the product source of truth for
-- architecture and directory output produced by the internal Python runtime.
CREATE TYPE "studio_blueprint_status" AS ENUM ('draft', 'confirmed');

CREATE TABLE "studio_blueprints" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,
    "run_id" UUID,
    "version" INTEGER NOT NULL,
    "status" "studio_blueprint_status" NOT NULL DEFAULT 'draft',
    "architecture" TEXT NOT NULL,
    "outline" TEXT NOT NULL DEFAULT '',
    "source" VARCHAR(20) NOT NULL DEFAULT 'ai',
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "content_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "studio_blueprints_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "studio_blueprints_project_id_version_key" UNIQUE ("project_id", "version"),
    CONSTRAINT "studio_blueprints_run_id_key" UNIQUE ("run_id"),
    CONSTRAINT "studio_blueprints_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "studio_blueprints_run_id_fkey"
      FOREIGN KEY ("run_id") REFERENCES "studio_generation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE "studio_projects" ADD COLUMN "current_blueprint_id" UUID;
ALTER TABLE "studio_projects" ADD CONSTRAINT "studio_projects_current_blueprint_id_key" UNIQUE ("current_blueprint_id");
ALTER TABLE "studio_projects" ADD CONSTRAINT "studio_projects_current_blueprint_id_fkey"
  FOREIGN KEY ("current_blueprint_id") REFERENCES "studio_blueprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "studio_blueprints_project_id_status_version_idx"
  ON "studio_blueprints"("project_id", "status", "version" DESC);
