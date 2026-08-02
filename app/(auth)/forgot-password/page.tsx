"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Mail, ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    if (error) toast.error(error.message);
    else setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold">שחזור סיסמה</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sent ? "אם הכתובת קיימת במערכת, נשלח אליה מייל עם קישור לאיפוס." : "הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה."}
          </p>
        </div>

        {!sent && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">אימייל</Label>
              <Input id="email" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="text-left" />
            </div>
            <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              שלח קישור לאיפוס
            </Button>
          </form>
        )}

        <Link href="/login" className="mt-6 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-3.5 w-3.5" /> חזרה להתחברות
        </Link>
      </motion.div>
    </div>
  );
}
