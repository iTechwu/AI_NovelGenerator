CREATE TYPE "studio_project_import_status" AS ENUM ('previewed', 'imported');

CREATE TABLE "studio_project_imports" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "owner_id" UUID NOT NULL,
  "project_id" UUID,
  "filename" VARCHAR(255) NOT NULL,
  "source_format" VARCHAR(20) NOT NULL,
  "source_content_base64" TEXT NOT NULL,
  "content_hash" CHAR(64) NOT NULL,
  "preview" JSONB NOT NULL DEFAULT '{}',
  "status" "studio_project_import_status" NOT NULL DEFAULT 'previewed',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmed_at" TIMESTAMPTZ(6),

  CONSTRAINT "studio_project_imports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_project_imports_project_id_key"
  ON "studio_project_imports"("project_id");
CREATE INDEX "studio_project_imports_owner_id_created_at_idx"
  ON "studio_project_imports"("owner_id", "created_at" DESC);

ALTER TABLE "studio_project_imports"
  ADD CONSTRAINT "studio_project_imports_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
