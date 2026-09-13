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

/**
 * A one-line, key-free description of a failed API call for the UI, so a
 * problem can be diagnosed from the screen without server logs.
 */
export function describeFailure(e: unknown): string {
  let text: string;
  if (e instanceof Anthropic.APIError) {
    // The SDK message embeds the API's JSON body; surface just its sentence.
    const body = e.error as { error?: { message?: string } } | undefined;
    const sentence = body?.error?.message ?? e.message.replace(/^\d{3}\s*/, "");
    text = `API error ${e.status ?? ""}: ${sentence}`;
    if (e.status === 400 && /credit balance/i.test(sentence)) {
      text = "the Anthropic account behind the API key has no prepaid credit. Add credits at console.anthropic.com/settings/billing, then try again.";
    } else if (e.status === 401) {
      text = "the API key was rejected (401). Check the ANTHROPIC_API_KEY value in Vercel.";
    }
  } else if (e instanceof Error) text = `${e.name}: ${e.message}`;
  else text = String(e);
  return text.replace(/sk-ant-[A-Za-z0-9_-]+/g, "sk-ant-…").slice(0, 240);
}

export function isTimeout(e: unknown) {
  return e instanceof Anthropic.APIConnectionTimeoutError || (e instanceof Error && /timed out/i.test(e.message));
}
