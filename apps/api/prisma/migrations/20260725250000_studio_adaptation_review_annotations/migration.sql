-- PRD P13 对照审阅: per-scene author verdict annotations.

-- CreateEnum
CREATE TYPE "studio_review_verdict" AS ENUM ('faithful', 'needs_revision', 'cut_approved');

-- CreateTable
CREATE TABLE "studio_adaptation_review_annotations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "adaptation_id" UUID NOT NULL,
    "episode_number" SMALLINT NOT NULL,
    "scene_number" SMALLINT NOT NULL,
    "verdict" "studio_review_verdict" NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "studio_adaptation_review_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (canonical ≤63-char name; oversized names get truncated by PG and
-- trigger spurious rename diffs that fail shadow-DB replay)
CREATE UNIQUE INDEX "studio_adaptation_review_annotations_adaptation_id_episode__key" ON "studio_adaptation_review_annotations"("adaptation_id", "episode_number", "scene_number");

-- AddForeignKey
ALTER TABLE "studio_adaptation_review_annotations" ADD CONSTRAINT "studio_adaptation_review_annotations_adaptation_id_fkey" FOREIGN KEY ("adaptation_id") REFERENCES "studio_adaptation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
