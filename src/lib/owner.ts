/** Emails in OWNER_EMAILS (comma-separated) get every Pro feature without a
 * subscription. SERVER-ONLY: reads a private env var. The worker reads the same
 * variable (see worker/check_prices.py). */
export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const owners = (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return owners.includes(email.toLowerCase());
}
