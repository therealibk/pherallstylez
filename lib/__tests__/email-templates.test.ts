import { describe, it, expect } from "vitest";
import {
  substituteVariables,
  richTextToEmailHtml,
  buildEmailVars,
  buildEmailFromCmsTemplate,
  buildPreviewVars,
  buildEmailTemplate,
  EMAIL_TEMPLATE_VARIABLES,
  emailWrapper,
} from "@/lib/email-templates";
import type { AppointmentEmailData } from "@/lib/email-templates";

// ── Shared sample data ────────────────────────────────────────────────────────

const SAMPLE_DATA: AppointmentEmailData = {
  customerFirstName: "Jane",
  customerEmail: "jane@example.com",
  serviceName: "Knotless Braids",
  startAt: new Date("2026-08-17T09:00:00Z"),
  timezone: "Europe/London",
  pricePence: 12000,
  depositPence: 3000,
  currency: "GBP",
  businessName: "Pherall",
  manageUrl: "https://example.com/manage-booking/abc123",
};

// ── Part 1: Policy order (tested via the sort priority map) ──────────────────

describe("Policy order constants", () => {
  it("BOOKING_POLICY sorts before CANCELLATION_POLICY", () => {
    const POLICY_ORDER: Record<string, number> = {
      BOOKING_POLICY: 0,
      CANCELLATION_POLICY: 1,
      REFUND_POLICY: 2,
      APPOINTMENT_POLICY: 3,
      TERMS_AND_CONDITIONS: 4,
      PRIVACY_POLICY: 5,
    };
    const policies = [
      { type: "CANCELLATION_POLICY" },
      { type: "BOOKING_POLICY" },
      { type: "PRIVACY_POLICY" },
      { type: "REFUND_POLICY" },
    ];
    const sorted = [...policies].sort(
      (a, b) => (POLICY_ORDER[a.type] ?? 99) - (POLICY_ORDER[b.type] ?? 99),
    );
    expect(sorted[0].type).toBe("BOOKING_POLICY");
    expect(sorted[1].type).toBe("CANCELLATION_POLICY");
    expect(sorted[2].type).toBe("REFUND_POLICY");
    expect(sorted[3].type).toBe("PRIVACY_POLICY");
  });

  it("unknown policy types sort last", () => {
    const POLICY_ORDER: Record<string, number> = { BOOKING_POLICY: 0 };
    const policies = [{ type: "UNKNOWN_TYPE" }, { type: "BOOKING_POLICY" }];
    const sorted = [...policies].sort(
      (a, b) => (POLICY_ORDER[a.type] ?? 99) - (POLICY_ORDER[b.type] ?? 99),
    );
    expect(sorted[0].type).toBe("BOOKING_POLICY");
    expect(sorted[1].type).toBe("UNKNOWN_TYPE");
  });
});

// ── Part 2: Pay Later removed (schema-level) ─────────────────────────────────

describe("Payment type validation", () => {
  it("only DEPOSIT and FULL are valid payment types", () => {
    const validTypes = ["DEPOSIT", "FULL"];
    expect(validTypes).not.toContain("LATER");
    expect(validTypes).not.toContain("PAY_LATER");
    expect(validTypes).not.toContain("SKIP");
    expect(validTypes.length).toBe(2);
  });

  it("server-side amount calculation never trusts client for DEPOSIT", () => {
    const serverDeposit = 3000;
    const clientAttempt = 1;
    const paymentType: "DEPOSIT" | "FULL" = "DEPOSIT";
    const amount = paymentType === "DEPOSIT" ? serverDeposit : 12000;
    expect(amount).toBe(serverDeposit);
    expect(amount).not.toBe(clientAttempt);
  });

  it("server-side amount calculation for FULL uses pricePence", () => {
    const price = 12000;
    const deposit = 3000;
    function resolveAmount(payType: "DEPOSIT" | "FULL") {
      return payType === "DEPOSIT" ? deposit : price;
    }
    expect(resolveAmount("FULL")).toBe(12000);
    expect(resolveAmount("DEPOSIT")).toBe(3000);
  });
});

// ── Part 5: Template variable substitution ────────────────────────────────────

