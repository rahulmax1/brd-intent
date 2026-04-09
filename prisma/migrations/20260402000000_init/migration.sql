-- CreateEnum
CREATE TYPE "Phase" AS ENUM ('UPLOAD', 'DRAFT', 'CONSENSUS', 'EXPORT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('BRD', 'TRANSCRIPT', 'MIRO', 'TECHNICAL', 'UPLOAD');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('ACTOR', 'ENTITY', 'JOURNEY', 'BUSINESS_RULE', 'CONSTRAINT', 'OPEN_QUESTION');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ConversationPhase" AS ENUM ('DRAFT', 'CONSENSUS', 'EDITING');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('BRD', 'ZOD_SCHEMAS', 'API_STUBS', 'MIGRATION', 'TYPESCRIPT_TYPES', 'CONTRACT');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "phase" "Phase" NOT NULL DEFAULT 'UPLOAD',
    "phaseData" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "processing_status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "extracted_text" TEXT,
    "extraction_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intent_model_versions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "model_data" JSONB NOT NULL,
    "parent_version_id" TEXT,
    "prompt" TEXT,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,
    "is_snapshot" BOOLEAN NOT NULL DEFAULT false,
    "snapshot_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intent_model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_decisions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "model_version_id" TEXT NOT NULL,
    "target_type" "TargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "phase" "ConversationPhase" NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "content" TEXT NOT NULL,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "model" TEXT,
    "referenced_document_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_artifacts" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "artifact_type" "ArtifactType" NOT NULL,
    "filename" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "model_version_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ReferencedDocuments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ReferencedDocuments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "documents_project_id_idx" ON "documents"("project_id");

-- CreateIndex
CREATE INDEX "documents_processing_status_idx" ON "documents"("processing_status");

-- CreateIndex
CREATE INDEX "intent_model_versions_project_id_idx" ON "intent_model_versions"("project_id");

-- CreateIndex
CREATE INDEX "intent_model_versions_created_at_idx" ON "intent_model_versions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "intent_model_versions_project_id_version_number_key" ON "intent_model_versions"("project_id", "version_number");

-- CreateIndex
CREATE INDEX "review_decisions_project_id_idx" ON "review_decisions"("project_id");

-- CreateIndex
CREATE INDEX "review_decisions_model_version_id_idx" ON "review_decisions"("model_version_id");

-- CreateIndex
CREATE INDEX "review_decisions_status_idx" ON "review_decisions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "review_decisions_project_id_model_version_id_target_type_key" ON "review_decisions"("project_id", "model_version_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "ai_conversations_project_id_idx" ON "ai_conversations"("project_id");

-- CreateIndex
CREATE INDEX "ai_conversations_status_idx" ON "ai_conversations"("status");

-- CreateIndex
CREATE INDEX "ai_messages_conversation_id_idx" ON "ai_messages"("conversation_id");

-- CreateIndex
CREATE INDEX "generated_artifacts_project_id_idx" ON "generated_artifacts"("project_id");

-- CreateIndex
CREATE INDEX "generated_artifacts_artifact_type_idx" ON "generated_artifacts"("artifact_type");

-- CreateIndex
CREATE INDEX "_ReferencedDocuments_B_index" ON "_ReferencedDocuments"("B");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intent_model_versions" ADD CONSTRAINT "intent_model_versions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intent_model_versions" ADD CONSTRAINT "intent_model_versions_parent_version_id_fkey" FOREIGN KEY ("parent_version_id") REFERENCES "intent_model_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_decisions" ADD CONSTRAINT "review_decisions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_decisions" ADD CONSTRAINT "review_decisions_model_version_id_fkey" FOREIGN KEY ("model_version_id") REFERENCES "intent_model_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_artifacts" ADD CONSTRAINT "generated_artifacts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_artifacts" ADD CONSTRAINT "generated_artifacts_model_version_id_fkey" FOREIGN KEY ("model_version_id") REFERENCES "intent_model_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReferencedDocuments" ADD CONSTRAINT "_ReferencedDocuments_A_fkey" FOREIGN KEY ("A") REFERENCES "ai_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReferencedDocuments" ADD CONSTRAINT "_ReferencedDocuments_B_fkey" FOREIGN KEY ("B") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
