-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "domain" TEXT,
    "stack" TEXT NOT NULL DEFAULT 'other',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unified_logs" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "seq" BIGINT NOT NULL,
    "log_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "hash" TEXT NOT NULL,
    "prev_hash" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unified_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "applications_slug_key" ON "applications"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "applications_api_key_key" ON "applications"("api_key");

-- CreateIndex
CREATE INDEX "applications_is_active_slug_idx" ON "applications"("is_active", "slug");

-- CreateIndex
CREATE INDEX "unified_logs_application_id_seq_idx" ON "unified_logs"("application_id", "seq");

-- CreateIndex
CREATE INDEX "unified_logs_application_id_created_at_idx" ON "unified_logs"("application_id", "created_at");

-- CreateIndex
CREATE INDEX "unified_logs_log_type_idx" ON "unified_logs"("log_type");

-- CreateIndex
CREATE INDEX "unified_logs_hash_idx" ON "unified_logs"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "unified_logs_application_id_seq_key" ON "unified_logs"("application_id", "seq");

-- AddForeignKey
ALTER TABLE "unified_logs" ADD CONSTRAINT "unified_logs_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
