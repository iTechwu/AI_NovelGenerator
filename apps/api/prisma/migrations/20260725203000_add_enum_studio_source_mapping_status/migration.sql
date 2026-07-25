/*
  Warnings:

  - You are about to drop the column `scene_outline` on the `studio_scene_plans` table. All the data in the column will be lost.
  - Added the required column `sceneOutline` to the `studio_scene_plans` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "studio_scene_plans" DROP COLUMN "scene_outline",
ADD COLUMN     "sceneOutline" JSONB NOT NULL;

-- RenameIndex
ALTER INDEX "studio_source_scene_mappings_adaptation_id_status_created_at_id" RENAME TO "studio_source_scene_mappings_adaptation_id_status_created_a_idx";

-- RenameIndex
ALTER INDEX "studio_source_scene_mappings_scene_plan_id_scene_number_source_" RENAME TO "studio_source_scene_mappings_scene_plan_id_scene_number_sou_key";
