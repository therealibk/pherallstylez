import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { PaymentStatusBadge } from "@/components/admin/payment-status-badge";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Payments — Pherall Admin" };

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatCurrency(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function PaymentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        status: true,
        paymentType: true,
        amountPence: true,
        currency: true,
        paidAt: true,
        createdAt: true,
        appointment: {
          select: {
            id: true,
            serviceName: true,
            customer: { select: { firstName: true, lastName: true } },
          },
        },
        refunds: { select: { amountPence: true, status: true } },
      },
    }),
    db.payment.count(),
  ]);

  const pages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <PageHeader
        title="Payments"
        description={`${total} payment record${total !== 1 ? "s" : ""} total`}
      />

      <div className="rounded-lg border border-border bg-amber-50/60 border-amber-200 px-4 py-3 text-sm text-amber-800 mb-6">
        <p className="font-medium">Stripe integration coming soon</p>
        <p className="text-xs mt-0.5 text-amber-700">Stripe payment processing will be available in a future update. Payment records below are created once Stripe is connected.</p>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-16 text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm font-medium">No payment records yet</p>
          <p className="text-xs text-muted-foreground mt-1">Payment records appear here once Stripe is connected and customers pay</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                    <span className="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(p.paidAt ?? p.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {p.appointment.customer.firstName} {p.appointment.customer.lastName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.appointment.serviceName}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">
                      {p.paymentType.toLowerCase().replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(p.amountPence)}</td>
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={p.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/appointments/${p.appointment.id}`}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="View appointment"
                      >
                        Appointment
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">Page {page} of {pages}</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={`/admin/payments?page=${page - 1}`} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted/40">Previous</Link>
                )}
                {page < pages && (
                  <Link href={`/admin/payments?page=${page + 1}`} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted/40">Next</Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
