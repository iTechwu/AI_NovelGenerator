-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "sex_type" AS ENUM ('UNKNOWN', 'MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "file_bucket_vendor" AS ENUM ('oss', 'us3', 'qiniu', 's3', 'gcs', 'tos', 'tencent', 'ksyun');

-- CreateEnum
CREATE TYPE "file_env_type" AS ENUM ('dev', 'test', 'prod', 'produs', 'prodap');

-- CreateEnum
CREATE TYPE "file_access" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "audit_action_type" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACCESS', 'EXPORT', 'IMPORT');

-- CreateEnum
CREATE TYPE "studio_generation_run_status" AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "studio_generation_run_type" AS ENUM ('blueprint', 'chapter_draft');

-- CreateEnum
CREATE TYPE "studio_project_event_type" AS ENUM ('generation_status', 'finalization_task_status', 'fact_change_decision');

-- CreateEnum
CREATE TYPE "studio_blueprint_status" AS ENUM ('draft', 'confirmed');

-- CreateEnum
CREATE TYPE "studio_chapter_plan_status" AS ENUM ('draft', 'confirmed');

-- CreateEnum
CREATE TYPE "studio_chapter_revision_status" AS ENUM ('draft', 'finalized', 'superseded');

-- CreateEnum
CREATE TYPE "studio_chapter_finalization_status" AS ENUM ('pending', 'finalizing', 'finalized', 'failed', 'recoverable');

-- CreateEnum
CREATE TYPE "StudioProjectImportStatus" AS ENUM ('previewed', 'imported');

-- CreateEnum
CREATE TYPE "studio_adaptation_target_format" AS ENUM ('series', 'short_drama');

-- CreateEnum
CREATE TYPE "studio_adaptation_status" AS ENUM ('brief_draft', 'blueprint_review', 'scene_planning', 'script_writing', 'review_ready', 'deliverable');

-- CreateEnum
CREATE TYPE "studio_finalization_task_status" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "studio_finalization_outbox_task_type" AS ENUM ('summary', 'index');

-- CreateEnum
CREATE TYPE "studio_finalization_outbox_task_status" AS ENUM ('pending', 'running', 'completed', 'failed', 'recoverable');

-- CreateEnum
CREATE TYPE "studio_review_finding_severity" AS ENUM ('blocking', 'warning', 'info');

-- CreateEnum
CREATE TYPE "studio_review_finding_status" AS ENUM ('open', 'resolved', 'ignored', 'intentional_change');

-- CreateEnum
CREATE TYPE "studio_fact_status" AS ENUM ('confirmed', 'retired');

-- CreateEnum
CREATE TYPE "studio_fact_change_operation" AS ENUM ('add', 'update', 'remove');

-- CreateEnum
CREATE TYPE "studio_fact_change_status" AS ENUM ('proposed', 'accepted_pending_finalization', 'accepted', 'rejected');

-- CreateTable
CREATE TABLE "u_user_info" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "sso_sub" VARCHAR(255),
    "nickname" VARCHAR(255) NOT NULL DEFAULT '',
    "code" VARCHAR(255),
    "avatar_file_id" UUID,
    "sex" "sex_type" NOT NULL DEFAULT 'UNKNOWN',
    "locale" VARCHAR(20),
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "email" VARCHAR(255),
    "mobile" VARCHAR(40),
    "role" TEXT NOT NULL DEFAULT 'user',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sign_in_at" TIMESTAMPTZ(6),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "u_user_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_email_auth" (
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "password_encryption_method" VARCHAR(50) NOT NULL DEFAULT 'Bcrypt',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "t_email_auth_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "t_mobile_auth" (
    "mobile" VARCHAR(40) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "password_encryption_method" VARCHAR(50) NOT NULL DEFAULT 'Bcrypt',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "t_mobile_auth_pkey" PRIMARY KEY ("mobile")
);

