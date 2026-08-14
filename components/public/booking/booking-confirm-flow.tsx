"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBooking } from "@/lib/actions/booking";
import type {
  SerializedQuestion,
  SerializedPolicy,
  BookingPageData,
} from "@/lib/actions/booking";
import type { CustomerDetailsInput, QuestionAnswerInput } from "@/lib/booking-schemas";
import { customerDetailsSchema } from "@/lib/booking-schemas";
import {
  formatGBP,
  formatDuration,
  DEPOSIT_TYPE,
} from "@/lib/service-format-utils";

type Step = "details" | "questions" | "policies" | "review";

interface Props {
  service: BookingPageData["service"];
  policies: SerializedPolicy[];
  dateStr: string;
  timeStr: string;
  timezone: string;
}

function depositLabel(service: Props["service"]): string | null {
  const { depositType, depositPence, depositPercentage, pricePence } = service;
  switch (depositType) {
    case DEPOSIT_TYPE.NONE:
      return null;
    case DEPOSIT_TYPE.FIXED:
      return depositPence != null ? `Deposit: ${formatGBP(depositPence)}` : null;
    case DEPOSIT_TYPE.PERCENTAGE:
      return depositPercentage != null
        ? `Deposit: ${depositPercentage}% (${formatGBP(Math.round((pricePence * depositPercentage) / 100))})`
        : null;
    case DEPOSIT_TYPE.FULL:
      return `Full payment required: ${formatGBP(pricePence)}`;
    default:
      return null;
  }
}

// ── Nav buttons ────────────────────────────────────────────────────────────────

