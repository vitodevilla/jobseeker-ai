"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { companyFormSchema } from "@/lib/validations/company";

async function getSignedInUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return session.user.id;
}

export async function createCompany(formData: FormData) {
  const userId = await getSignedInUserId();

  const parsed = companyFormSchema.parse({
    name: formData.get("name"),
    website: formData.get("website"),
    industry: formData.get("industry"),
    size: formData.get("size"),
    notes: formData.get("notes"),
  });

  await prisma.company.create({
    data: {
      userId,
      ...parsed,
    },
  });

  revalidatePath("/companies");
  redirect("/companies");
}

export async function updateCompany(companyId: string, formData: FormData) {
  const userId = await getSignedInUserId();

  const parsed = companyFormSchema.parse({
    name: formData.get("name"),
    website: formData.get("website"),
    industry: formData.get("industry"),
    size: formData.get("size"),
    notes: formData.get("notes"),
  });

  const result = await prisma.company.updateMany({
    where: {
      id: companyId,
      userId,
    },
    data: parsed,
  });

  if (result.count === 0) {
    redirect("/companies");
  }

  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}/edit`);
  redirect("/companies");
}

export async function deleteCompany(companyId: string) {
  const userId = await getSignedInUserId();

  await prisma.company.deleteMany({
    where: {
      id: companyId,
      userId,
    },
  });

  revalidatePath("/companies");
  redirect("/companies");
}
