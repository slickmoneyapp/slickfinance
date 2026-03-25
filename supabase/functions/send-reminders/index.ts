// Supabase Edge Function: send-reminders
// Runs daily via pg_cron. Checks subscriptions with upcoming charges
// and sends push notifications via Expo Push API.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const LOGODEV_TOKEN = "pk_SQVsaKc_RfuK49MneNGgxw";

function buildLogoUrl(domain: string): string | null {
  if (!domain) return null;
  const clean = domain.trim().toLowerCase();
  const params = new URLSearchParams({
    token: LOGODEV_TOKEN,
    size: "128",
    format: "png",
    theme: "light",
    retina: "true",
    fallback: "404",
  });
  return `https://img.logo.dev/${encodeURIComponent(clean)}?${params.toString()}`;
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date();
    const maxLookahead = 7;

    // Find subscriptions where reminder should fire today:
    // next_charge_date - reminder_days_before = today
    const { data: subs, error: subsError } = await supabase
      .from("subscriptions")
      .select("id, user_id, service_name, domain, price, currency, reminder_days_before, next_charge_date, reminder_enabled, status")
      .eq("reminder_enabled", true)
      .in("status", ["active", "trial"]);

    if (subsError) throw subsError;
    if (!subs?.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

    const messages: Array<{
      to: string;
      title: string;
      body: string;
      data: Record<string, string>;
      sound: string;
      mutableContent: boolean;
    }> = [];

    for (const sub of subs) {
      const chargeDate = new Date(sub.next_charge_date + "T00:00:00");
      const reminderDate = new Date(chargeDate);
      reminderDate.setDate(reminderDate.getDate() - (sub.reminder_days_before ?? 1));

      const todayStr = today.toISOString().split("T")[0];
      const reminderStr = reminderDate.toISOString().split("T")[0];

      if (todayStr !== reminderStr) continue;

      // Get device tokens for this user
      const { data: tokens } = await supabase
        .from("device_tokens")
        .select("token")
        .eq("user_id", sub.user_id);

      if (!tokens?.length) continue;

      const daysBefore = sub.reminder_days_before ?? 1;
      const phrase =
        daysBefore <= 0 ? "today" :
        daysBefore === 1 ? "tomorrow" :
        daysBefore === 7 ? "in 1 week" :
        `in ${daysBefore} days`;

      const amount = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: sub.currency ?? "USD",
      }).format(sub.price);

      const logoUrl = buildLogoUrl(sub.domain);

      for (const { token } of tokens) {
        messages.push({
          to: token,
          title: "Upcoming charge",
          body: `${sub.service_name} will charge ${amount} ${phrase}.`,
          data: {
            subscriptionId: sub.id,
            serviceName: sub.service_name,
            ...(logoUrl ? { logoUrl } : {}),
          },
          sound: "default",
          mutableContent: true,
        });
      }
    }

    if (messages.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    // Send in batches of 100 (Expo limit)
    let totalSent = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
      if (res.ok) totalSent += batch.length;
    }

    return new Response(JSON.stringify({ sent: totalSent }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
});