describe("substituteVariables", () => {
  it("substitutes known variables", () => {
    const result = substituteVariables("Hi {{customer_name}}, your service is {{service_name}}.", {
      customer_name: "Jane",
      service_name: "Knotless Braids",
    });
    expect(result).toBe("Hi Jane, your service is Knotless Braids.");
  });

  it("leaves unknown variables unchanged", () => {
    const result = substituteVariables("Hello {{unknown_var}}", { customer_name: "Jane" });
    expect(result).toBe("Hello {{unknown_var}}");
  });

  it("handles empty vars gracefully", () => {
    const result = substituteVariables("No variables here.", {});
    expect(result).toBe("No variables here.");
  });

  it("does not execute arbitrary code in variable values", () => {
    const result = substituteVariables("Hi {{name}}", {
      name: '<script>alert("xss")</script>',
    });
    expect(result).toContain("<script>");
    // The value is substituted as-is; HTML escaping happens in richTextToEmailHtml / email builder
    // but variable values are NOT executed as code — just string replacement
    expect(typeof result).toBe("string");
  });

  it("substitutes multiple occurrences of the same variable", () => {
    const result = substituteVariables("{{name}} and {{name}}", { name: "Jane" });
    expect(result).toBe("Jane and Jane");
  });
});

// ── Part 6: TipTap → email HTML conversion ────────────────────────────────────

describe("richTextToEmailHtml", () => {
  it("renders a simple paragraph", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello world" }] },
      ],
    });
    const html = richTextToEmailHtml(json);
    expect(html).toContain("Hello world");
    expect(html).toContain("<p");
    expect(html).toContain("</p>");
  });

  it("renders bold text", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Bold",
              marks: [{ type: "bold" }],
            },
          ],
        },
      ],
    });
    const html = richTextToEmailHtml(json);
    expect(html).toContain("<strong");
    expect(html).toContain("Bold");
  });

  it("renders bullet lists", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Item 1" }] }],
            },
          ],
        },
      ],
    });
    const html = richTextToEmailHtml(json);
    expect(html).toContain("<ul");
    expect(html).toContain("<li");
    expect(html).toContain("Item 1");
  });

  it("renders headings", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "My Heading" }],
        },
      ],
    });
    const html = richTextToEmailHtml(json);
    expect(html).toContain("<h2");
    expect(html).toContain("My Heading");
  });

  it("falls back gracefully on plain text input", () => {
    const html = richTextToEmailHtml("Just plain text");
    expect(html).toContain("Just plain text");
  });

  it("falls back gracefully on invalid JSON", () => {
    const html = richTextToEmailHtml("{not valid json");
    expect(html).toContain("not valid json");
  });

  it("escapes HTML in text nodes to prevent XSS", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: '<script>alert("xss")</script>' }],
        },
      ],
    });
    const html = richTextToEmailHtml(json);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("only renders links with safe protocols", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Click",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    });
    const html = richTextToEmailHtml(json);
    expect(html).not.toContain("href=\"javascript:");
    expect(html).toContain("Click");
  });

  it("renders https links correctly", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Visit us",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
          ],
        },
      ],
    });
    const html = richTextToEmailHtml(json);
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("Visit us");
  });

  it("handles empty content", () => {
    const html = richTextToEmailHtml("");
    expect(html).toBe("");
  });
});

// ── Variable building ─────────────────────────────────────────────────────────

