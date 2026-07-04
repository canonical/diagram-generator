import type { TestContext } from "node:test";
import { chromium, type Browser } from "playwright";

export async function launchChromiumOrSkip(
  t: TestContext,
  options?: Parameters<typeof chromium.launch>[0],
): Promise<Browser | null> {
  try {
    return await chromium.launch(options);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    t.skip(`Playwright chromium unavailable: ${detail}`);
    return null;
  }
}
