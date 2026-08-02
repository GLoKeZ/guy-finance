import { getOrCreateProfile } from "@/lib/actions/profile";
import { getNotifications } from "@/lib/actions/notifications";
import { ensureDefaultCategories } from "@/lib/actions/helpers";
import { Sidebar } from "@/components/app-shell/sidebar";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { Topbar } from "@/components/app-shell/topbar";
import { MonthPicker } from "@/components/app-shell/month-picker";
import { MonthProvider } from "@/lib/month-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [profile, notifications] = await Promise.all([
    getOrCreateProfile(),
    getNotifications(),
    ensureDefaultCategories(),
  ]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <MonthProvider>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-background md:block md:h-auto md:min-h-screen md:overflow-visible">
        <Sidebar />
        <Topbar fullName={profile.full_name} avatarUrl={profile.avatar_url} unreadCount={unreadCount}>
          <MonthPicker />
        </Topbar>
        <main className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(100px+env(safe-area-inset-bottom))] pt-5 md:mr-60 md:ml-0 md:max-w-none md:flex-none md:overflow-visible md:px-8 md:pb-10">
          {children}
        </main>
        <BottomNav />
      </div>
    </MonthProvider>
  );
}
