-- CreateTable
CREATE TABLE "verified_emails" (
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verified_emails_pkey" PRIMARY KEY ("email")
);
