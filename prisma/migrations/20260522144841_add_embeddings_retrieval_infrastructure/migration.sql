-- AlterTable
ALTER TABLE "Resume"
ADD COLUMN     "embedding" vector(3072),
ADD COLUMN     "embeddedAt" TIMESTAMP(3),
ADD COLUMN     "embeddingTextHash" TEXT;

-- AlterTable
ALTER TABLE "JobPosting"
ADD COLUMN     "embedding" vector(3072),
ADD COLUMN     "embeddedAt" TIMESTAMP(3),
ADD COLUMN     "embeddingTextHash" TEXT;