-- CreateTable
CREATE TABLE "t_user_mfa" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "mfa_type" VARCHAR(20) NOT NULL DEFAULT 'TOTP',
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "backup_codes" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "t_user_mfa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "f_file_source" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "key" VARCHAR(255) NOT NULL,
    "bucket" VARCHAR(255) NOT NULL,
    "vendor" "file_bucket_vendor" NOT NULL DEFAULT 'tos',
    "region" VARCHAR(50) NOT NULL DEFAULT 'cn-beijing',
    "filename" VARCHAR(255),
    "fsize" DOUBLE PRECISION NOT NULL,
    "mime_type" VARCHAR(255) NOT NULL,
    "ext" VARCHAR(20) NOT NULL,
    "sha256" VARCHAR(64),
    "hash" VARCHAR(255),
    "thumb_img" TEXT,
    "parts" INTEGER[],
    "is_uploaded" BOOLEAN NOT NULL DEFAULT false,
    "status" INTEGER NOT NULL DEFAULT 0,
    "env" "file_env_type" NOT NULL DEFAULT 'prod',
    "scope" VARCHAR(50) NOT NULL DEFAULT 'general',
    "access" "file_access" NOT NULL DEFAULT 'public',
    "uploaded_by" UUID,
    "tenant_id" UUID,
    "team_id" UUID,
    "metadata" JSONB,
    "expire_at" TIMESTAMPTZ(6),
    "transition_to_ia_at" TIMESTAMPTZ(6),
    "transition_to_archive_at" TIMESTAMPTZ(6),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "f_file_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_code" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "continent" VARCHAR(10) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "country_code_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "studio_projects" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "owner_id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "format" VARCHAR(20) NOT NULL DEFAULT 'novel',
    "genre" VARCHAR(80) NOT NULL,
    "premise" TEXT NOT NULL,
    "chapter_count" INTEGER NOT NULL,
    "target_words_per_chapter" INTEGER NOT NULL,
    "guidance" TEXT NOT NULL DEFAULT '',
    "generate_outline" BOOLEAN NOT NULL DEFAULT true,
    "current_blueprint_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "studio_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_project_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,
    "type" "studio_project_event_type" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_project_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_project_imports" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "owner_id" UUID NOT NULL,
    "project_id" UUID,
    "filename" VARCHAR(255) NOT NULL,
    "source_format" VARCHAR(20) NOT NULL,
    "source_content_base64" TEXT NOT NULL,
    "content_hash" CHAR(64) NOT NULL,
    "preview" JSONB NOT NULL DEFAULT '{}',
    "status" "StudioProjectImportStatus" NOT NULL DEFAULT 'previewed',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMPTZ(6),

    CONSTRAINT "studio_project_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_adaptation_projects" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "owner_id" UUID NOT NULL,
    "source_project_id" UUID NOT NULL,
    "target_format" "studio_adaptation_target_format" NOT NULL,
    "episode_count" INTEGER NOT NULL,
    "minutes_per_episode" INTEGER NOT NULL,
    "target_audience" VARCHAR(500) NOT NULL DEFAULT '',
    "adaptation_goal" TEXT NOT NULL DEFAULT '',
    "must_preserve" TEXT NOT NULL DEFAULT '',
    "rights_confirmed_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "studio_adaptation_status" NOT NULL DEFAULT 'brief_draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "studio_adaptation_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_adaptation_source_snapshots" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "adaptation_id" UUID NOT NULL,
    "source_project_id" UUID NOT NULL,
    "source_project_title" VARCHAR(120) NOT NULL,
    "source_project_updated_at" TIMESTAMPTZ(6) NOT NULL,
    "source_chapter_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_adaptation_source_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_adaptation_source_chapters" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "snapshot_id" UUID NOT NULL,
    "source_revision_id" UUID NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "content_hash" CHAR(64) NOT NULL,
    "word_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_adaptation_source_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_generation_runs" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "chapter_plan_id" UUID,
    "type" "studio_generation_run_type" NOT NULL DEFAULT 'blueprint',
    "status" "studio_generation_run_status" NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "current_step" VARCHAR(255) NOT NULL DEFAULT 'Queued for generation',
    "architecture" TEXT,
    "outline" TEXT,
    "chapter_content" TEXT,
    "input_summary" TEXT,
    "model_config" JSONB NOT NULL DEFAULT '{}',
    "fact_changes" JSONB NOT NULL DEFAULT '[]',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "studio_generation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_blueprints" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,
    "run_id" UUID,
    "version" INTEGER NOT NULL,
    "status" "studio_blueprint_status" NOT NULL DEFAULT 'draft',
    "architecture" TEXT NOT NULL,
    "outline" TEXT NOT NULL DEFAULT '',
    "source" VARCHAR(20) NOT NULL DEFAULT 'ai',
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "content_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "studio_blueprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_chapter_plans" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,
    "blueprint_id" UUID NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "studio_chapter_plan_status" NOT NULL DEFAULT 'draft',
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "title" VARCHAR(200) NOT NULL,
    "goal" TEXT NOT NULL,
    "conflict" TEXT NOT NULL DEFAULT '',
    "characters" JSONB NOT NULL DEFAULT '[]',
    "location" VARCHAR(200) NOT NULL DEFAULT '',
    "time_constraint" VARCHAR(500) NOT NULL DEFAULT '',
    "foreshadowing" TEXT NOT NULL DEFAULT '',
    "hook" TEXT NOT NULL DEFAULT '',
    "source" VARCHAR(20) NOT NULL DEFAULT 'author',
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "content_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "studio_chapter_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_chapter_revisions" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "chapter_plan_id" UUID NOT NULL,
    "run_id" UUID,
    "chapter_number" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "studio_chapter_revision_status" NOT NULL DEFAULT 'draft',
    "content" TEXT NOT NULL,
    "word_count" INTEGER NOT NULL,
    "prompt_summary" TEXT NOT NULL DEFAULT '',
    "model_config" JSONB NOT NULL DEFAULT '{}',
    "source" VARCHAR(20) NOT NULL DEFAULT 'ai',
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "content_hash" CHAR(64) NOT NULL,
    "source_revision_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "studio_chapter_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_facts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,
    "source_change_id" UUID,
    "fact_type" VARCHAR(80) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "predicate" VARCHAR(200) NOT NULL,
    "value" TEXT NOT NULL,
    "effective_chapter" INTEGER NOT NULL,
    "status" "studio_fact_status" NOT NULL DEFAULT 'confirmed',
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "studio_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "studio_fact_changes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,
    "revision_id" UUID NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "fact_id" UUID,
    "operation" "studio_fact_change_operation" NOT NULL,
    "fact_type" VARCHAR(80) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "predicate" VARCHAR(200) NOT NULL,
    "proposed_value" TEXT NOT NULL DEFAULT '',
    "rationale" TEXT NOT NULL DEFAULT '',
    "evidence" TEXT NOT NULL DEFAULT '',
    "confidence" DOUBLE PRECISION,
    "source" VARCHAR(20) NOT NULL DEFAULT 'ai',
    "status" "studio_fact_change_status" NOT NULL DEFAULT 'proposed',
    "resolved_value" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "studio_fact_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_chapter_draft_pointers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "revision_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "studio_chapter_draft_pointers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_chapter_final_pointers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "revision_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "studio_chapter_final_pointers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_chapter_finalizations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,
    "revision_id" UUID NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "status" "studio_chapter_finalization_status" NOT NULL DEFAULT 'finalized',
    "fact_snapshot_recorded" BOOLEAN NOT NULL DEFAULT false,
    "summary_status" "studio_finalization_task_status" NOT NULL DEFAULT 'pending',
    "index_status" "studio_finalization_task_status" NOT NULL DEFAULT 'pending',
    "summary" TEXT,
    "error" TEXT,
    "finalized_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "studio_chapter_finalizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_finalization_fact_snapshots" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "finalization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "source_fact_id" UUID NOT NULL,
    "fact_type" VARCHAR(80) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "predicate" VARCHAR(200) NOT NULL,
    "value" TEXT NOT NULL,
    "effective_chapter" INTEGER NOT NULL,
    "status" "studio_fact_status" NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_finalization_fact_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "u_user_info_sso_sub_key" ON "u_user_info"("sso_sub");

