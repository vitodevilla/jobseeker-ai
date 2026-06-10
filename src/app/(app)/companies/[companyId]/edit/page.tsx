import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteCompany, updateCompany } from "@/app/(app)/companies/actions";
import { FormActions } from "@/components/form-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DeleteConfirmationForm } from "@/components/delete-confirmation-form";
import { DangerZoneCard } from "@/components/danger-zone-card";

type EditCompanyPageProps = {
  params: Promise<{
    companyId: string;
  }>;
};

export default async function EditCompanyPage({
  params,
}: EditCompanyPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const { companyId } = await params;

  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      userId: session.user.id,
    },
  });

  if (!company) {
    notFound();
  }

  const updateCompanyWithId = updateCompany.bind(null, company.id);
  const deleteCompanyWithId = deleteCompany.bind(null, company.id);

  return (
    <>
      <div className="space-y-6">
        <div>
          <Link
            href="/companies"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to companies
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Edit company
          </h1>
          <p className="mt-2 text-muted-foreground">
            Update your saved details and private notes for this company.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company details</CardTitle>
            <CardDescription>
              Fields marked with * are required.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form action={updateCompanyWithId} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Company name *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={company.name}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    defaultValue={company.website ?? ""}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    name="industry"
                    defaultValue={company.industry ?? ""}
                    placeholder="e.g. SaaS, fintech, retail"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="size">Size</Label>
                  <Input
                    id="size"
                    name="size"
                    defaultValue={company.size ?? ""}
                    placeholder="e.g. 11-50, Enterprise"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Private notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  className="min-h-32"
                  rows={5}
                  defaultValue={company.notes ?? ""}
                  placeholder="What do you know about this company? Why is it interesting?"
                />
              </div>

              <FormActions cancelHref="/companies" submitLabel="Save changes" />
            </form>
          </CardContent>
        </Card>
        <DangerZoneCard
          title="Delete company"
          description="Remove this company and its related job postings from your workspace. This action cannot be undone."
        >
          <DeleteConfirmationForm
            action={deleteCompanyWithId}
            title="Delete company?"
            description="This will remove the company and its related job postings from your workspace. This action cannot be undone."
            confirmLabel="Delete company"
            triggerLabel="Delete company"
          />
        </DangerZoneCard>
      </div>
    </>
  );
}
