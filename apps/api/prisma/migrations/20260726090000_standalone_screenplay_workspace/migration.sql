-- Standalone screenplay projects have their own scene plan and revision history.
-- They intentionally do not reference adaptation snapshots or source chapters.
CREATE TABLE "studio_standalone_screenplay_scenes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,
    "episode_number" SMALLINT NOT NULL,
    "scene_number" SMALLINT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "synopsis" TEXT NOT NULL DEFAULT '',
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "studio_standalone_screenplay_scenes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "studio_standalone_screenplay_revisions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,
    "scene_id" UUID NOT NULL,
    "version" SMALLINT NOT NULL,
    "content" TEXT NOT NULL,
    "content_hash" CHAR(64) NOT NULL,
    "word_count" INTEGER NOT NULL,
    "edit_summary" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "studio_standalone_screenplay_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_standalone_screenplay_scenes_project_id_episode_number_scene_number_key"
ON "studio_standalone_screenplay_scenes"("project_id", "episode_number", "scene_number");
CREATE INDEX "studio_standalone_screenplay_scenes_project_id_episode_number_scene_number_idx"
ON "studio_standalone_screenplay_scenes"("project_id", "episode_number", "scene_number");
CREATE UNIQUE INDEX "studio_standalone_screenplay_revisions_scene_id_version_key"
ON "studio_standalone_screenplay_revisions"("scene_id", "version");
CREATE INDEX "studio_standalone_screenplay_revisions_project_id_created_at_idx"
ON "studio_standalone_screenplay_revisions"("project_id", "created_at" DESC);

ALTER TABLE "studio_standalone_screenplay_scenes"
ADD CONSTRAINT "studio_standalone_screenplay_scenes_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "studio_standalone_screenplay_revisions"
ADD CONSTRAINT "studio_standalone_screenplay_revisions_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "studio_standalone_screenplay_revisions"
ADD CONSTRAINT "studio_standalone_screenplay_revisions_scene_id_fkey"
FOREIGN KEY ("scene_id") REFERENCES "studio_standalone_screenplay_scenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
