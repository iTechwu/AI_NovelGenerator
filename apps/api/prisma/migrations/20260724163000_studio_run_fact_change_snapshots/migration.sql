ALTER TABLE "studio_generation_runs"
  ADD COLUMN "fact_changes" JSONB NOT NULL DEFAULT '[]';
