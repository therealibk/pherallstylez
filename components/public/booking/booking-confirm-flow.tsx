"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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

// ── Step type ─────────────────────────────────────────────────────────────────

type Step = "details" | "questions" | "policies" | "review";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  service: BookingPageData["service"];
  policies: SerializedPolicy[];
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:MM
  timezone: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDisplayDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "full" }).format(
    new Date(dateStr + "T12:00:00Z"),
  );
}

function formatDisplayTime(timeStr: string): string {
  return timeStr;
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

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({
  steps,
  current,
}: {
  steps: Step[];
  current: Step;
}) {
  const labels: Record<Step, string> = {
    details: "Your details",
    questions: "Questions",
    policies: "Policies",
    review: "Review",
  };
  const currentIdx = steps.indexOf(current);

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={[
                "flex items-center justify-center h-7 w-7 rounded-full text-xs font-semibold shrink-0",
                done
                  ? "bg-foreground text-background"
                  : active
                  ? "ring-2 ring-foreground text-foreground"
                  : "text-muted-foreground ring-1 ring-border",
              ].join(" ")}
            >
              {done ? "✓" : idx + 1}
            </div>
            <span
              className={[
                "text-sm hidden sm:inline",
                active ? "font-semibold" : "text-muted-foreground",
              ].join(" ")}
            >
              {labels[step]}
            </span>
            {idx < steps.length - 1 && (
              <div className="h-px w-6 bg-border shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Booking summary bar ───────────────────────────────────────────────────────

function BookingSummaryBar({
  service,
  dateStr,
  timeStr,
}: {
  service: Props["service"];
  dateStr: string;
  timeStr: string;
}) {
  return (
    <div className="rounded-xl border bg-muted/40 px-4 py-3 mb-6 text-sm flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
      <span className="font-medium text-foreground">{service.name}</span>
      <span>{formatDisplayDate(dateStr)}</span>
      <span>{formatDisplayTime(timeStr)}</span>
      <span>{formatDuration(service.durationMins)}</span>
      <span className="font-medium text-foreground">{formatGBP(service.pricePence)}</span>
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
      "aria-invalid": errors[key] ? true : undefined,
      "aria-describedby": errors[key] ? `err-${key}` : undefined,
    };
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <h2 className="text-lg font-semibold">Your details</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First name *</Label>
          <Input id="firstName" autoComplete="given-name" {...field("firstName")} />
          {errors.firstName && (
            <p id="err-firstName" className="text-xs text-destructive">{errors.firstName}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last name *</Label>
          <Input id="lastName" autoComplete="family-name" {...field("lastName")} />
          {errors.lastName && (
            <p id="err-lastName" className="text-xs text-destructive">{errors.lastName}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email address *</Label>
        <Input id="email" type="email" autoComplete="email" inputMode="email" {...field("email")} />
        {errors.email && (
          <p id="err-email" className="text-xs text-destructive">{errors.email}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone number *</Label>
        <Input id="phone" type="tel" autoComplete="tel" inputMode="tel" {...field("phone")} />
        {errors.phone && (
          <p id="err-phone" className="text-xs text-destructive">{errors.phone}</p>
        )}
      </div>

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
          onChange={(e) => {
            setValues((v) => ({ ...v, notes: e.target.value }));
          }}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit">Continue</Button>
      </div>
    </form>
  );
}

// ── Questions step ────────────────────────────────────────────────────────────

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
          const selected = getCheckboxSelected(q.id);
          if (selected.length === 0) {
            newErrors[q.id] = `Please select at least one option`;
          }
        } else if (!val.trim()) {
          newErrors[q.id] = `This field is required`;
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
      <h2 className="text-lg font-semibold">Service questions</h2>

      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <Label htmlFor={`q-${q.id}`}>
            {q.label}
            {q.required && " *"}
            {!q.required && (
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
                <label
                  key={opt.id}
                  className="flex items-center gap-2.5 cursor-pointer text-sm"
                >
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
                  <label
                    key={opt.id}
                    className="flex items-center gap-2.5 cursor-pointer text-sm"
                  >
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
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Continue</Button>
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
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Policies</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Please read and accept all policies to continue.
        </p>
      </div>

      {policies.map((policy) => {
        const isAccepted = accepted.has(policy.type);
        const isOpen = expanded === policy.type;

        return (
          <div key={policy.type} className="rounded-xl border overflow-hidden">
            <div className="px-4 py-3 flex items-start gap-3 bg-card">
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
              <div className="px-4 pb-4 pt-2 border-t text-sm prose prose-sm max-w-none max-h-64 overflow-y-auto">
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
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Continue</Button>
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

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Review your booking</h2>

      {/* Appointment details */}
      <section className="rounded-xl border divide-y text-sm">
        <div className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Appointment
        </div>
        <Row label="Service" value={service.name} />
        <Row label="Date" value={formatDisplayDate(dateStr)} />
        <Row label="Time" value={formatDisplayTime(timeStr)} />
        <Row label="Duration" value={formatDuration(service.durationMins)} />
        <Row label="Price" value={formatGBP(service.pricePence)} />
        {dep && <Row label="Payment" value={dep} />}
      </section>

      {/* Customer details */}
      <section className="rounded-xl border divide-y text-sm">
        <div className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Your details
        </div>
        <Row label="Name" value={`${customer.firstName} ${customer.lastName}`} />
        <Row label="Email" value={customer.email} />
        <Row label="Phone" value={customer.phone} />
        {customer.notes && <Row label="Notes" value={customer.notes} />}
      </section>

      {/* Service questions */}
      {answers.length > 0 && (
        <section className="rounded-xl border divide-y text-sm">
          <div className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
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

      {/* Policies */}
      {acceptedPolicyList.length > 0 && (
        <section className="rounded-xl border divide-y text-sm">
          <div className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Policies accepted
          </div>
          {acceptedPolicyList.map((p) => (
            <div key={p.type} className="px-4 py-3 flex items-center gap-2">
              <span className="text-green-600 shrink-0" aria-hidden="true">✓</span>
              {p.title}
            </div>
          ))}
        </section>
      )}

      {submitError && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {submitError}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isPending}>
          Back
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isPending}
          style={{ minWidth: "10rem" }}
        >
          {isPending ? "Booking…" : "Confirm booking"}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 flex flex-wrap gap-2 justify-between text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export function BookingConfirmFlow({
  service,
  policies,
  dateStr,
  timeStr,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Compute ordered steps
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
        router.push(`/book/confirmation/${result.token}`);
      } else {
        setSubmitError(result.error);
      }
    });
  }

  return (
    <div>
      <BookingSummaryBar service={service} dateStr={dateStr} timeStr={timeStr} />
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
