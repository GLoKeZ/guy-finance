import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Receipt,
  RefreshCw,
  LineChart,
  PiggyBank,
  TrendingUp,
  BarChart3,
  Settings,
  Sparkles,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "בית", icon: LayoutDashboard },
  { href: "/transactions", label: "עסקאות", icon: Receipt },
  { href: "/subscriptions", label: "מנויים", icon: RefreshCw },
  { href: "/trading", label: "מסחר", icon: LineChart },
  { href: "/savings", label: "חיסכון", icon: PiggyBank },
  { href: "/investments", label: "השקעות", icon: TrendingUp },
  { href: "/insights", label: "תובנות AI", icon: Sparkles },
  { href: "/reports", label: "דוחות", icon: BarChart3 },
  { href: "/settings", label: "הגדרות", icon: Settings },
];
