-- CreateIndex
CREATE INDEX "idx_audit_logs_created_at_desc" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_logs_type_created_at" ON "audit_logs"("type", "created_at" DESC);