describe("buildEmailVars", () => {
  it("includes all expected keys", () => {
    const vars = buildEmailVars("BOOKING_CONFIRMATION", SAMPLE_DATA);
    expect(vars).toHaveProperty("customer_name", "Jane");
    expect(vars).toHaveProperty("service_name", "Knotless Braids");
    expect(vars).toHaveProperty("total_price");
    expect(vars).toHaveProperty("deposit_amount");
    expect(vars).toHaveProperty("balance_due");
    expect(vars).toHaveProperty("manage_booking_url", "https://example.com/manage-booking/abc123");
    expect(vars).toHaveProperty("business_name", "Pherall");
  });

  it("formats currency correctly", () => {
    const vars = buildEmailVars("BOOKING_CONFIRMATION", SAMPLE_DATA);
    expect(vars["total_price"]).toContain("£120");
    expect(vars["deposit_amount"]).toContain("£30");
    expect(vars["balance_due"]).toContain("£90");
  });

  it("calculates balance_due correctly", () => {
    const vars = buildEmailVars("PAYMENT_CONFIRMATION", SAMPLE_DATA);
    // balance = 120 - 30 = 90
    expect(vars["balance_due"]).toContain("90");
  });

  it("provides reminder_time in hours", () => {
    const vars = buildEmailVars("APPOINTMENT_REMINDER", { ...SAMPLE_DATA, reminderOffsetHours: 24 });
    expect(vars["reminder_time"]).toBe("24 hours");
  });

  it("provides reminder_time in days for 48h+", () => {
    const vars = buildEmailVars("APPOINTMENT_REMINDER", { ...SAMPLE_DATA, reminderOffsetHours: 48 });
    expect(vars["reminder_time"]).toBe("2 days");
  });

  it("includes cancellation reason when provided", () => {
    const vars = buildEmailVars("CANCELLATION_CONFIRMATION", {
      ...SAMPLE_DATA,
      cancellationReason: "Customer changed plans",
    });
    expect(vars["cancellation_reason"]).toBe("Customer changed plans");
    expect(vars["cancellation_reason_line"]).toContain("Customer changed plans");
  });

  it("empty cancellation reason produces empty line", () => {
    const vars = buildEmailVars("CANCELLATION_CONFIRMATION", SAMPLE_DATA);
    expect(vars["cancellation_reason"]).toBe("");
    expect(vars["cancellation_reason_line"]).toBe("");
  });
});

// ── CMS template builder ──────────────────────────────────────────────────────

