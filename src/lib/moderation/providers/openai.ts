import type { ModerationFinding } from "../types";

/**
 * OpenAI Moderation API Provider.
 * Calls https://api.openai.com/v1/moderations using the omni-moderation-latest model.
 * Free of charge and supports multimodal / multi-language text.
 */
export async function checkOpenAIModeration(
  text: string,
  screenshotBase64?: string
): Promise<ModerationFinding | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Zero-config / offline fallback: when no API key is provided, local rules handle defense
    return null;
  }

  try {
    const input: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: text.slice(0, 10000) },
    ];

    if (screenshotBase64) {
      input.push({
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${screenshotBase64}`,
        },
      });
    }

    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input,
      }),
    });

    if (!response.ok) {
      console.warn(`[Moderation] OpenAI API returned HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    const result = data.results?.[0];
    if (!result || !result.flagged) {
      return null;
    }

    const categories = result.categories || {};
    const flaggedCategories: string[] = Object.keys(categories).filter((k) => categories[k]);

    // Map OpenAI categories to domain categories
    let domainCategory: ModerationFinding["category"] = "other";
    if (categories.sexual || categories["sexual/minors"]) {
      domainCategory = "sexual";
    } else if (categories.violence || categories["violence/graphic"]) {
      domainCategory = "violence";
    } else if (categories.hate || categories["hate/threatening"]) {
      domainCategory = "hate";
    } else if (categories["self-harm"] || categories["self-harm/intent"] || categories["self-harm/instructions"]) {
      domainCategory = "self_harm";
    }

    return {
      category: domainCategory,
      severity: "critical_block",
      reason: `Flagged by automated AI safety policy: ${flaggedCategories.join(", ")}`,
      matchedKeywords: flaggedCategories,
    };
  } catch (err) {
    console.warn("[Moderation] OpenAI API call failed:", err);
    return null;
  }
}
