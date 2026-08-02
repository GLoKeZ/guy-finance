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
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/subscriptions", label: "Subscriptions", icon: RefreshCw },
  { href: "/trading", label: "Trading", icon: LineChart },
  { href: "/savings", label: "Savings", icon: PiggyBank },
  { href: "/investments", label: "Investments", icon: TrendingUp },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];
