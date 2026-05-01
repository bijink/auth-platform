-- -- DropTable
DROP TABLE IF EXISTS audit_logs;

-- CreatePartitionTable
CREATE TABLE audit_logs (
  "id" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "action" TEXT NOT NULL,
  "entity" TEXT,
  "old_data" JSONB,
  "new_data" JSONB,
  "method" TEXT,
  "url" TEXT,
  "user_id" INTEGER,
  "user_email" TEXT,
  "ip_address" TEXT,
  
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id", "created_at")
) PARTITION BY RANGE ("created_at");