import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog {
  if (!posthogClient) {
    if (!process.env.POSTHOG_API_KEY) {
      throw new Error("POSTHOG_API_KEY is not set");
    }
    posthogClient = new PostHog(process.env.POSTHOG_API_KEY, {
      host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
    });
  }
  return posthogClient;
}
