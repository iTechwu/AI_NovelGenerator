CREATE TABLE "studio_chapter_draft_pointers" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "project_id" UUID NOT NULL,
  "chapter_number" INTEGER NOT NULL,
  "revision_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "studio_chapter_draft_pointers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "studio_chapter_draft_pointers_revision_id_key" UNIQUE ("revision_id"),
  CONSTRAINT "studio_chapter_draft_pointers_project_id_chapter_number_key"
    UNIQUE ("project_id", "chapter_number")
);

ALTER TABLE "studio_chapter_draft_pointers"
  ADD CONSTRAINT "studio_chapter_draft_pointers_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "studio_chapter_draft_pointers_revision_id_fkey"
  FOREIGN KEY ("revision_id") REFERENCES "studio_chapter_revisions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
