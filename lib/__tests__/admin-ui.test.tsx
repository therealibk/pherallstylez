import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NAV_ENTRIES } from "@/components/admin/nav-config";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { CalendarDays, Info } from "lucide-react";

// ── Nav config ────────────────────────────────────────────────────────────────

describe("NAV_ENTRIES", () => {
  const allItems = NAV_ENTRIES.flatMap((entry) =>
    entry.type === "item" ? [entry] : entry.items,
  );

  const topLevelItems = NAV_ENTRIES.filter((e) => e.type === "item");
  const groups = NAV_ENTRIES.filter(
    (e): e is Extract<typeof e, { type: "group" }> => e.type === "group",
  );

  it("contains at least 8 top-level items", () => {
    expect(topLevelItems.length).toBeGreaterThanOrEqual(8);
  });

  it("includes Dashboard, Calendar, Appointments, Customers, Services", () => {
    const labels = topLevelItems.map((e) => e.label);
    expect(labels).toContain("Dashboard");
    expect(labels).toContain("Calendar");
    expect(labels).toContain("Appointments");
    expect(labels).toContain("Customers");
    expect(labels).toContain("Services");
  });

  it("includes Content, Policies, and Settings groups", () => {
    const groupLabels = groups.map((g) => g.label);
    expect(groupLabels).toContain("Content");
    expect(groupLabels).toContain("Policies");
    expect(groupLabels).toContain("Settings");
  });

  it("Content group has exactly 4 items", () => {
    const content = groups.find((g) => g.label === "Content");
    expect(content?.items).toHaveLength(4);
  });

  it("Policies group has exactly 6 items", () => {
    const policies = groups.find((g) => g.label === "Policies");
    expect(policies?.items).toHaveLength(6);
  });

  it("Settings group has exactly 5 items", () => {
    const settings = groups.find((g) => g.label === "Settings");
    expect(settings?.items).toHaveLength(5);
  });

  it("all items have unique hrefs", () => {
    const hrefs = allItems.map((item) => item.href);
    const unique = new Set(hrefs);
    expect(unique.size).toBe(hrefs.length);
  });

  it("all hrefs start with /admin/", () => {
    allItems.forEach((item) => {
      expect(item.href).toMatch(/^\/admin\//);
    });
  });

  it("Dashboard href is /admin/dashboard", () => {
    const dashboard = topLevelItems.find((e) => e.label === "Dashboard");
    expect(dashboard?.href).toBe("/admin/dashboard");
  });

  it("all items have an icon", () => {
    allItems.forEach((item) => {
      expect(item.icon).toBeTruthy();
    });
  });

  it("Policies group contains all six required policy pages", () => {
    const policies = groups.find((g) => g.label === "Policies");
    const hrefs = policies?.items.map((i) => i.href) ?? [];
    expect(hrefs).toContain("/admin/policies/privacy-policy");
    expect(hrefs).toContain("/admin/policies/terms-and-conditions");
    expect(hrefs).toContain("/admin/policies/booking-policy");
    expect(hrefs).toContain("/admin/policies/appointment-policy");
    expect(hrefs).toContain("/admin/policies/cancellation-policy");
    expect(hrefs).toContain("/admin/policies/refund-policy");
  });
});

// ── StatCard ──────────────────────────────────────────────────────────────────

describe("StatCard", () => {
  it("renders label, value, and description", () => {
    render(
      <StatCard
        label="Today's Appointments"
        value="0"
        description="No appointments today"
        icon={CalendarDays}
      />,
    );
    expect(screen.getByText("Today's Appointments")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("No appointments today")).toBeInTheDocument();
  });

  it("renders the icon with aria-hidden", () => {
    const { container } = render(
      <StatCard
        label="Revenue"
        value="£0.00"
        description="No payments yet"
        icon={CalendarDays}
      />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});

// ── EmptyState ────────────────────────────────────────────────────────────────

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(
      <EmptyState
        icon={Info}
        title="Nothing here yet"
        description="Content will appear once data is added."
      />,
    );
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    expect(
      screen.getByText("Content will appear once data is added."),
    ).toBeInTheDocument();
  });

  it("renders an action link when provided", () => {
    render(
      <EmptyState
        icon={Info}
        title="Empty"
        description="No items."
        action={{ label: "Add item", href: "/admin/services" }}
      />,
    );
    const link = screen.getByRole("link", { name: "Add item" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/admin/services");
  });

  it("renders no action link when not provided", () => {
    render(
      <EmptyState icon={Info} title="Empty" description="No items." />,
    );
    expect(screen.queryByRole("link")).toBeNull();
  });
});

// ── PageHeader ────────────────────────────────────────────────────────────────

describe("PageHeader", () => {
  it("renders the title", () => {
    render(<PageHeader title="Dashboard" />);
    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<PageHeader title="Settings" description="Configure your account." />);
    expect(screen.getByText("Configure your account.")).toBeInTheDocument();
  });

  it("renders children in the right slot", () => {
    render(
      <PageHeader title="Services">
        <button>Add Service</button>
      </PageHeader>,
    );
    expect(
      screen.getByRole("button", { name: "Add Service" }),
    ).toBeInTheDocument();
  });

  it("omits description element when not provided", () => {
    const { container } = render(<PageHeader title="Title" />);
    expect(container.querySelector("p")).toBeNull();
  });
});
