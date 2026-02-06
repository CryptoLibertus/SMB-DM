import type { CtaElement, CtaAnalysis } from "../types";

/** Extract phone numbers from text using common US/international formats */
function findPhoneNumbers(text: string): string[] {
  const phoneRegex =
    /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
  const matches = text.match(phoneRegex) || [];
  // Deduplicate
  return [...new Set(matches.map((m) => m.trim()))];
}

/** Strip HTML tags from a string */
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function analyzeCta(html: string): CtaAnalysis {
  const elements: CtaElement[] = [];

  // Find tel: links
  const telRegex = /<a[^>]+href=["']tel:([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let telMatch;
  while ((telMatch = telRegex.exec(html)) !== null) {
    elements.push({
      type: "tel_link",
      text: stripTags(telMatch[2]) || telMatch[1],
      location: "body",
    });
  }

  // Find mailto: links
  const mailtoRegex =
    /<a[^>]+href=["']mailto:([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let mailtoMatch;
  while ((mailtoMatch = mailtoRegex.exec(html)) !== null) {
    elements.push({
      type: "mailto",
      text: stripTags(mailtoMatch[2]) || mailtoMatch[1],
      location: "body",
    });
  }

  // Find contact forms
  const formRegex = /<form[^>]*>([\s\S]*?)<\/form>/gi;
  let formMatch;
  while ((formMatch = formRegex.exec(html)) !== null) {
    const formContent = formMatch[1];
    // Check if it's likely a contact/lead form
    const isContactForm =
      /(?:email|phone|name|message|contact|inquiry|quote|appointment|book)/i.test(
        formContent
      );
    if (isContactForm) {
      // Try to find a submit button text
      const submitMatch = formContent.match(
        /<(?:button|input)[^>]*(?:type=["']submit["'])[^>]*(?:value=["']([^"']*)["'])?[^>]*>([\s\S]*?)?<\/(?:button|input)>/i
      );
      const buttonText =
        submitMatch?.[2]?.replace(/<[^>]+>/g, "").trim() ||
        submitMatch?.[1] ||
        "Submit";
      elements.push({
        type: "contact_form",
        text: buttonText,
        location: "body",
      });
    }
  }

  // Find CTA buttons (links/buttons with CTA-like text)
  const ctaPhrases =
    /(?:contact\s*us|get\s*(?:a\s*)?(?:free\s*)?quote|book\s*(?:now|appointment|online)|schedule|request|call\s*(?:us|now|today)|free\s*(?:estimate|consultation)|learn\s*more|get\s*started|sign\s*up|subscribe)/i;
  const linkButtonRegex =
    /<(?:a|button)[^>]*>([\s\S]*?)<\/(?:a|button)>/gi;
  let linkMatch;
  while ((linkMatch = linkButtonRegex.exec(html)) !== null) {
    const text = stripTags(linkMatch[1]);
    if (text.length > 0 && text.length < 60 && ctaPhrases.test(text)) {
      // Avoid duplicating tel/mailto already found
      const fullTag = linkMatch[0].toLowerCase();
      if (!fullTag.includes("tel:") && !fullTag.includes("mailto:")) {
        elements.push({
          type: "cta_button",
          text,
          location: "body",
        });
      }
    }
  }

  // Find phone numbers in plain text (not already in tel: links)
  const bodyText = stripTags(html);
  const phoneNumbers = findPhoneNumbers(bodyText);
  const existingTelNumbers = elements
    .filter((e) => e.type === "tel_link")
    .map((e) => e.text.replace(/\D/g, ""));

  for (const phone of phoneNumbers) {
    const normalized = phone.replace(/\D/g, "");
    if (normalized.length >= 10 && !existingTelNumbers.includes(normalized)) {
      elements.push({
        type: "phone",
        text: phone,
        location: "body",
      });
    }
  }

  return { elements };
}
