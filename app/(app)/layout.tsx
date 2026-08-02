import { getOrCreateProfile } from "@/lib/actions/profile";
import { getNotifications } from "@/lib/actions/notifications";
import { Sidebar } from "@/components/app-shell/sidebar";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { Topbar } from "@/components/app-shell/topbar";
import { MonthPicker } from "@/components/app-shell/month-picker";
import { MonthProvider } from "@/lib/month-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [profile, notifications] = await Promise.all([getOrCreateProfile(), getNotifications()]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <MonthProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <Topbar fullName={profile.full_name} avatarUrl={profile.avatar_url} unreadCount={unreadCount}>
          <MonthPicker />
        </Topbar>
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-5 md:mr-60 md:ml-0 md:max-w-none md:px-8 md:pb-10">
          {children}
        </main>
        <BottomNav />
      </div>
    </MonthProvider>
  );
}
