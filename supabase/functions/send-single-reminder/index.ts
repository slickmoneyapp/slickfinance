// Supabase Edge Function: send-single-reminder
// Called by a one-shot pg_cron job for a single subscription.
// Sends a push notification and then removes its own cron job.

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
    const { subscription_id } = await req.json();
    if (!subscription_id) {
      return new Response(JSON.stringify({ error: "missing subscription_id" }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("id, user_id, service_name, domain, price, currency, reminder_days_before, next_charge_date, reminder_enabled, status")
      .eq("id", subscription_id)
      .single();

    if (subError || !sub) {
      return new Response(JSON.stringify({ error: "subscription not found" }), { status: 404 });
    }

    if (!sub.reminder_enabled || !["active", "trial"].includes(sub.status)) {
      return new Response(JSON.stringify({ sent: 0, reason: "reminder disabled or inactive" }), { status: 200 });
    }

    const { data: tokens } = await supabase
      .from("device_tokens")
      .select("token")
      .eq("user_id", sub.user_id);

    if (!tokens?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: "no device tokens" }), { status: 200 });
    }

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

    const messages = tokens.map(({ token }: { token: string }) => ({
      to: token,
      title: "Upcoming charge",
      body: `${sub.service_name} will charge ${amount} ${phrase}.`,
      data: {
        subscriptionId: sub.id,
        serviceName: sub.service_name,
        ...(logoUrl ? { logoUrl } : {}),
      },
      sound: "default" as const,
      mutableContent: true,
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });

    const sent = res.ok ? messages.length : 0;

    // Self-cleanup: remove the one-shot cron job
    try {
      await supabase.rpc("unschedule_reminder_job", { job_name: `reminder_${subscription_id}` });
    } catch (_e) {
      // Non-critical — job will just not fire again anyway
    }

    return new Response(JSON.stringify({ sent }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
});
