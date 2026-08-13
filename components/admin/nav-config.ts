import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Users,
  Scissors,
  Clock,
  CalendarX,
  CreditCard,
  Globe,
  Info,
  Mail,
  BookOpen,
  Lock,
  Scale,
  FileText,
  CalendarCheck,
  Ban,
  RotateCcw,
  Building2,
  CalendarCog,
  Bell,
  UserCog,
  Palette,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavGroup = {
  type: "group";
  label: string;
  items: NavItem[];
};

export type NavEntry = ({ type: "item" } & NavItem) | NavGroup;

export const NAV_ENTRIES: NavEntry[] = [
  {
    type: "item",
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    type: "item",
    label: "Calendar",
    href: "/admin/calendar",
    icon: Calendar,
  },
  {
    type: "item",
    label: "Appointments",
    href: "/admin/appointments",
    icon: CalendarDays,
  },
  {
    type: "item",
    label: "Customers",
    href: "/admin/customers",
    icon: Users,
  },
  {
    type: "item",
    label: "Services",
    href: "/admin/services",
    icon: Scissors,
  },
  {
    type: "item",
    label: "Availability",
    href: "/admin/availability",
    icon: Clock,
  },
  {
    type: "item",
    label: "Blocked Times",
    href: "/admin/blocked-times",
    icon: CalendarX,
  },
  {
    type: "item",
    label: "Payments",
    href: "/admin/payments",
    icon: CreditCard,
  },
  {
    type: "group",
    label: "Content",
    items: [
      { label: "Homepage", href: "/admin/content/homepage", icon: Globe },
      { label: "About", href: "/admin/content/about", icon: Info },
      { label: "Contact", href: "/admin/content/contact", icon: Mail },
      { label: "FAQ", href: "/admin/content/faq", icon: BookOpen },
      { label: "Appearance", href: "/admin/content/appearance", icon: Palette },
    ],
  },
  {
    type: "group",
    label: "Policies",
    items: [
      {
        label: "Privacy Policy",
        href: "/admin/policies/privacy-policy",
        icon: Lock,
      },
      {
        label: "Terms & Conditions",
        href: "/admin/policies/terms-and-conditions",
        icon: Scale,
      },
      {
        label: "Booking Policy",
        href: "/admin/policies/booking-policy",
        icon: FileText,
      },
      {
        label: "Appointment Policy",
        href: "/admin/policies/appointment-policy",
        icon: CalendarCheck,
      },
      {
        label: "Cancellation Policy",
        href: "/admin/policies/cancellation-policy",
        icon: Ban,
      },
      {
        label: "Refund Policy",
        href: "/admin/policies/refund-policy",
        icon: RotateCcw,
      },
    ],
  },
  {
    type: "group",
    label: "Settings",
    items: [
      { label: "Business", href: "/admin/settings/business", icon: Building2 },
      { label: "Booking", href: "/admin/settings/booking", icon: CalendarCog },
      {
        label: "Payments",
        href: "/admin/settings/payments",
        icon: CreditCard,
      },
      {
        label: "Notifications",
        href: "/admin/settings/notifications",
        icon: Bell,
      },
      { label: "Account", href: "/admin/settings/account", icon: UserCog },
    ],
  },
];
