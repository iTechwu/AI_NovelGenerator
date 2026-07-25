-- CreateEnum
CREATE TYPE "studio_source_mapping_status" AS ENUM ('proposed', 'confirmed', 'stale');

-- CreateTable
CREATE TABLE "studio_source_scene_mappings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "adaptation_id" UUID NOT NULL,
    "scene_plan_id" UUID NOT NULL,
    "episode_number" SMALLINT NOT NULL,
    "scene_number" SMALLINT NOT NULL,
    "source_chapter_id" UUID NOT NULL,
    "evidence_anchor" TEXT,
    "status" "studio_source_mapping_status" NOT NULL DEFAULT 'proposed',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "studio_source_scene_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "studio_source_scene_mappings_scene_plan_id_scene_number_source_chapter_key" ON "studio_source_scene_mappings"("scene_plan_id", "scene_number", "source_chapter_id");

-- CreateIndex
CREATE INDEX "studio_source_scene_mappings_adaptation_id_status_created_at_idx" ON "studio_source_scene_mappings"("adaptation_id", "status", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "studio_source_scene_mappings" ADD CONSTRAINT "studio_source_scene_mappings_adaptation_id_fkey" FOREIGN KEY ("adaptation_id") REFERENCES "studio_adaptation_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_source_scene_mappings" ADD CONSTRAINT "studio_source_scene_mappings_scene_plan_id_fkey" FOREIGN KEY ("scene_plan_id") REFERENCES "studio_scene_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_source_scene_mappings" ADD CONSTRAINT "studio_source_scene_mappings_source_chapter_id_fkey" FOREIGN KEY ("source_chapter_id") REFERENCES "studio_adaptation_source_chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
