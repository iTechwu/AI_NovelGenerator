-- CreateTable
CREATE TABLE "studio_scene_plans" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "adaptation_id" UUID NOT NULL,
    "episode_number" SMALLINT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "synopsis" TEXT NOT NULL,
    "scene_outline" JSONB NOT NULL,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "studio_scene_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "studio_scene_plans_adaptation_id_episode_number_key" ON "studio_scene_plans"("adaptation_id", "episode_number");

-- CreateIndex
CREATE INDEX "studio_scene_plans_adaptation_id_episode_number_idx" ON "studio_scene_plans"("adaptation_id", "episode_number");

-- AddForeignKey
ALTER TABLE "studio_scene_plans" ADD CONSTRAINT "studio_scene_plans_adaptation_id_fkey" FOREIGN KEY ("adaptation_id") REFERENCES "studio_adaptation_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
