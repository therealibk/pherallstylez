"use client";

import { useState, useTransition } from "react";
import { issueRefund } from "@/lib/actions/payments";
import { useRouter } from "next/navigation";

interface Props {
  paymentId: string;
  amountPence: number;
  maxRefundable: number;
  currency: string;
}

function formatCurrency(pence: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(pence / 100);
}

export function RefundFormClient({ paymentId, amountPence, maxRefundable, currency }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [amountStr, setAmountStr] = useState(
    (maxRefundable / 100).toFixed(2),
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-muted/40 transition-colors"
      >
        Issue refund
      </button>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = parseFloat(amountStr);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Please enter a valid amount greater than zero.");
      return;
    }

    const pence = Math.round(parsed * 100);
    if (pence > maxRefundable) {
      setError(
        `Amount exceeds the refundable balance (${formatCurrency(maxRefundable, currency)}).`,
      );
      return;
    }

    startTransition(async () => {
      const result = await issueRefund(paymentId, pence, reason.trim() || undefined);
      if (result.success) {
        setSuccess(true);
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (success) {
    return (
      <span className="text-xs text-emerald-600 font-medium">Refund issued ✓</span>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
        Issue refund
      </p>
      <p className="text-xs text-muted-foreground">
        Max refundable: <strong>{formatCurrency(maxRefundable, currency)}</strong> of{" "}
        {formatCurrency(amountPence, currency)} paid
      </p>

      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="refund-amount">
          Amount ({currency.toUpperCase()}) *
        </label>
        <input
          id="refund-amount"
          type="number"
          step="0.01"
          min="0.01"
          max={(maxRefundable / 100).toFixed(2)}
          value={amountStr}
          onChange={(e) => {
            setAmountStr(e.target.value);
            setError(null);
          }}
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1"
          disabled={isPending}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="refund-reason">
          Reason (optional)
        </label>
        <input
          id="refund-reason"
          type="text"
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Customer cancellation, etc."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1"
          disabled={isPending}
        />
      </div>

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
        >
          {isPending ? "Processing…" : "Confirm refund"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={isPending}
          className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted/40 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
