import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { deleteCompany, updateCompany } from "@/app/companies/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteConfirmationForm } from "@/components/delete-confirmation-form";

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
    <AppShell userName={session.user.name} userEmail={session.user.email}>
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
                <textarea
                  id="notes"
                  name="notes"
                  rows={5}
                  defaultValue={company.notes ?? ""}
                  placeholder="What do you know about this company? Why is it interesting?"
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" asChild>
                  <Link href="/companies">Cancel</Link>
                </Button>
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Delete company</CardTitle>
            <CardDescription>
              Remove this company and its related job postings from your
              workspace. This action cannot be undone.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <DeleteConfirmationForm
              action={deleteCompanyWithId}
              title="Delete company?"
              description="This will remove the company and its related job postings from your workspace. This action cannot be undone."
              confirmLabel="Delete company"
              triggerLabel="Delete company"
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
