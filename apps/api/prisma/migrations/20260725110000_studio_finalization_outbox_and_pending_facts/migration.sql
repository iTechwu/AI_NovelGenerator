ALTER TYPE "studio_fact_change_status"
  ADD VALUE IF NOT EXISTS 'accepted_pending_finalization';

ALTER TABLE "studio_generation_runs"
  ADD COLUMN "attempt_count" INTEGER NOT NULL DEFAULT 0;

ALTER TYPE "studio_chapter_finalization_status"
  ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE "studio_chapter_finalization_status"
  ADD VALUE IF NOT EXISTS 'finalizing';
ALTER TYPE "studio_chapter_finalization_status"
  ADD VALUE IF NOT EXISTS 'failed';
ALTER TYPE "studio_chapter_finalization_status"
  ADD VALUE IF NOT EXISTS 'recoverable';

CREATE TYPE "studio_finalization_outbox_task_type" AS ENUM ('summary', 'index');
CREATE TYPE "studio_finalization_outbox_task_status" AS ENUM (
  'pending',
  'running',
  'completed',
  'failed',
  'recoverable'
);
CREATE TYPE "studio_review_finding_severity" AS ENUM ('blocking', 'warning', 'info');
CREATE TYPE "studio_review_finding_status" AS ENUM ('open', 'resolved', 'ignored', 'intentional_change');

CREATE TABLE "studio_finalization_outbox_tasks" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "finalization_id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "revision_id" UUID NOT NULL,
  "chapter_number" INTEGER NOT NULL,
  "type" "studio_finalization_outbox_task_type" NOT NULL,
  "status" "studio_finalization_outbox_task_status" NOT NULL DEFAULT 'pending',
  "idempotency_key" VARCHAR(160) NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "result" JSONB,
  "completed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "studio_finalization_outbox_tasks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_finalization_outbox_tasks_idempotency_key_key"
  ON "studio_finalization_outbox_tasks"("idempotency_key");
CREATE UNIQUE INDEX "studio_finalization_outbox_tasks_finalization_id_type_key"
  ON "studio_finalization_outbox_tasks"("finalization_id", "type");
CREATE INDEX "studio_finalization_outbox_tasks_status_created_at_idx"
  ON "studio_finalization_outbox_tasks"("status", "created_at");
CREATE INDEX "studio_finalization_outbox_tasks_project_id_chapter_number_idx"
  ON "studio_finalization_outbox_tasks"("project_id", "chapter_number");

ALTER TABLE "studio_finalization_outbox_tasks"
  ADD CONSTRAINT "studio_finalization_outbox_tasks_finalization_id_fkey"
  FOREIGN KEY ("finalization_id") REFERENCES "studio_chapter_finalizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "studio_finalization_outbox_tasks_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "studio_finalization_outbox_tasks_revision_id_fkey"
  FOREIGN KEY ("revision_id") REFERENCES "studio_chapter_revisions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "studio_review_findings" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "finding_key" CHAR(64) NOT NULL,
  "project_id" UUID NOT NULL,
  "revision_id" UUID NOT NULL,
  "chapter_number" INTEGER NOT NULL,
  "fact_id" UUID,
  "rule_id" VARCHAR(120) NOT NULL,
  "severity" "studio_review_finding_severity" NOT NULL,
  "status" "studio_review_finding_status" NOT NULL DEFAULT 'open',
  "evidence_start" INTEGER NOT NULL,
  "evidence_end" INTEGER NOT NULL,
  "evidence" TEXT NOT NULL,
  "suggested_action" TEXT NOT NULL,
  "resolution_reason" TEXT,
  "resolved_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "studio_review_findings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "studio_review_findings_finding_key_key" ON "studio_review_findings"("finding_key");
CREATE INDEX "studio_review_findings_project_id_chapter_number_severity_status_idx" ON "studio_review_findings"("project_id", "chapter_number", "severity", "status");
CREATE INDEX "studio_review_findings_revision_id_status_idx" ON "studio_review_findings"("revision_id", "status");
ALTER TABLE "studio_review_findings"
  ADD CONSTRAINT "studio_review_findings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "studio_review_findings_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "studio_chapter_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "studio_review_findings_fact_id_fkey" FOREIGN KEY ("fact_id") REFERENCES "studio_facts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
