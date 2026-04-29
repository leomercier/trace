import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

/**
 * Returns the Anthropic SDK client, configured to talk directly to Anthropic
 * by default. To route through Fireworks (or any Anthropic-compatible
 * gateway) set:
 *
 *   AI_PROVIDER=fireworks
 *   AI_BASE_URL=https://api.fireworks.ai/inference/v1
 *   AI_API_KEY=fw_...
 *
 * The SDK is API-compatible with both providers as long as the model name
 * accepts the same Messages-API request shape.
 */
export function getAnthropic(): Anthropic | null {
  if (_client) return _client;
  const provider = process.env.AI_PROVIDER || "anthropic";
  const key =
    provider === "fireworks"
      ? process.env.AI_API_KEY || process.env.FIREWORKS_API_KEY
      : process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const baseURL =
    provider === "fireworks"
      ? process.env.AI_BASE_URL || "https://api.fireworks.ai/inference/v1"
      : undefined;
  _client = new Anthropic({ apiKey: key, baseURL });
  return _client;
}

export const MODEL =
  process.env.AI_MODEL ||
  process.env.ANTHROPIC_MODEL ||
  (process.env.AI_PROVIDER === "fireworks"
    ? "accounts/fireworks/models/llama-v3p3-70b-instruct"
    : "claude-sonnet-4-5");
