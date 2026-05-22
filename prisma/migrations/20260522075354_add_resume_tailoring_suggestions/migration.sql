-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN     "tailoringResumeId" TEXT,
ADD COLUMN     "tailoringSuggestions" TEXT,
ADD COLUMN     "tailoringSuggestionsAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_tailoringResumeId_fkey" FOREIGN KEY ("tailoringResumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
