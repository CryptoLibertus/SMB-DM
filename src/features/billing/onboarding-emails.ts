import { resend } from "@/lib/email";

type Tenant = {
  id: string;
  businessName: string;
  contactEmail: string;
};

const FROM_EMAIL = "SMB-DM <noreply@smbdm.com>";
const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.smbdm.com";

/**
 * Day 0 — Welcome email with dashboard link, DNS instructions, support contact.
 */
export async function sendWelcomeEmail(tenant: Tenant): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: tenant.contactEmail,
    subject: `Welcome to SMB-DM, ${tenant.businessName}!`,
    html: `
      <h1>Welcome aboard, ${tenant.businessName}!</h1>
      <p>Your new website is being set up. Here's what to do next:</p>
      <h2>1. Access your dashboard</h2>
      <p><a href="${DASHBOARD_URL}/dashboard">Open your dashboard</a> to manage your site, view analytics, and request changes.</p>
      <h2>2. Set up your domain</h2>
      <p>To point your domain to your new site, update your DNS records:</p>
      <ul>
        <li><strong>A Record:</strong> Point <code>@</code> to <code>76.76.21.21</code></li>
        <li><strong>CNAME Record:</strong> Point <code>www</code> to <code>cname.vercel-dns.com</code></li>
      </ul>
      <p>We'll automatically detect when your DNS is configured and activate your site.</p>
      <h2>3. Need help?</h2>
      <p>Reply to this email or contact us at <a href="mailto:support@smbdm.com">support@smbdm.com</a>.</p>
      <p>Best,<br/>The SMB-DM Team</p>
    `,
  });
}

/**
 * Day 3 — "Your first blog post is live!" notification.
 */
export async function sendFirstBlogEmail(tenant: Tenant): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: tenant.contactEmail,
    subject: "Your first blog post is live!",
    html: `
      <h1>Great news, ${tenant.businessName}!</h1>
      <p>Your first blog post has been published on your site.</p>
      <p>We automatically publish 2 blog posts per week, tailored to your industry and services. These posts help improve your site's SEO and drive organic traffic.</p>
      <p><a href="${DASHBOARD_URL}/dashboard">View your posts in the dashboard</a></p>
      <p>Best,<br/>The SMB-DM Team</p>
    `,
  });
}

/**
 * Day 7 — First analytics summary with traffic snapshot.
 */
export async function sendFirstAnalyticsEmail(tenant: Tenant): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: tenant.contactEmail,
    subject: "Your first week's traffic snapshot",
    html: `
      <h1>Your first week in review, ${tenant.businessName}!</h1>
      <p>Your site has been live for a week. Here's a quick look at your traffic:</p>
      <p><a href="${DASHBOARD_URL}/dashboard">View your full analytics dashboard</a></p>
      <p>Your dashboard shows visits, leads, top pages, and weekly trends. We'll also send you a weekly summary every Monday.</p>
      <p>Best,<br/>The SMB-DM Team</p>
    `,
  });
}
