import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * The API key for the lookup and screenshot features. Environment variable
 * names are case-sensitive on the server, and dashboards make it easy to
 * save the key in lowercase, so accept either spelling.
 */
export function anthropicApiKey(): string | undefined {
  const key = process.env.ANTHROPIC_API_KEY || process.env.anthropic_api_key || process.env.Anthropic_Api_Key;
  return key?.trim() || undefined;
}

export function isAnthropicConfigured() {
  return Boolean(anthropicApiKey() || process.env.ANTHROPIC_AUTH_TOKEN);
}

export function anthropicClient() {
  return new Anthropic({ apiKey: anthropicApiKey() });
}
