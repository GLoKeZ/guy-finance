"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
      else window.location.href = "/dashboard";
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) toast.error(error.message);
      else toast.success("נשלח מייל אימות — יש לאשר כדי להתחבר.");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-2xl font-bold text-background shadow-lg">
            <Wallet className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">המערכת הפיננסית שלי</h1>
          <p className="text-sm text-muted-foreground">המערכת האישית שלך לניהול כסף</p>
        </div>

        <div className="space-y-3">
          <form onSubmit={handleEmail} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">אימייל</Label>
              <Input id="email" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="text-left" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">סיסמה</Label>
              <Input id="password" type="password" required minLength={6} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
            </div>
            <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {mode === "signin" ? "התחברות" : "יצירת חשבון"}
            </Button>
          </form>

          <AnimatePresence mode="wait">
            <motion.button
              key={mode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              {mode === "signin" ? "חדש כאן? צור חשבון" : "כבר יש לך חשבון? התחבר"}
            </motion.button>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
