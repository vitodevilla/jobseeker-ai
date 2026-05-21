-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN     "matchAnalysis" TEXT,
ADD COLUMN     "matchResumeId" TEXT;

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_matchResumeId_fkey" FOREIGN KEY ("matchResumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
