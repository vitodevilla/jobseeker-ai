"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getNullableString(formData: FormData, key: string) {
  const value = formData.get(key)?.toString().trim();
  return value ? value : null;
}

export async function createCompany(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const name = formData.get("name")?.toString().trim();

  if (!name) {
    throw new Error("Company name is required.");
  }

  await prisma.company.create({
    data: {
      userId: session.user.id,
      name,
      website: getNullableString(formData, "website"),
      industry: getNullableString(formData, "industry"),
      size: getNullableString(formData, "size"),
      notes: getNullableString(formData, "notes"),
    },
  });

  revalidatePath("/companies");
  redirect("/companies");
}

export async function updateCompany(companyId: string, formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const name = formData.get("name")?.toString().trim();

  if (!name) {
    throw new Error("Company name is required.");
  }

  const result = await prisma.company.updateMany({
    where: {
      id: companyId,
      userId: session.user.id,
    },
    data: {
      name,
      website: getNullableString(formData, "website"),
      industry: getNullableString(formData, "industry"),
      size: getNullableString(formData, "size"),
      notes: getNullableString(formData, "notes"),
    },
  });

  if (result.count === 0) {
    redirect("/companies");
  }

  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}/edit`);
  redirect("/companies");
}

export async function deleteCompany(companyId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  await prisma.company.deleteMany({
    where: {
      id: companyId,
      userId: session.user.id,
    },
  });

  revalidatePath("/companies");
  redirect("/companies");
}