function PrimaryButton({
  type = "submit",
  onClick,
  disabled,
  children,
}: {
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ background: "var(--button,#1a1a1a)", color: "var(--button-foreground,#fff)" }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold border transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ borderColor: "var(--border,#e5e7eb)", color: "var(--foreground)" }}
    >
      {children}
    </button>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ steps, current }: { steps: Step[]; current: Step }) {
  const labels: Record<Step, string> = {
    details: "Your details",
    questions: "Questions",
    policies: "Policies",
    review: "Review",
  };
  const currentIdx = steps.indexOf(current);

  return (
    <div className="flex items-center gap-1 mb-10" aria-label="Booking progress">
      {steps.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={step} className="flex items-center gap-1 min-w-0">
            <div
              className={[
                "flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-semibold shrink-0 transition-colors",
                done ? "text-background" : active ? "ring-2 ring-offset-1" : "ring-1",
              ].join(" ")}
              style={
                done
                  ? { background: "var(--foreground)", color: "var(--background)" }
                  : active
                  ? {
                      color: "var(--foreground)",
                      boxShadow: "0 0 0 2px var(--foreground)",
                    }
                  : { color: "var(--muted-foreground,#888)", boxShadow: "0 0 0 1px var(--border,#e5e7eb)" }
              }
              aria-current={active ? "step" : undefined}
            >
              {done ? "✓" : idx + 1}
            </div>
            <span
              className={[
                "text-xs hidden sm:inline truncate",
                active ? "font-semibold" : "text-muted-foreground",
              ].join(" ")}
              style={active ? { color: "var(--foreground)" } : {}}
            >
              {labels[step]}
            </span>
            {idx < steps.length - 1 && (
              <div className="h-px w-5 mx-1 bg-border shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Row (used in review + confirmation) ───────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 flex flex-wrap gap-2 justify-between text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : (
          <span className="text-muted-foreground font-normal"> (optional)</span>
        )}
      </Label>
      {children}
      {error && (
        <p id={`err-${id}`} className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

// ── Details step ──────────────────────────────────────────────────────────────

function DetailsStep({
  initial,
  onNext,
}: {
  initial: Partial<CustomerDetailsInput>;
  onNext: (data: CustomerDetailsInput) => void;
}) {
  const [values, setValues] = useState<CustomerDetailsInput>({
    firstName: initial.firstName ?? "",
    lastName: initial.lastName ?? "",
    email: initial.email ?? "",
    phone: initial.phone ?? "",
    notes: initial.notes ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerDetailsInput, string>>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = customerDetailsSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof CustomerDetailsInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onNext(result.data);
  }

  function field(key: keyof CustomerDetailsInput) {
    return {
      value: values[key] ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setValues((v) => ({ ...v, [key]: e.target.value }));
        if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
      },
      "aria-invalid": errors[key] ? (true as const) : undefined,
      "aria-describedby": errors[key] ? `err-${key}` : undefined,
    };
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
        Your details
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="firstName" label="First name" required error={errors.firstName}>
          <Input id="firstName" autoComplete="given-name" {...field("firstName")} />
        </Field>
        <Field id="lastName" label="Last name" required error={errors.lastName}>
          <Input id="lastName" autoComplete="family-name" {...field("lastName")} />
        </Field>
      </div>

      <Field id="email" label="Email address" required error={errors.email}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" {...field("email")} />
      </Field>

      <Field id="phone" label="Phone number" required error={errors.phone}>
        <Input id="phone" type="tel" autoComplete="tel" inputMode="tel" {...field("phone")} />
      </Field>

      <div className="space-y-1.5">
        <Label htmlFor="notes">
          Additional notes{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          rows={3}
          placeholder="Anything you'd like us to know…"
          value={values.notes ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
        />
      </div>

      <div className="flex justify-end pt-2">
        <PrimaryButton>Continue</PrimaryButton>
      </div>
    </form>
  );
}

// ── Questions step ─────────────────────────────────────────────────────────────

function QuestionsStep({
  questions,
  initial,
  onNext,
  onBack,
}: {
  questions: SerializedQuestion[];
  initial: QuestionAnswerInput[];
  onNext: (answers: QuestionAnswerInput[]) => void;
  onBack: () => void;
}) {
  const initialMap = new Map(initial.map((a) => [a.questionId, a.answer]));
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(questions.map((q) => [q.id, initialMap.get(q.id) ?? ""])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setValue(questionId: string, value: string) {
    setValues((prev) => ({ ...prev, [questionId]: value }));
    if (errors[questionId]) setErrors((prev) => ({ ...prev, [questionId]: "" }));
  }

  function toggleCheckbox(questionId: string, optionLabel: string) {
    const current: string[] = (() => {
      try {
        const v = values[questionId];
        return v ? (JSON.parse(v) as string[]) : [];
      } catch {
        return [];
      }
    })();
    const next = current.includes(optionLabel)
      ? current.filter((l) => l !== optionLabel)
      : [...current, optionLabel];
    setValue(questionId, JSON.stringify(next));
  }

  function getCheckboxSelected(questionId: string): string[] {
    try {
      const v = values[questionId];
      return v ? (JSON.parse(v) as string[]) : [];
    } catch {
      return [];
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    for (const q of questions) {
      const val = values[q.id] ?? "";
      if (q.required) {
        if (q.questionType === "CHECKBOX") {
          if (getCheckboxSelected(q.id).length === 0) {
            newErrors[q.id] = "Please select at least one option";
          }
        } else if (!val.trim()) {
          newErrors[q.id] = "This field is required";
        }
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    const answers: QuestionAnswerInput[] = questions
      .filter((q) => {
        const val = values[q.id] ?? "";
        if (q.questionType === "CHECKBOX") return getCheckboxSelected(q.id).length > 0;
        return val.trim().length > 0;
      })
      .map((q) => ({
        questionId: q.id,
        questionLabel: q.label,
        answer: values[q.id] ?? "",
      }));
    onNext(answers);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
        Service questions
      </h2>

      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <Label htmlFor={`q-${q.id}`}>
            {q.label}
            {q.required ? " *" : (
              <span className="text-muted-foreground font-normal"> (optional)</span>
            )}
          </Label>

          {q.questionType === "TEXT" && (
            <Input
              id={`q-${q.id}`}
              value={values[q.id] ?? ""}
              onChange={(e) => setValue(q.id, e.target.value)}
              aria-invalid={errors[q.id] ? true : undefined}
            />
          )}

          {q.questionType === "TEXTAREA" && (
            <Textarea
              id={`q-${q.id}`}
              rows={3}
              value={values[q.id] ?? ""}
              onChange={(e) => setValue(q.id, e.target.value)}
              aria-invalid={errors[q.id] ? true : undefined}
            />
          )}

          {q.questionType === "SELECT" && (
            <Select
              value={values[q.id] ?? ""}
              onValueChange={(v) => v && setValue(q.id, v)}
            >
              <SelectTrigger id={`q-${q.id}`} aria-invalid={errors[q.id] ? true : undefined}>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {q.options.map((opt) => (
                  <SelectItem key={opt.id} value={opt.label}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {q.questionType === "RADIO" && (
            <div className="space-y-2" role="radiogroup" aria-labelledby={`q-${q.id}`}>
              {q.options.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={opt.label}
                    checked={values[q.id] === opt.label}
                    onChange={() => setValue(q.id, opt.label)}
                    className="h-4 w-4 accent-foreground"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          )}

          {q.questionType === "CHECKBOX" && (
            <div className="space-y-2" role="group" aria-labelledby={`q-${q.id}`}>
              {q.options.map((opt) => {
                const selected = getCheckboxSelected(q.id);
                return (
                  <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes(opt.label)}
                      onChange={() => toggleCheckbox(q.id, opt.label)}
                      className="h-4 w-4 accent-foreground rounded"
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          )}

          {errors[q.id] && (
            <p className="text-xs text-destructive">{errors[q.id]}</p>
          )}
        </div>
      ))}

      <div className="flex justify-between pt-2">
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        <PrimaryButton>Continue</PrimaryButton>
      </div>
    </form>
  );
}

// ── Policies step ─────────────────────────────────────────────────────────────

function PoliciesStep({
  policies,
  initial,
  onNext,
  onBack,
}: {
  policies: SerializedPolicy[];
  initial: Set<string>;
  onNext: (accepted: Set<string>) => void;
  onBack: () => void;
}) {
  const [accepted, setAccepted] = useState<Set<string>>(new Set(initial));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  function toggle(type: string) {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (accepted.size < policies.length) return;
    onNext(new Set(accepted));
  }

  const allAccepted = accepted.size === policies.length;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
          Policies
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Please read and accept all policies to continue.
        </p>
      </div>

      {policies.map((policy) => {
        const isAccepted = accepted.has(policy.type);
        const isOpen = expanded === policy.type;

        return (
          <div
            key={policy.type}
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: "var(--border,#e5e7eb)" }}
          >
            <div className="px-4 py-3 flex items-start gap-3">
              <input
                id={`policy-${policy.type}`}
                type="checkbox"
                checked={isAccepted}
                onChange={() => toggle(policy.type)}
                className="mt-0.5 h-4 w-4 accent-foreground rounded shrink-0"
                aria-describedby={
                  attempted && !isAccepted ? `policy-err-${policy.type}` : undefined
                }
              />
              <div className="flex-1 min-w-0">
                <label
                  htmlFor={`policy-${policy.type}`}
                  className="text-sm font-medium cursor-pointer"
                  style={{ color: "var(--foreground)" }}
                >
                  I have read and accept the {policy.title}
                </label>
                {attempted && !isAccepted && (
                  <p
                    id={`policy-err-${policy.type}`}
                    className="text-xs text-destructive mt-0.5"
                  >
                    You must accept this policy
                  </p>
                )}
              </div>
              <button
                type="button"
                className="text-xs text-muted-foreground underline underline-offset-2 shrink-0 hover:text-foreground transition-colors"
                onClick={() => setExpanded(isOpen ? null : policy.type)}
                aria-expanded={isOpen}
              >
                {isOpen ? "Hide" : "Read"}
              </button>
            </div>

            {isOpen && (
              <div
                className="px-4 pb-4 pt-2 border-t max-h-64 overflow-y-auto"
                style={{ borderColor: "var(--border,#e5e7eb)" }}
              >
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">
                  {policy.content}
                </pre>
              </div>
            )}
          </div>
        );
      })}

      {attempted && !allAccepted && (
        <p className="text-sm text-destructive" role="alert">
          Please accept all policies to continue.
        </p>
      )}

      <div className="flex justify-between pt-2">
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        <PrimaryButton>Continue</PrimaryButton>
      </div>
    </form>
  );
}

// ── Review step ───────────────────────────────────────────────────────────────

function ReviewStep({
  service,
  dateStr,
  timeStr,
  customer,
  answers,
  acceptedPolicies,
  policies,
  onBack,
  onSubmit,
  isPending,
  submitError,
}: {
  service: Props["service"];
  dateStr: string;
  timeStr: string;
  customer: CustomerDetailsInput;
  answers: QuestionAnswerInput[];
  acceptedPolicies: Set<string>;
  policies: SerializedPolicy[];
  onBack: () => void;
  onSubmit: () => void;
  isPending: boolean;
  submitError: string | null;
}) {
  function renderAnswer(answer: QuestionAnswerInput, question: SerializedQuestion | undefined) {
    if (!question) return answer.answer;
    if (question.questionType === "CHECKBOX") {
      try {
        const selected = JSON.parse(answer.answer) as string[];
        return selected.join(", ");
      } catch {
        return answer.answer;
      }
    }
    return answer.answer;
  }

  const acceptedPolicyList = policies.filter((p) => acceptedPolicies.has(p.type));
  const dep = depositLabel(service);
  const questionMap = new Map(service.questions.map((q) => [q.id, q]));

  const displayDate = new Intl.DateTimeFormat("en-GB", { dateStyle: "full" }).format(
    new Date(dateStr + "T12:00:00Z"),
  );

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
        Review your booking
      </h2>

      <section
        className="rounded-2xl border divide-y text-sm overflow-hidden"
        style={{ borderColor: "var(--border,#e5e7eb)" }}
      >
        <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Appointment
        </div>
        <Row label="Service" value={service.name} />
        <Row label="Date" value={displayDate} />
        <Row label="Time" value={timeStr} />
        <Row label="Duration" value={formatDuration(service.durationMins)} />
        <Row label="Price" value={formatGBP(service.pricePence)} />
        {dep && <Row label="Payment" value={dep} />}
      </section>

      <section
        className="rounded-2xl border divide-y text-sm overflow-hidden"
        style={{ borderColor: "var(--border,#e5e7eb)" }}
      >
        <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Your details
        </div>
        <Row label="Name" value={`${customer.firstName} ${customer.lastName}`} />
        <Row label="Email" value={customer.email} />
        <Row label="Phone" value={customer.phone} />
        {customer.notes && <Row label="Notes" value={customer.notes} />}
      </section>

      {answers.length > 0 && (
        <section
          className="rounded-2xl border divide-y text-sm overflow-hidden"
          style={{ borderColor: "var(--border,#e5e7eb)" }}
        >
          <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Additional information
          </div>
          {answers.map((a) => (
            <Row
              key={a.questionId}
              label={a.questionLabel}
              value={renderAnswer(a, questionMap.get(a.questionId))}
            />
          ))}
        </section>
      )}

      {acceptedPolicyList.length > 0 && (
        <section
          className="rounded-2xl border divide-y text-sm overflow-hidden"
          style={{ borderColor: "var(--border,#e5e7eb)" }}
        >
          <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Policies accepted
          </div>
          {acceptedPolicyList.map((p) => (
            <div key={p.type} className="px-4 py-3 flex items-center gap-2 text-sm">
              <span className="shrink-0 text-green-600" aria-hidden="true">✓</span>
              {p.title}
            </div>
          ))}
        </section>
      )}

      {submitError && (
        <div
          className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {submitError}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <SecondaryButton onClick={onBack} disabled={isPending}>
          Back
        </SecondaryButton>
        <PrimaryButton type="button" onClick={onSubmit} disabled={isPending}>
          {isPending ? "Booking…" : "Confirm booking"}
        </PrimaryButton>
      </div>
    </div>
  );
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export function BookingConfirmFlow({ service, policies, dateStr, timeStr }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const steps: Step[] = ["details"];
  if (service.questions.length > 0) steps.push("questions");
  if (policies.length > 0) steps.push("policies");
  steps.push("review");

  const [currentStep, setCurrentStep] = useState<Step>(steps[0]);
  const [customer, setCustomer] = useState<CustomerDetailsInput>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [answers, setAnswers] = useState<QuestionAnswerInput[]>([]);
  const [acceptedPolicies, setAcceptedPolicies] = useState<Set<string>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);

  function goToStep(step: Step) {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    const idx = steps.indexOf(currentStep);
    if (idx > 0) goToStep(steps[idx - 1]);
    else router.back();
  }

  function handleDetailsNext(data: CustomerDetailsInput) {
    setCustomer(data);
    goToStep(steps[steps.indexOf("details") + 1]);
  }

  function handleQuestionsNext(data: QuestionAnswerInput[]) {
    setAnswers(data);
    goToStep(steps[steps.indexOf("questions") + 1]);
  }

  function handlePoliciesNext(accepted: Set<string>) {
    setAcceptedPolicies(accepted);
    goToStep("review");
  }

  function handleSubmit() {
    setSubmitError(null);
    startTransition(async () => {
      const result = await createBooking({
        serviceSlug: service.slug,
        dateStr,
        timeStr,
        customer,
        answers,
        policies: [...acceptedPolicies].map((type) => ({ policyType: type, accepted: true })),
      });

      if (result.success) {
        if (service.depositType !== DEPOSIT_TYPE.NONE) {
          router.push(`/book/pay/${result.token}`);
        } else {
          router.push(`/book/confirmation/${result.token}`);
        }
      } else {
        setSubmitError(result.error);
      }
    });
  }

  return (
    <div>
      <StepIndicator steps={steps} current={currentStep} />

      {currentStep === "details" && (
        <DetailsStep initial={customer} onNext={handleDetailsNext} />
      )}

      {currentStep === "questions" && (
        <QuestionsStep
          questions={service.questions}
          initial={answers}
          onNext={handleQuestionsNext}
          onBack={goBack}
        />
      )}

      {currentStep === "policies" && (
        <PoliciesStep
          policies={policies}
          initial={acceptedPolicies}
          onNext={handlePoliciesNext}
          onBack={goBack}
        />
      )}

      {currentStep === "review" && (
        <ReviewStep
          service={service}
          dateStr={dateStr}
          timeStr={timeStr}
          customer={customer}
          answers={answers}
          acceptedPolicies={acceptedPolicies}
          policies={policies}
          onBack={goBack}
          onSubmit={handleSubmit}
          isPending={isPending}
          submitError={submitError}
        />
      )}
    </div>
  );
}
