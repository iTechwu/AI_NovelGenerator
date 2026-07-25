/*
  Warnings:

  - The `status` column on the `studio_project_imports` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "file_bucket_vendor" AS ENUM ('oss', 'us3', 'qiniu', 's3', 'gcs', 'tos', 'tencent', 'ksyun');

-- CreateEnum
CREATE TYPE "file_env_type" AS ENUM ('dev', 'test', 'prod', 'produs', 'prodap');

-- CreateEnum
CREATE TYPE "audit_action_type" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACCESS', 'EXPORT', 'IMPORT');

-- CreateEnum
CREATE TYPE "StudioProjectImportStatus" AS ENUM ('previewed', 'imported');

-- DropForeignKey
ALTER TABLE "studio_finalization_outbox_tasks" DROP CONSTRAINT "studio_finalization_outbox_tasks_revision_id_fkey";

-- AlterTable
ALTER TABLE "studio_project_imports" DROP COLUMN "status",
ADD COLUMN     "status" "StudioProjectImportStatus" NOT NULL DEFAULT 'previewed';

-- DropEnum
DROP TYPE "studio_project_import_status";

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "action" "audit_action_type" NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "resource_id" VARCHAR(255),
    "actor_type" VARCHAR(50) NOT NULL,
    "actor_id" VARCHAR(255),
    "team_id" UUID,
    "changes" JSONB,
    "metadata" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'success',
    "error_msg" VARCHAR(500),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_team_id_created_at_idx" ON "audit_logs"("team_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_team_id_actor_id_idx" ON "audit_logs"("team_id", "actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_resource_resource_id_idx" ON "audit_logs"("resource", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- RenameIndex
ALTER INDEX "studio_adaptation_source_chapters_snapshot_id_chapter_number_ke" RENAME TO "studio_adaptation_source_chapters_snapshot_id_chapter_numbe_key";

-- RenameIndex
ALTER INDEX "studio_adaptation_source_snapshots_source_project_id_created_at" RENAME TO "studio_adaptation_source_snapshots_source_project_id_create_idx";

-- RenameIndex
ALTER INDEX "studio_chapter_finalizations_project_id_chapter_number_finalize" RENAME TO "studio_chapter_finalizations_project_id_chapter_number_fina_idx";

-- RenameIndex
ALTER INDEX "studio_chapter_revisions_project_id_chapter_number_created_at_i" RENAME TO "studio_chapter_revisions_project_id_chapter_number_created__idx";

-- RenameIndex
ALTER INDEX "studio_finalization_fact_snapshots_finalization_id_source_fact_" RENAME TO "studio_finalization_fact_snapshots_finalization_id_source_f_key";

-- RenameIndex
ALTER INDEX "studio_finalization_fact_snapshots_project_id_finalization_id_i" RENAME TO "studio_finalization_fact_snapshots_project_id_finalization__idx";

-- RenameIndex
ALTER INDEX "studio_review_findings_project_id_chapter_number_severity_statu" RENAME TO "studio_review_findings_project_id_chapter_number_severity_s_idx";
