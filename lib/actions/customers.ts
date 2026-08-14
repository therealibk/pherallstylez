"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireAdmin(): Promise<boolean> {
  const session = await auth();
  return !!session;
}

const PAGE_SIZE = 20;

export async function listCustomers(
  search?: string,
  page = 1,
): Promise<{
  customers: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    createdAt: Date;
    _count: { appointments: number };
  }[];
  total: number;
  page: number;
  pages: number;
}> {
  if (!(await requireAdmin())) return { customers: [], total: 0, page, pages: 0 };

  const skip = (Math.max(1, page) - 1) * PAGE_SIZE;

  type WhereInput = {
    OR?: Array<{
      firstName?: { contains: string; mode: "insensitive" };
      lastName?: { contains: string; mode: "insensitive" };
      email?: { contains: string; mode: "insensitive" };
      phone?: { contains: string; mode: "insensitive" };
    }>;
  };

  const where: WhereInput = {};
  if (search?.trim()) {
    const s = search.trim();
    where.OR = [
      { firstName: { contains: s, mode: "insensitive" } },
      { lastName: { contains: s, mode: "insensitive" } },
      { email: { contains: s, mode: "insensitive" } },
      { phone: { contains: s, mode: "insensitive" } },
    ];
  }

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: { select: { appointments: true } },
      },
    }),
    db.customer.count({ where }),
  ]);

  return { customers, total, page, pages: Math.ceil(total / PAGE_SIZE) };
}

export async function getCustomerById(id: string) {
  if (!(await requireAdmin())) return null;

  return db.customer.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      appointments: {
        orderBy: { startAt: "desc" },
        select: {
          id: true,
          status: true,
          startAt: true,
          endAt: true,
          serviceName: true,
          pricePence: true,
          depositPence: true,
          payments: { select: { status: true, amountPence: true, paymentType: true } },
        },
      },
    },
  });
}
