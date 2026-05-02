/*
  Warnings:

  - Made the column `entity` on table `audit_logs` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "entity" SET NOT NULL;

-- CreateIndex
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_user_email" ON "audit_logs"("user_email");
