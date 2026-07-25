-- CreateEnum
CREATE TYPE "studio_screenplay_revision_source" AS ENUM ('author', 'ai');

-- CreateTable
CREATE TABLE "studio_screenplay_scene_revisions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "adaptation_id" UUID NOT NULL,
    "scene_plan_id" UUID NOT NULL,
    "episode_number" SMALLINT NOT NULL,
    "scene_number" SMALLINT NOT NULL,
    "source" "studio_screenplay_revision_source" NOT NULL DEFAULT 'author',
    "source_revision_id" UUID,
    "version" SMALLINT NOT NULL,
    "content" TEXT NOT NULL,
    "content_hash" CHAR(64) NOT NULL,
    "word_count" INTEGER NOT NULL,
    "edit_summary" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_screenplay_scene_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "studio_screenplay_scene_revisions_scene_plan_id_scene_number_version_key" ON "studio_screenplay_scene_revisions"("scene_plan_id", "scene_number", "version");

-- CreateIndex
CREATE INDEX "studio_screenplay_scene_revisions_adaptation_id_episode_number_scene_number_created_at_idx" ON "studio_screenplay_scene_revisions"("adaptation_id", "episode_number", "scene_number", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "studio_screenplay_scene_revisions" ADD CONSTRAINT "studio_screenplay_scene_revisions_adaptation_id_fkey" FOREIGN KEY ("adaptation_id") REFERENCES "studio_adaptation_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_screenplay_scene_revisions" ADD CONSTRAINT "studio_screenplay_scene_revisions_scene_plan_id_fkey" FOREIGN KEY ("scene_plan_id") REFERENCES "studio_scene_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
