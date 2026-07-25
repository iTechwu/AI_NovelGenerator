-- CreateEnum
CREATE TYPE "studio_adaptation_decision_type" AS ENUM ('cut', 'merge', 'reorder', 'pov_change', 'expand');

-- CreateEnum
CREATE TYPE "studio_adaptation_decision_impact" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "studio_adaptation_decision_status" AS ENUM ('proposed', 'accepted', 'edited', 'rejected');

-- CreateTable
CREATE TABLE "studio_adaptation_decisions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "adaptation_id" UUID NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "source_chapter_id" UUID NOT NULL,
    "type" "studio_adaptation_decision_type" NOT NULL,
    "impact" "studio_adaptation_decision_impact" NOT NULL,
    "proposal" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "status" "studio_adaptation_decision_status" NOT NULL DEFAULT 'proposed',
    "resolution_reason" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "studio_adaptation_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "studio_adaptation_decisions_adaptation_id_status_created_at_idx" ON "studio_adaptation_decisions"("adaptation_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "studio_adaptation_decisions_source_chapter_id_idx" ON "studio_adaptation_decisions"("source_chapter_id");

-- AddForeignKey
ALTER TABLE "studio_adaptation_decisions" ADD CONSTRAINT "studio_adaptation_decisions_adaptation_id_fkey" FOREIGN KEY ("adaptation_id") REFERENCES "studio_adaptation_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_adaptation_decisions" ADD CONSTRAINT "studio_adaptation_decisions_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "studio_adaptation_source_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_adaptation_decisions" ADD CONSTRAINT "studio_adaptation_decisions_source_chapter_id_fkey" FOREIGN KEY ("source_chapter_id") REFERENCES "studio_adaptation_source_chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
