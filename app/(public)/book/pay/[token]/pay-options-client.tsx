"use client";

import { useState, useTransition } from "react";
import { createCheckoutSession } from "@/lib/actions/payments";

interface Props {
  rawToken: string;
  depositPence: number;
  pricePence: number;
  depositLabel: string | null;
  currency: string;
}

function formatCurrency(pence: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(pence / 100);
}

export function PayOptionsClient({
  rawToken,
  depositPence,
  pricePence,
  depositLabel,
  currency,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState<"DEPOSIT" | "FULL" | null>(null);

  const canPayDeposit = depositPence > 0 && depositPence < pricePence;

  function handlePay(type: "DEPOSIT" | "FULL") {
    setError(null);
    setLoadingType(type);
    startTransition(async () => {
      const result = await createCheckoutSession(rawToken, type);
      if (result.success) {
        window.location.href = result.url;
      } else {
        setError(result.error);
        setLoadingType(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="space-y-3">
        {/* Deposit option */}
        {canPayDeposit && (
          <button
            type="button"
            onClick={() => handlePay("DEPOSIT")}
            disabled={isPending}
            className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-left transition-colors hover:bg-muted/30 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                  {loadingType === "DEPOSIT" && isPending
                    ? "Redirecting to payment…"
                    : "Pay deposit now"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {depositLabel ?? `Pay ${formatCurrency(depositPence, currency)} today, remainder at appointment`}
                </p>
              </div>
              <span className="text-base font-bold tabular-nums" style={{ color: "var(--foreground)" }}>
                {formatCurrency(depositPence, currency)}
              </span>
            </div>
          </button>
        )}

        {/* Full payment option */}
        <button
          type="button"
          onClick={() => handlePay("FULL")}
          disabled={isPending}
          className="w-full rounded-2xl border px-5 py-4 text-left transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: "var(--foreground)", borderColor: "var(--foreground)", color: "var(--background)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">
                {loadingType === "FULL" && isPending
                  ? "Redirecting to payment…"
                  : "Pay in full"}
              </p>
              <p className="text-xs mt-0.5 opacity-70">
                Complete payment now
              </p>
            </div>
            <span className="text-base font-bold tabular-nums">
              {formatCurrency(pricePence, currency)}
            </span>
          </div>
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center pt-2">
        Payments are processed securely by Stripe. We never store your card details.
      </p>
    </div>
  );
}
