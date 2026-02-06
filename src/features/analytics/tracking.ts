/**
 * PostHog tracking snippet generation for SMB sites.
 * Generates the client-side JavaScript to inject into deployed SMB sites
 * and defines the event schema for all tracked interactions.
 */

export interface EventProperty {
  name: string;
  type: "string" | "number" | "boolean";
  description: string;
}

export interface EventDefinition {
  event: string;
  description: string;
  properties: EventProperty[];
  automatic: boolean;
}

/**
 * Generate the PostHog JavaScript snippet to inject into an SMB site.
 * Includes tenant_id as a super property so all events are automatically
 * tagged for multi-tenancy filtering.
 */
export function generateTrackingSnippet(
  tenantId: string,
  posthogKey: string
): string {
  const posthogHost =
    process.env.POSTHOG_HOST || "https://us.i.posthog.com";

  return `<script>
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageviewId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  posthog.init('${posthogKey}', {
    api_host: '${posthogHost}',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false
  });

  // Register tenant_id as a super property on all events
  posthog.register({
    tenant_id: '${tenantId}'
  });

  // Track phone clicks
  document.addEventListener('click', function(e) {
    var target = e.target;
    while (target && target !== document) {
      if (target.tagName === 'A') {
        var href = target.getAttribute('href') || '';
        if (href.startsWith('tel:')) {
          posthog.capture('phone_click', {
            phone_number: href.replace('tel:', ''),
            link_text: target.textContent.trim()
          });
        } else if (href.startsWith('mailto:')) {
          posthog.capture('email_click', {
            email_address: href.replace('mailto:', ''),
            link_text: target.textContent.trim()
          });
        }
        break;
      }
      target = target.parentElement;
    }
  });

  // Track CTA button clicks
  document.addEventListener('click', function(e) {
    var target = e.target;
    while (target && target !== document) {
      if (target.tagName === 'BUTTON' || (target.tagName === 'A' && target.classList.contains('cta'))) {
        var href = target.getAttribute('href') || '';
        if (!href.startsWith('tel:') && !href.startsWith('mailto:')) {
          posthog.capture('cta_click', {
            cta_text: target.textContent.trim(),
            cta_url: href || window.location.href
          });
        }
        break;
      }
      target = target.parentElement;
    }
  });

  // Track form submissions
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form && form.tagName === 'FORM') {
      posthog.capture('form_submit', {
        form_id: form.id || '',
        form_action: form.action || window.location.href
      });
    }
  });
</script>`;
}

/**
 * Returns the PostHog event schema definitions for all tracked events.
 */
export function getEventSchema(): EventDefinition[] {
  return [
    {
      event: "page_view",
      description: "Automatically captured when a visitor loads a page",
      properties: [],
      automatic: true,
    },
    {
      event: "phone_click",
      description: "Visitor clicks a tel: link to call the business",
      properties: [
        {
          name: "phone_number",
          type: "string",
          description: "The phone number from the tel: link",
        },
      ],
      automatic: false,
    },
    {
      event: "email_click",
      description: "Visitor clicks a mailto: link to email the business",
      properties: [
        {
          name: "email_address",
          type: "string",
          description: "The email address from the mailto: link",
        },
      ],
      automatic: false,
    },
    {
      event: "form_submit",
      description: "Visitor submits a contact or lead form",
      properties: [
        {
          name: "form_id",
          type: "string",
          description: "The HTML id attribute of the form",
        },
        {
          name: "form_action",
          type: "string",
          description: "The action URL of the form",
        },
      ],
      automatic: false,
    },
    {
      event: "cta_click",
      description:
        "Visitor clicks a CTA button (e.g., Get Quote, Book Now)",
      properties: [
        {
          name: "cta_text",
          type: "string",
          description: "The text content of the CTA element",
        },
        {
          name: "cta_url",
          type: "string",
          description: "The href of the CTA or current page URL",
        },
      ],
      automatic: false,
    },
  ];
}
