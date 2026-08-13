"use client";

import { ChevronUp, ChevronDown, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  QUESTION_TYPE,
  type QuestionTypeValue,
  type ServiceQuestionInput,
  type ServiceQuestionOptionInput,
  QUESTION_TYPE_LABELS,
  requiresOptions,
} from "@/lib/service-format-utils";

interface Props {
  questions: ServiceQuestionInput[];
  onChange: (questions: ServiceQuestionInput[]) => void;
}

function emptyQuestion(displayOrder: number): ServiceQuestionInput {
  return {
    label: "",
    questionType: QUESTION_TYPE.TEXT,
    required: false,
    displayOrder,
    options: [],
  };
}

export function QuestionBuilder({ questions, onChange }: Props) {
  function addQuestion() {
    onChange([...questions, emptyQuestion(questions.length)]);
  }

  function removeQuestion(index: number) {
    onChange(questions.filter((_, i) => i !== index));
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const next = [...questions];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((q, i) => ({ ...q, displayOrder: i })));
  }

  function updateQuestion(index: number, patch: Partial<ServiceQuestionInput>) {
    const next = [...questions];
    const current = next[index];
    const updated = { ...current, ...patch };
    // Clear options when switching to a non-multi-choice type
    if (patch.questionType && !requiresOptions(patch.questionType)) {
      updated.options = [];
    }
    next[index] = updated;
    onChange(next);
  }

  function addOption(qIndex: number) {
    const next = [...questions];
    const opts = next[qIndex].options ?? [];
    next[qIndex] = {
      ...next[qIndex],
      options: [
        ...opts,
        { label: "", displayOrder: opts.length },
      ],
    };
    onChange(next);
  }

  function updateOption(
    qIndex: number,
    oIndex: number,
    patch: Partial<ServiceQuestionOptionInput>,
  ) {
    const next = [...questions];
    const opts = [...(next[qIndex].options ?? [])];
    opts[oIndex] = { ...opts[oIndex], ...patch };
    next[qIndex] = { ...next[qIndex], options: opts };
    onChange(next);
  }

  function removeOption(qIndex: number, oIndex: number) {
    const next = [...questions];
    next[qIndex] = {
      ...next[qIndex],
      options: (next[qIndex].options ?? []).filter((_, i) => i !== oIndex),
    };
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No questions yet. Add one to collect extra info from customers at booking.
        </p>
      )}

      {questions.map((q, qi) => (
        <div key={qi} className="rounded-md border p-4 space-y-3 bg-muted/20">
          {/* Question header */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Question {qi + 1}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => moveQuestion(qi, -1)}
                disabled={qi === 0}
                aria-label="Move question up"
                className="h-7 w-7 p-0"
              >
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => moveQuestion(qi, 1)}
                disabled={qi === questions.length - 1}
                aria-label="Move question down"
                className="h-7 w-7 p-0"
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeQuestion(qi)}
                aria-label="Remove question"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* Label */}
          <div className="space-y-1.5">
            <Label htmlFor={`q-${qi}-label`}>Question text</Label>
            <Input
              id={`q-${qi}-label`}
              value={q.label}
              onChange={(e) => updateQuestion(qi, { label: e.target.value })}
              placeholder="e.g. What hair length do you have?"
            />
          </div>

          {/* Type + Required row */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5 flex-1 min-w-40">
              <Label htmlFor={`q-${qi}-type`}>Answer type</Label>
              <select
                id={`q-${qi}-type`}
                value={q.questionType}
                onChange={(e) =>
                  updateQuestion(qi, { questionType: e.target.value as QuestionTypeValue })
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {Object.entries(QUESTION_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pb-0.5">
              <Switch
                id={`q-${qi}-required`}
                checked={q.required}
                onCheckedChange={(v) => updateQuestion(qi, { required: v })}
              />
              <Label htmlFor={`q-${qi}-required`} className="cursor-pointer">
                Required
              </Label>
            </div>
          </div>

          {/* Options (for SELECT / RADIO / CHECKBOX) */}
          {requiresOptions(q.questionType) && (
            <div className="space-y-2 pl-2 border-l-2 border-muted">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Options
              </p>
              {(q.options ?? []).map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <Input
                    value={opt.label}
                    onChange={(e) => updateOption(qi, oi, { label: e.target.value })}
                    placeholder={`Option ${oi + 1}`}
                    className="h-8 text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeOption(qi, oi)}
                    aria-label="Remove option"
                    className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addOption(qi)}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" aria-hidden="true" />
                Add option
              </Button>
            </div>
          )}
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
        <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
        Add booking question
      </Button>
    </div>
  );
}
