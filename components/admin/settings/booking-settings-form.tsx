"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveBookingSettings, type BookingSettingsInput } from "@/lib/actions/booking-settings";

interface Props {
  initial: {
    minNoticeHours: number;
    maxAdvanceDays: number;
    defaultBufferMins: number;
    cancellationDeadlineHours: number;
    reschedulingDeadlineHours: number;
    customerCanCancel: boolean;
    customerCanReschedule: boolean;
    depositRequired: boolean;
    paymentHoldMins: number;
    reminderHours: number[];
  };
}

export function BookingSettingsForm({ initial }: Props) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [minNoticeHours, setMinNoticeHours] = useState(String(initial.minNoticeHours));
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(String(initial.maxAdvanceDays));
  const [defaultBufferMins, setDefaultBufferMins] = useState(String(initial.defaultBufferMins));
  const [cancellationDeadlineHours, setCancellationDeadlineHours] = useState(
    String(initial.cancellationDeadlineHours),
  );
  const [reschedulingDeadlineHours, setReschedulingDeadlineHours] = useState(
    String(initial.reschedulingDeadlineHours),
  );
  const [customerCanCancel, setCustomerCanCancel] = useState(initial.customerCanCancel);
  const [customerCanReschedule, setCustomerCanReschedule] = useState(initial.customerCanReschedule);
  const [depositRequired, setDepositRequired] = useState(initial.depositRequired);
  const [paymentHoldMins, setPaymentHoldMins] = useState(String(initial.paymentHoldMins));
  const [reminderHoursStr, setReminderHoursStr] = useState(initial.reminderHours.join(", "));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    // Parse reminder hours from comma-separated string
    const reminderHours = reminderHoursStr
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    const data: BookingSettingsInput = {
      minNoticeHours: parseInt(minNoticeHours, 10) || 0,
      maxAdvanceDays: parseInt(maxAdvanceDays, 10) || 90,
      defaultBufferMins: parseInt(defaultBufferMins, 10) || 0,
      cancellationDeadlineHours: parseInt(cancellationDeadlineHours, 10) || 0,
      reschedulingDeadlineHours: parseInt(reschedulingDeadlineHours, 10) || 0,
      customerCanCancel,
      customerCanReschedule,
      depositRequired,
      paymentHoldMins: parseInt(paymentHoldMins, 10) || 15,
      reminderHours,
    };

    startTransition(async () => {
      const result = await saveBookingSettings(data);
      if (result.success) {
        setSaved(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Notice & window */}
      <Card>
        <CardHeader>
          <CardTitle>Booking window</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="minNotice">Minimum notice (hours)</Label>
            <Input
              id="minNotice"
              type="number"
              min={0}
              max={168}
              value={minNoticeHours}
              onChange={(e) => setMinNoticeHours(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              How far in advance customers must book
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxAdvance">Maximum advance booking (days)</Label>
            <Input
              id="maxAdvance"
              type="number"
              min={1}
              max={365}
              value={maxAdvanceDays}
              onChange={(e) => setMaxAdvanceDays(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              How far ahead customers can book
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bufferMins">Default buffer (minutes)</Label>
            <Input
              id="bufferMins"
              type="number"
              min={0}
              max={120}
              value={defaultBufferMins}
              onChange={(e) => setDefaultBufferMins(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Gap between appointments when no service buffer is set
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paymentHold">Payment hold (minutes)</Label>
            <Input
              id="paymentHold"
              type="number"
              min={5}
              max={60}
              value={paymentHoldMins}
              onChange={(e) => setPaymentHoldMins(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              How long a pending booking holds its slot waiting for payment
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cancellation & rescheduling */}
      <Card>
        <CardHeader>
          <CardTitle>Cancellation &amp; rescheduling</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="canCancel"
                checked={customerCanCancel}
                onCheckedChange={setCustomerCanCancel}
              />
              <Label htmlFor="canCancel" className="cursor-pointer">
                Customers can cancel
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="canReschedule"
                checked={customerCanReschedule}
                onCheckedChange={setCustomerCanReschedule}
              />
              <Label htmlFor="canReschedule" className="cursor-pointer">
                Customers can reschedule
              </Label>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cancelDeadline">Cancellation deadline (hours before)</Label>
              <Input
                id="cancelDeadline"
                type="number"
                min={0}
                max={168}
                value={cancellationDeadlineHours}
                onChange={(e) => setCancellationDeadlineHours(e.target.value)}
                disabled={!customerCanCancel}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rescheduleDeadline">Rescheduling deadline (hours before)</Label>
              <Input
                id="rescheduleDeadline"
                type="number"
                min={0}
                max={168}
                value={reschedulingDeadlineHours}
                onChange={(e) => setReschedulingDeadlineHours(e.target.value)}
                disabled={!customerCanReschedule}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposits & reminders */}
      <Card>
        <CardHeader>
          <CardTitle>Deposits &amp; reminders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch
              id="depositRequired"
              checked={depositRequired}
              onCheckedChange={setDepositRequired}
            />
            <Label htmlFor="depositRequired" className="cursor-pointer">
              Deposit required at booking
            </Label>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reminderHours">Reminder timing (hours before, comma-separated)</Label>
            <Input
              id="reminderHours"
              value={reminderHoursStr}
              onChange={(e) => setReminderHoursStr(e.target.value)}
              placeholder="48, 24"
            />
            <p className="text-xs text-muted-foreground">
              e.g. &quot;48, 24&quot; sends reminders 48 and 24 hours before the appointment
            </p>
          </div>
        </CardContent>
      </Card>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {saved && (
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          Settings saved.
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
