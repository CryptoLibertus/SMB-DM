import { resend } from "@/lib/email";

type Tenant = {
  id: string;
  businessName: string;
  contactEmail: string;
};

const FROM_EMAIL = "SMB-DM <noreply@smbdm.com>";
const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.smbdm.com";

/**
 * Sent when an invoice payment fails.
 */
export async function sendPaymentFailedEmail(tenant: Tenant): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: tenant.contactEmail,
    subject: "Action required: Payment failed",
    html: `
      <h1>Payment failed for ${tenant.businessName}</h1>
      <p>We were unable to process your subscription payment. Please update your payment method to keep your site live.</p>
      <p><a href="${DASHBOARD_URL}/dashboard">Update your payment method</a></p>
      <p>If your payment is not resolved within 7 days, your site will be temporarily paused.</p>
      <p>Best,<br/>The SMB-DM Team</p>
    `,
  });
}

/**
 * Sent at the start of the 7-day grace period.
 */
export async function sendGracePeriodEmail(tenant: Tenant): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: tenant.contactEmail,
    subject: "Your site will be paused soon",
    html: `
      <h1>Urgent: Update your payment, ${tenant.businessName}</h1>
      <p>Your payment has failed and the 7-day grace period has started. Your site will be paused if payment is not resolved.</p>
      <p><a href="${DASHBOARD_URL}/dashboard">Update your payment method now</a></p>
      <p>Best,<br/>The SMB-DM Team</p>
    `,
  });
}

/**
 * Sent when the site is paused after the grace period expires.
 */
export async function sendSitePausedEmail(tenant: Tenant): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: tenant.contactEmail,
    subject: "Your site has been paused",
    html: `
      <h1>Your site has been paused, ${tenant.businessName}</h1>
      <p>Your payment was not resolved within the grace period and your site has been temporarily paused.</p>
      <p>Your data will be retained for 30 days. Reactivate your subscription to restore your site immediately.</p>
      <p><a href="${DASHBOARD_URL}/dashboard">Reactivate now</a></p>
      <p>Best,<br/>The SMB-DM Team</p>
    `,
  });
}

/**
 * Sent 5 days before archival (day 25 after pause).
 */
export async function sendArchiveWarningEmail(tenant: Tenant): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: tenant.contactEmail,
    subject: "Your site will be archived in 5 days",
    html: `
      <h1>Archive warning for ${tenant.businessName}</h1>
      <p>Your site has been paused for 25 days. In 5 more days, it will be archived and your domain will be released.</p>
      <p>Your data will still be available for 90 days after archival. Reactivate now to restore everything.</p>
      <p><a href="${DASHBOARD_URL}/dashboard">Reactivate now</a></p>
      <p>Best,<br/>The SMB-DM Team</p>
    `,
  });
}

/**
 * Sent when the site is archived after 30 days paused.
 */
export async function sendArchivedEmail(tenant: Tenant): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: tenant.contactEmail,
    subject: "Your site has been archived",
    html: `
      <h1>Your site has been archived, ${tenant.businessName}</h1>
      <p>Your site has been paused for 30 days and has now been archived. Your domain has been released.</p>
      <p>Your data will be retained for 90 days. You can reactivate within this period to restore your last deployment.</p>
      <p><a href="${DASHBOARD_URL}/dashboard">Reactivate your subscription</a></p>
      <p>Best,<br/>The SMB-DM Team</p>
    `,
  });
}

/**
 * Sent when the customer cancels their subscription.
 */
export async function sendCancellationEmail(
  tenant: Tenant,
  endDate: Date
): Promise<void> {
  const formattedDate = endDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  await resend.emails.send({
    from: FROM_EMAIL,
    to: tenant.contactEmail,
    subject: "Subscription cancellation confirmed",
    html: `
      <h1>We're sorry to see you go, ${tenant.businessName}</h1>
      <p>Your subscription has been canceled. Your site will remain live until <strong>${formattedDate}</strong>.</p>
      <p>After that date, your site will be paused and eventually archived. Your data will be retained for 90 days.</p>
      <p>Changed your mind? You can resubscribe anytime from your dashboard.</p>
      <p><a href="${DASHBOARD_URL}/dashboard">Visit your dashboard</a></p>
      <p>Best,<br/>The SMB-DM Team</p>
    `,
  });
}