-- CreateIndex
CREATE UNIQUE INDEX "u_user_info_code_key" ON "u_user_info"("code");

-- CreateIndex
CREATE INDEX "u_user_info_code_idx" ON "u_user_info"("code");

-- CreateIndex
CREATE INDEX "u_user_info_sso_sub_idx" ON "u_user_info"("sso_sub");

-- CreateIndex
CREATE INDEX "u_user_info_is_deleted_is_admin_idx" ON "u_user_info"("is_deleted", "is_admin");

-- CreateIndex
CREATE INDEX "u_user_info_created_at_idx" ON "u_user_info"("created_at" DESC);

-- CreateIndex
CREATE INDEX "u_user_info_nickname_idx" ON "u_user_info"("nickname");

-- CreateIndex
CREATE INDEX "u_user_info_avatar_file_id_idx" ON "u_user_info"("avatar_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "t_email_auth_user_id_key" ON "t_email_auth"("user_id");

-- CreateIndex
CREATE INDEX "t_email_auth_user_id_idx" ON "t_email_auth"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "t_mobile_auth_user_id_key" ON "t_mobile_auth"("user_id");

-- CreateIndex
CREATE INDEX "t_mobile_auth_user_id_idx" ON "t_mobile_auth"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "t_user_mfa_user_id_key" ON "t_user_mfa"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "f_file_source_key_key" ON "f_file_source"("key");

-- CreateIndex
CREATE INDEX "f_file_source_uploaded_by_is_uploaded_is_deleted_idx" ON "f_file_source"("uploaded_by", "is_uploaded", "is_deleted");

-- CreateIndex
CREATE INDEX "f_file_source_scope_is_uploaded_is_deleted_idx" ON "f_file_source"("scope", "is_uploaded", "is_deleted");

-- CreateIndex
CREATE INDEX "f_file_source_tenant_id_is_uploaded_is_deleted_idx" ON "f_file_source"("tenant_id", "is_uploaded", "is_deleted");

-- CreateIndex
CREATE INDEX "f_file_source_bucket_idx" ON "f_file_source"("bucket");

-- CreateIndex
CREATE INDEX "country_code_continent_idx" ON "country_code"("continent");

-- CreateIndex
CREATE INDEX "country_code_code_idx" ON "country_code"("code");

-- CreateIndex
CREATE UNIQUE INDEX "country_code_continent_code_key" ON "country_code"("continent", "code");

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

-- CreateIndex
CREATE UNIQUE INDEX "studio_projects_current_blueprint_id_key" ON "studio_projects"("current_blueprint_id");

-- CreateIndex
CREATE INDEX "studio_projects_owner_id_created_at_idx" ON "studio_projects"("owner_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "studio_project_events_project_id_created_at_idx" ON "studio_project_events"("project_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "studio_project_imports_project_id_key" ON "studio_project_imports"("project_id");

-- CreateIndex
CREATE INDEX "studio_project_imports_owner_id_created_at_idx" ON "studio_project_imports"("owner_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "studio_adaptation_projects_owner_id_created_at_idx" ON "studio_adaptation_projects"("owner_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "studio_adaptation_projects_source_project_id_created_at_idx" ON "studio_adaptation_projects"("source_project_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "studio_adaptation_source_snapshots_adaptation_id_key" ON "studio_adaptation_source_snapshots"("adaptation_id");

-- CreateIndex
CREATE INDEX "studio_adaptation_source_snapshots_source_project_id_create_idx" ON "studio_adaptation_source_snapshots"("source_project_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "studio_adaptation_source_chapters_source_revision_id_idx" ON "studio_adaptation_source_chapters"("source_revision_id");

-- CreateIndex
CREATE UNIQUE INDEX "studio_adaptation_source_chapters_snapshot_id_chapter_numbe_key" ON "studio_adaptation_source_chapters"("snapshot_id", "chapter_number");

-- CreateIndex
CREATE INDEX "studio_generation_runs_project_id_created_at_idx" ON "studio_generation_runs"("project_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "studio_generation_runs_status_updated_at_idx" ON "studio_generation_runs"("status", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "studio_generation_runs_chapter_plan_id_created_at_idx" ON "studio_generation_runs"("chapter_plan_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "studio_blueprints_run_id_key" ON "studio_blueprints"("run_id");

-- CreateIndex
CREATE INDEX "studio_blueprints_project_id_status_version_idx" ON "studio_blueprints"("project_id", "status", "version" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "studio_blueprints_project_id_version_key" ON "studio_blueprints"("project_id", "version");

-- CreateIndex
CREATE INDEX "studio_chapter_plans_project_id_chapter_number_version_idx" ON "studio_chapter_plans"("project_id", "chapter_number", "version" DESC);

-- CreateIndex
CREATE INDEX "studio_chapter_plans_project_id_status_chapter_number_idx" ON "studio_chapter_plans"("project_id", "status", "chapter_number");

-- CreateIndex
CREATE UNIQUE INDEX "studio_chapter_plans_project_id_chapter_number_version_key" ON "studio_chapter_plans"("project_id", "chapter_number", "version");

-- CreateIndex
CREATE UNIQUE INDEX "studio_chapter_revisions_run_id_key" ON "studio_chapter_revisions"("run_id");

-- CreateIndex
CREATE INDEX "studio_chapter_revisions_project_id_chapter_number_created__idx" ON "studio_chapter_revisions"("project_id", "chapter_number", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "studio_chapter_revisions_project_id_chapter_number_version_key" ON "studio_chapter_revisions"("project_id", "chapter_number", "version");

-- CreateIndex
CREATE UNIQUE INDEX "studio_facts_source_change_id_key" ON "studio_facts"("source_change_id");

-- CreateIndex
CREATE INDEX "studio_facts_project_id_status_effective_chapter_idx" ON "studio_facts"("project_id", "status", "effective_chapter");

-- CreateIndex
CREATE INDEX "studio_facts_project_id_fact_type_subject_idx" ON "studio_facts"("project_id", "fact_type", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "studio_review_findings_finding_key_key" ON "studio_review_findings"("finding_key");

-- CreateIndex
CREATE INDEX "studio_review_findings_project_id_chapter_number_severity_s_idx" ON "studio_review_findings"("project_id", "chapter_number", "severity", "status");

-- CreateIndex
CREATE INDEX "studio_review_findings_revision_id_status_idx" ON "studio_review_findings"("revision_id", "status");

-- CreateIndex
CREATE INDEX "studio_fact_changes_project_id_chapter_number_status_idx" ON "studio_fact_changes"("project_id", "chapter_number", "status");

-- CreateIndex
CREATE INDEX "studio_fact_changes_revision_id_status_idx" ON "studio_fact_changes"("revision_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "studio_chapter_draft_pointers_revision_id_key" ON "studio_chapter_draft_pointers"("revision_id");

-- CreateIndex
CREATE UNIQUE INDEX "studio_chapter_draft_pointers_project_id_chapter_number_key" ON "studio_chapter_draft_pointers"("project_id", "chapter_number");

-- CreateIndex
CREATE UNIQUE INDEX "studio_chapter_final_pointers_revision_id_key" ON "studio_chapter_final_pointers"("revision_id");

-- CreateIndex
CREATE UNIQUE INDEX "studio_chapter_final_pointers_project_id_chapter_number_key" ON "studio_chapter_final_pointers"("project_id", "chapter_number");

-- CreateIndex
CREATE UNIQUE INDEX "studio_chapter_finalizations_revision_id_key" ON "studio_chapter_finalizations"("revision_id");

-- CreateIndex
CREATE INDEX "studio_chapter_finalizations_project_id_chapter_number_fina_idx" ON "studio_chapter_finalizations"("project_id", "chapter_number", "finalized_at" DESC);

-- CreateIndex
CREATE INDEX "studio_finalization_fact_snapshots_project_id_finalization__idx" ON "studio_finalization_fact_snapshots"("project_id", "finalization_id");

-- CreateIndex
CREATE UNIQUE INDEX "studio_finalization_fact_snapshots_finalization_id_source_f_key" ON "studio_finalization_fact_snapshots"("finalization_id", "source_fact_id");

-- CreateIndex
CREATE UNIQUE INDEX "studio_finalization_outbox_tasks_idempotency_key_key" ON "studio_finalization_outbox_tasks"("idempotency_key");

-- CreateIndex
CREATE INDEX "studio_finalization_outbox_tasks_status_created_at_idx" ON "studio_finalization_outbox_tasks"("status", "created_at");

-- CreateIndex
CREATE INDEX "studio_finalization_outbox_tasks_project_id_chapter_number_idx" ON "studio_finalization_outbox_tasks"("project_id", "chapter_number");

-- CreateIndex
CREATE UNIQUE INDEX "studio_finalization_outbox_tasks_finalization_id_type_key" ON "studio_finalization_outbox_tasks"("finalization_id", "type");

-- AddForeignKey
ALTER TABLE "t_email_auth" ADD CONSTRAINT "t_email_auth_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "u_user_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_mobile_auth" ADD CONSTRAINT "t_mobile_auth_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "u_user_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_user_mfa" ADD CONSTRAINT "t_user_mfa_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "u_user_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_projects" ADD CONSTRAINT "studio_projects_current_blueprint_id_fkey" FOREIGN KEY ("current_blueprint_id") REFERENCES "studio_blueprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_project_events" ADD CONSTRAINT "studio_project_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_project_imports" ADD CONSTRAINT "studio_project_imports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_adaptation_projects" ADD CONSTRAINT "studio_adaptation_projects_source_project_id_fkey" FOREIGN KEY ("source_project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_adaptation_source_snapshots" ADD CONSTRAINT "studio_adaptation_source_snapshots_adaptation_id_fkey" FOREIGN KEY ("adaptation_id") REFERENCES "studio_adaptation_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_adaptation_source_snapshots" ADD CONSTRAINT "studio_adaptation_source_snapshots_source_project_id_fkey" FOREIGN KEY ("source_project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_adaptation_source_chapters" ADD CONSTRAINT "studio_adaptation_source_chapters_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "studio_adaptation_source_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_adaptation_source_chapters" ADD CONSTRAINT "studio_adaptation_source_chapters_source_revision_id_fkey" FOREIGN KEY ("source_revision_id") REFERENCES "studio_chapter_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_generation_runs" ADD CONSTRAINT "studio_generation_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_generation_runs" ADD CONSTRAINT "studio_generation_runs_chapter_plan_id_fkey" FOREIGN KEY ("chapter_plan_id") REFERENCES "studio_chapter_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_blueprints" ADD CONSTRAINT "studio_blueprints_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_blueprints" ADD CONSTRAINT "studio_blueprints_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "studio_generation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_chapter_plans" ADD CONSTRAINT "studio_chapter_plans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_chapter_plans" ADD CONSTRAINT "studio_chapter_plans_blueprint_id_fkey" FOREIGN KEY ("blueprint_id") REFERENCES "studio_blueprints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_chapter_revisions" ADD CONSTRAINT "studio_chapter_revisions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_chapter_revisions" ADD CONSTRAINT "studio_chapter_revisions_chapter_plan_id_fkey" FOREIGN KEY ("chapter_plan_id") REFERENCES "studio_chapter_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_chapter_revisions" ADD CONSTRAINT "studio_chapter_revisions_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "studio_generation_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_chapter_revisions" ADD CONSTRAINT "studio_chapter_revisions_source_revision_id_fkey" FOREIGN KEY ("source_revision_id") REFERENCES "studio_chapter_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_facts" ADD CONSTRAINT "studio_facts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_facts" ADD CONSTRAINT "studio_facts_source_change_id_fkey" FOREIGN KEY ("source_change_id") REFERENCES "studio_fact_changes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_review_findings" ADD CONSTRAINT "studio_review_findings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_review_findings" ADD CONSTRAINT "studio_review_findings_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "studio_chapter_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_review_findings" ADD CONSTRAINT "studio_review_findings_fact_id_fkey" FOREIGN KEY ("fact_id") REFERENCES "studio_facts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_fact_changes" ADD CONSTRAINT "studio_fact_changes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_fact_changes" ADD CONSTRAINT "studio_fact_changes_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "studio_chapter_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_fact_changes" ADD CONSTRAINT "studio_fact_changes_fact_id_fkey" FOREIGN KEY ("fact_id") REFERENCES "studio_facts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_chapter_draft_pointers" ADD CONSTRAINT "studio_chapter_draft_pointers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_chapter_draft_pointers" ADD CONSTRAINT "studio_chapter_draft_pointers_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "studio_chapter_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_chapter_final_pointers" ADD CONSTRAINT "studio_chapter_final_pointers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_chapter_final_pointers" ADD CONSTRAINT "studio_chapter_final_pointers_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "studio_chapter_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_chapter_finalizations" ADD CONSTRAINT "studio_chapter_finalizations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_chapter_finalizations" ADD CONSTRAINT "studio_chapter_finalizations_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "studio_chapter_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_finalization_fact_snapshots" ADD CONSTRAINT "studio_finalization_fact_snapshots_finalization_id_fkey" FOREIGN KEY ("finalization_id") REFERENCES "studio_chapter_finalizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_finalization_fact_snapshots" ADD CONSTRAINT "studio_finalization_fact_snapshots_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_finalization_outbox_tasks" ADD CONSTRAINT "studio_finalization_outbox_tasks_finalization_id_fkey" FOREIGN KEY ("finalization_id") REFERENCES "studio_chapter_finalizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_finalization_outbox_tasks" ADD CONSTRAINT "studio_finalization_outbox_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
