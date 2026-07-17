import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.DG_PREVIEW_URL ?? "http://127.0.0.1:8176";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
let firstAddress = "";
let secondAddress = "";
let initialSameNameCount = 0;

await page.addInitScript(() => {
  window.showDirectoryPicker = async () => {
    const index = Number(localStorage.getItem("dg-test-picker-index") ?? "0");
    const root = await navigator.storage.getDirectory();
    const parent = await root.getDirectoryHandle(index === 0 ? "parent-a" : "parent-b");
    const directory = await parent.getDirectoryHandle("Same name");
    localStorage.setItem("dg-test-picker-index", String(index + 1));
    return directory;
  };
});

async function seedFolder(parentName, slug, content) {
  await page.evaluate(async ({ parentName, slug, content }) => {
    const root = await navigator.storage.getDirectory();
    const parent = await root.getDirectoryHandle(parentName, { create: true });
    const directory = await parent.getDirectoryHandle("Same name", { create: true });
    const handle = await directory.getFileHandle(`${slug}.yaml`, { create: true });
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }, { parentName, slug, content });
}

async function readFolderFile(parentName, slug) {
  return page.evaluate(async ({ parentName, slug }) => {
    const root = await navigator.storage.getDirectory();
    const parent = await root.getDirectoryHandle(parentName);
    const directory = await parent.getDirectoryHandle("Same name");
    const handle = await directory.getFileHandle(`${slug}.yaml`);
    return (await handle.getFile()).text();
  }, { parentName, slug });
}

async function writeFolderFile(parentName, slug, content) {
  await page.evaluate(async ({ parentName, slug, content }) => {
    const root = await navigator.storage.getDirectory();
    const parent = await root.getDirectoryHandle(parentName);
    const directory = await parent.getDirectoryHandle("Same name");
    const handle = await directory.getFileHandle(`${slug}.yaml`);
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }, { parentName, slug, content });
}

async function saveCurrent(outerMargin) {
  return page.evaluate(async (outerMargin) => {
    const address = window.__DG_CONFIG?.slug;
    const response = await window.__DG_workspaceFetch(
      `/api/overrides/${address}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceRevision: window.__DG_CONFIG?.workspace_revision,
          grid_overrides: { outer_margin: outerMargin },
        }),
      },
    );
    return {
      status: response.status,
      address,
      error: response.ok ? "" : await response.text(),
    };
  }, outerMargin);
}

async function waitForWorkspaceRestore() {
  await page.waitForFunction(() => {
    const message = document.getElementById("dg-workspace-status")?.textContent ?? "";
    return /reconnected|loaded from/.test(message);
  });
}

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  initialSameNameCount = (await page.locator(".dg-browse-heading").allTextContents())
    .filter((label) => label === "Same name").length;
  await page.evaluate(() => localStorage.setItem("dg-test-picker-index", "0"));
  const yaml = "engine: v3\nroot:\n  id: page\n  children: []\narrows: []\n";
  await seedFolder("parent-a", "alpha", yaml);
  await seedFolder("parent-b", "beta", yaml);

  await page.locator("#dg-open-folder").click();
  await page.waitForURL(/local-.*:alpha$/);
  firstAddress = await page.evaluate(() => window.__DG_CONFIG?.slug);
  assert.match(firstAddress, /^local-.*:alpha$/);

  await page.locator("#dg-open-folder").click();
  await page.waitForURL(/local-.*:beta$/);
  secondAddress = await page.evaluate(() => window.__DG_CONFIG?.slug);
  assert.match(secondAddress, /^local-.*:beta$/);
  assert.notEqual(firstAddress.split(":")[0], secondAddress.split(":")[0]);

  await page.goto(`${baseUrl}/view/v3:${firstAddress}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__DG_workspaceFetch));
  await waitForWorkspaceRestore();
  const firstSave = await saveCurrent(17);
  assert.equal(firstSave.status, 200, firstSave.error);
  assert.match(await readFolderFile("parent-a", "alpha"), /outer_margin: 17/);
  assert.doesNotMatch(await readFolderFile("parent-b", "beta"), /outer_margin: 17/);

  await page.goto(`${baseUrl}/view/v3:${secondAddress}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__DG_workspaceFetch));
  await waitForWorkspaceRestore();
  const secondSave = await saveCurrent(19);
  assert.equal(secondSave.status, 200, secondSave.error);
  assert.match(await readFolderFile("parent-b", "beta"), /outer_margin: 19/);

  const externalYaml = `${await readFolderFile("parent-b", "beta")}\n# external edit\n`;
  await writeFolderFile("parent-b", "beta", externalYaml);
  await page.evaluate(() => {
    window.confirm = () => false;
  });
  assert.equal((await saveCurrent(21)).status, 409);
  assert.match(await readFolderFile("parent-b", "beta"), /# external edit/);
  assert.doesNotMatch(await readFolderFile("parent-b", "beta"), /outer_margin: 21/);

  await page.goto(`${baseUrl}/view/v3:complex-routing-usecase`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__DG_workspaceFetch));
  assert.equal(await page.evaluate(() => window.__DG_CONFIG?.workspace_writable), false);
  const copyResult = await page.evaluate(async () => {
    const response = await window.__DG_workspaceFetch(
      "/api/overrides/complex-routing-usecase",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grid_overrides: { outer_margin: 23 } }),
      },
    );
    return {
      status: response.status,
      payload: await response.json(),
    };
  });
  assert.equal(copyResult.status, 200);
  assert.match(copyResult.payload.workspaceCopyAddress, /^local-.*:complex-routing-usecase$/);
  assert.match(
    await readFolderFile("parent-b", "complex-routing-usecase"),
    /outer_margin: 23/,
  );
  await page.goto(
    `${baseUrl}/view/v3:${copyResult.payload.workspaceCopyAddress}`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForFunction(() => Boolean(window.__DG_workspaceFetch));
  await waitForWorkspaceRestore();
  assert.equal(
    await page.evaluate(() => window.__DG_CONFIG?.slug),
    copyResult.payload.workspaceCopyAddress,
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() =>
    document.querySelectorAll(".dg-browse-heading").length >= 3,
  );
  const sameNameHeadings = await page.locator(".dg-browse-heading").allTextContents();
  assert.equal(
    sameNameHeadings.filter((label) => label === "Same name").length,
    initialSameNameCount + 2,
  );

  process.stdout.write(JSON.stringify({
    ok: true,
    browser: "Chromium",
    handles: "real OPFS FileSystemDirectoryHandle objects",
    picker: "production picker affordance with deterministic test selection",
    firstAddress,
    secondAddress,
    externalConflictStatus: 409,
    readOnlyCopyAddress: copyResult.payload.workspaceCopyAddress,
    restoredSameNameSources: 2,
  }, null, 2));
} finally {
  for (const address of [firstAddress, secondAddress]) {
    const sourceId = address.split(":")[0];
    if (!sourceId) continue;
    await page.request.post(`${baseUrl}/api/workspaces/close`, {
      data: { sourceId },
    }).catch(() => undefined);
  }
  await browser.close();
}
