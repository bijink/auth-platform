/*
  Warnings:

  - You are about to drop the column `action` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `entity` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `ip_address` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `method` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `new_data` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `old_data` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `audit_logs` table. All the data in the column will be lost.
  - Added the required column `type` to the `audit_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "action",
DROP COLUMN "entity",
DROP COLUMN "ip_address",
DROP COLUMN "method",
DROP COLUMN "new_data",
DROP COLUMN "old_data",
DROP COLUMN "url",
ADD COLUMN     "details" JSONB,
ADD COLUMN     "request_method" TEXT,
ADD COLUMN     "request_url" TEXT,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "user_ip_address" TEXT;
