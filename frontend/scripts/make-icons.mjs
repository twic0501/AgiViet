import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
const { chromium } = createRequire(process.env.HOME + "/rnd idea/package.json")(
  "playwright",
);
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const svg = await readFile(
  new URL("../assets/logo.svg", import.meta.url),
  "utf8",
);
for (const size of [192, 512]) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>*{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`,
  );
  await page.screenshot({
    path: new URL("../assets/icon-" + size + ".png", import.meta.url).pathname,
    omitBackground: true,
  });
  await page.close();
}
await browser.close();
