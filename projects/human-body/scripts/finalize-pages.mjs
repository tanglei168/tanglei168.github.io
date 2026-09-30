import { mkdir, readFile, writeFile } from "node:fs/promises";
const locales = ["en", "es", "hi", "zh", "ar", "pt", "fr", "de", "ja", "ru", "id", "ko"];
const html = await readFile("dist-pages/index.html", "utf8");
for (const locale of locales) {
  await mkdir(`dist-pages/${locale}`, { recursive: true });
  await writeFile(`dist-pages/${locale}/index.html`, html);
}
await writeFile("dist-pages/.nojekyll", "");
