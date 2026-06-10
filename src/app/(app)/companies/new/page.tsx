import Link from "next/link";
import { createCompany } from "@/app/(app)/companies/actions";
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

export default function NewCompanyPage() {
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
            New company
          </h1>
          <p className="mt-2 text-muted-foreground">
            Add a company you are interested in or have applied to.
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
            <form action={createCompany} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Company name *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="e.g. Infobip"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    placeholder="https://example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    name="industry"
                    placeholder="e.g. SaaS, fintech, retail"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="size">Size</Label>
                  <Input
                    id="size"
                    name="size"
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
                  placeholder="What do you know about this company? Why is it interesting?"
                />
              </div>

              <FormActions
                cancelHref="/companies"
                submitLabel="Create company"
              />
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
