CREATE TYPE "studio_project_event_type" AS ENUM ('generation_status', 'finalization_task_status');

CREATE TABLE "studio_project_events" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "project_id" UUID NOT NULL,
  "type" "studio_project_event_type" NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "studio_project_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "studio_project_events_project_id_created_at_idx"
  ON "studio_project_events"("project_id", "created_at" DESC);

ALTER TABLE "studio_project_events"
  ADD CONSTRAINT "studio_project_events_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