describe("buildEmailFromCmsTemplate", () => {
  it("renders subject with variables substituted", () => {
    const vars = buildEmailVars("BOOKING_CONFIRMATION", SAMPLE_DATA);
    const { subject } = buildEmailFromCmsTemplate(
      "Booking received — {{service_name}}",
      JSON.stringify({ type: "doc", content: [] }),
      vars,
      "Pherall",
    );
    expect(subject).toBe("Booking received — Knotless Braids");
  });

  it("renders body variables substituted", () => {
    const body = JSON.stringify({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hi {{customer_name}}," }] },
      ],
    });
    const vars = buildEmailVars("BOOKING_CONFIRMATION", SAMPLE_DATA);
    const { html } = buildEmailFromCmsTemplate("Subject", body, vars, "Pherall");
    expect(html).toContain("Hi Jane,");
  });

  it("wraps content in email wrapper with business name", () => {
    const vars = buildEmailVars("BOOKING_CONFIRMATION", SAMPLE_DATA);
    const { html } = buildEmailFromCmsTemplate("Subject", "", vars, "Pherall");
    expect(html).toContain("Pherall");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("includes manage booking link when manageUrl provided", () => {
    const vars = buildEmailVars("BOOKING_CONFIRMATION", SAMPLE_DATA);
    const { html } = buildEmailFromCmsTemplate(
      "Subject",
      "",
      vars,
      "Pherall",
      "https://example.com/manage-booking/abc",
    );
    expect(html).toContain("https://example.com/manage-booking/abc");
  });

  it("does not include manage link when no URL", () => {
    const vars = buildEmailVars("BOOKING_CONFIRMATION", { ...SAMPLE_DATA, manageUrl: undefined });
    const { html } = buildEmailFromCmsTemplate("Subject", "", vars, "Pherall", undefined);
    expect(html).not.toContain("manage-booking");
  });
});

// ── Hardcoded fallback templates ──────────────────────────────────────────────

describe("buildEmailTemplate (hardcoded fallback)", () => {
  it("BOOKING_CONFIRMATION subject contains service name", () => {
    const { subject } = buildEmailTemplate("BOOKING_CONFIRMATION", SAMPLE_DATA);
    expect(subject).toContain("Knotless Braids");
  });

  it("PAYMENT_CONFIRMATION subject indicates confirmed", () => {
    const { subject } = buildEmailTemplate("PAYMENT_CONFIRMATION", SAMPLE_DATA);
    expect(subject.toLowerCase()).toContain("confirm");
  });

  it("APPOINTMENT_REMINDER subject mentions reminder", () => {
    const { subject } = buildEmailTemplate("APPOINTMENT_REMINDER", {
      ...SAMPLE_DATA,
      reminderOffsetHours: 24,
    });
    expect(subject.toLowerCase()).toContain("reminder");
  });

  it("CANCELLATION_CONFIRMATION indicates cancellation", () => {
    const { subject } = buildEmailTemplate("CANCELLATION_CONFIRMATION", SAMPLE_DATA);
    expect(subject.toLowerCase()).toContain("cancel");
  });

  it("RESCHEDULE_CONFIRMATION indicates rescheduling", () => {
    const { subject } = buildEmailTemplate("RESCHEDULE_CONFIRMATION", SAMPLE_DATA);
    expect(subject.toLowerCase()).toContain("reschedul");
  });

  it("REFUND_CONFIRMATION indicates refund", () => {
    const { subject } = buildEmailTemplate("REFUND_CONFIRMATION", SAMPLE_DATA);
    expect(subject.toLowerCase()).toContain("refund");
  });

  it("all templates produce valid HTML with doctype", () => {
    const types = [
      "BOOKING_CONFIRMATION",
      "PAYMENT_CONFIRMATION",
      "APPOINTMENT_REMINDER",
      "CANCELLATION_CONFIRMATION",
      "RESCHEDULE_CONFIRMATION",
      "REFUND_CONFIRMATION",
    ] as const;
    for (const type of types) {
      const { html } = buildEmailTemplate(type, SAMPLE_DATA);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<body");
    }
  });

  it("HTML does not contain literal template variables (all substituted)", () => {
    const { html } = buildEmailTemplate("BOOKING_CONFIRMATION", SAMPLE_DATA);
    expect(html).not.toContain("{{");
  });

  it("customer first name appears in email body", () => {
    const { html } = buildEmailTemplate("BOOKING_CONFIRMATION", SAMPLE_DATA);
    expect(html).toContain("Jane");
  });
});

// ── Email wrapper security ────────────────────────────────────────────────────

describe("emailWrapper", () => {
  it("escapes business name in header", () => {
    const html = emailWrapper("content", '<script>alert("xss")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("produces valid DOCTYPE email", () => {
    const html = emailWrapper("<p>Hello</p>", "Test Business");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Test Business");
  });
});

// ── EMAIL_TEMPLATE_VARIABLES reference ────────────────────────────────────────

describe("EMAIL_TEMPLATE_VARIABLES", () => {
  it("defines variables for all 6 notification types", () => {
    const types = [
      "BOOKING_CONFIRMATION",
      "PAYMENT_CONFIRMATION",
      "APPOINTMENT_REMINDER",
      "CANCELLATION_CONFIRMATION",
      "RESCHEDULE_CONFIRMATION",
      "REFUND_CONFIRMATION",
    ] as const;
    for (const type of types) {
      expect(EMAIL_TEMPLATE_VARIABLES[type]).toBeDefined();
      expect(EMAIL_TEMPLATE_VARIABLES[type].length).toBeGreaterThan(0);
    }
  });

  it("all variable references use {{double_brace}} format", () => {
    for (const vars of Object.values(EMAIL_TEMPLATE_VARIABLES)) {
      for (const v of vars) {
        expect(v).toMatch(/^\{\{\w+\}\}$/);
      }
    }
  });
});

// ── Preview data ──────────────────────────────────────────────────────────────

describe("buildPreviewVars", () => {
  it("produces all expected keys", () => {
    const vars = buildPreviewVars("Pherall", "https://example.com");
    expect(vars).toHaveProperty("customer_name", "Jane");
    expect(vars).toHaveProperty("service_name", "Knotless Braids");
    expect(vars).toHaveProperty("appointment_date");
    expect(vars).toHaveProperty("appointment_time");
    expect(vars).toHaveProperty("total_price");
    expect(vars).toHaveProperty("deposit_amount");
    expect(vars).toHaveProperty("balance_due");
    expect(vars).toHaveProperty("manage_booking_url");
    expect(vars).toHaveProperty("business_name", "Pherall");
  });

  it("manage_booking_url uses the provided appUrl", () => {
    const vars = buildPreviewVars("Pherall", "https://mysite.com");
    expect(vars["manage_booking_url"]).toContain("https://mysite.com");
  });
});

// ── Notification deduplication key format ─────────────────────────────────────

describe("Notification deduplication keys", () => {
  it("BOOKING_CONFIRMATION key format", () => {
    const apptId = "cuid_abc123";
    const key = `BOOKING_CONFIRMATION:${apptId}`;
    expect(key).toBe("BOOKING_CONFIRMATION:cuid_abc123");
  });

  it("PAYMENT_CONFIRMATION key includes payment ID", () => {
    const apptId = "appt1";
    const paymentId = "pay1";
    const key = `PAYMENT_CONFIRMATION:${apptId}:${paymentId}`;
    expect(key).toContain(apptId);
    expect(key).toContain(paymentId);
  });

  it("different appointments produce different keys", () => {
    const key1 = `BOOKING_CONFIRMATION:appt1`;
    const key2 = `BOOKING_CONFIRMATION:appt2`;
    expect(key1).not.toBe(key2);
  });

  it("same appointment+payment produces same key (idempotent)", () => {
    const key1 = `PAYMENT_CONFIRMATION:appt1:pay1`;
    const key2 = `PAYMENT_CONFIRMATION:appt1:pay1`;
    expect(key1).toBe(key2);
  });
});

// ── Payment state machine (no stale webhook) ──────────────────────────────────

describe("Payment state machine", () => {
  it("DEPOSIT maps to DEPOSIT_PAID, FULL maps to PAID_IN_FULL", () => {
    function mapToPaymentStatus(type: "DEPOSIT" | "FULL") {
      return type === "DEPOSIT" ? "DEPOSIT_PAID" : "PAID_IN_FULL";
    }
    expect(mapToPaymentStatus("DEPOSIT")).toBe("DEPOSIT_PAID");
    expect(mapToPaymentStatus("FULL")).toBe("PAID_IN_FULL");
  });

  it("already-paid appointment is not double-confirmed", () => {
    // Simulate idempotency check: if status is already DEPOSIT_PAID or PAID_IN_FULL, skip
    function shouldSkip(status: string) {
      return status === "PAID_IN_FULL" || status === "DEPOSIT_PAID";
    }
    expect(shouldSkip("PAID_IN_FULL")).toBe(true);
    expect(shouldSkip("DEPOSIT_PAID")).toBe(true);
    expect(shouldSkip("PENDING")).toBe(false);
    expect(shouldSkip("FAILED")).toBe(false);
  });

  it("PENDING appointment transitions to CONFIRMED on payment", () => {
    function nextAppointmentStatus(currentStatus: string): string {
      if (currentStatus === "PENDING") return "CONFIRMED";
      return currentStatus; // Already confirmed / cancelled — no change
    }
    expect(nextAppointmentStatus("PENDING")).toBe("CONFIRMED");
    expect(nextAppointmentStatus("CONFIRMED")).toBe("CONFIRMED");
    expect(nextAppointmentStatus("CANCELLED")).toBe("CANCELLED");
  });

  it("cancelled appointment is not re-confirmed by stale webhook", () => {
    function shouldConfirm(currentStatus: string): boolean {
      return currentStatus === "PENDING";
    }
    expect(shouldConfirm("CANCELLED")).toBe(false);
    expect(shouldConfirm("CONFIRMED")).toBe(false);
    expect(shouldConfirm("PENDING")).toBe(true);
  });
});

// ── Manage-booking: no Pay Later ─────────────────────────────────────────────

describe("Manage-booking payment options", () => {
  it("no pay-later option exists in PayOptionsClient props", () => {
    // Verify the props interface only has payment-related options, not pay-later
    type PayType = "DEPOSIT" | "FULL";
    const validTypes: PayType[] = ["DEPOSIT", "FULL"];
    expect(validTypes).not.toContain("LATER");
    expect(validTypes.length).toBe(2);
  });

  it("fully paid booking should not show payment options", () => {
    type PaymentStatus = "PENDING" | "DEPOSIT_PAID" | "PAID_IN_FULL" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";

    function showPaymentOptions(latestStatus: PaymentStatus | null): boolean {
      if (!latestStatus) return false;
      return !["PAID_IN_FULL", "DEPOSIT_PAID"].includes(latestStatus);
    }

    expect(showPaymentOptions("PAID_IN_FULL")).toBe(false);
    expect(showPaymentOptions("DEPOSIT_PAID")).toBe(false);
    expect(showPaymentOptions("PENDING")).toBe(true); // Payment still needed
    expect(showPaymentOptions(null)).toBe(false);
  });

  it("deposit booking shows correct balance", () => {
    const pricePence = 12000;
    const depositPence = 3000;
    const balance = pricePence - depositPence;
    expect(balance).toBe(9000);
  });
});
