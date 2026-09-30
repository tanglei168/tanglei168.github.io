import { createRoot } from "react-dom/client";
import { LearningApp } from "../app/components/LearningApp";
import { getDictionary } from "../app/i18n/dictionaries";
import { getLocale, isLocale } from "../app/i18n/config";
import "../app/globals.css";

const segment = window.location.pathname.replace(/\/$/, "").split("/").pop() ?? "";
const locale = getLocale(isLocale(segment) ? segment : "zh");
document.documentElement.lang = locale.code;
document.documentElement.dir = locale.dir;
document.body.className = { sc: "font-stack-sc", jp: "font-stack-jp", kr: "font-stack-kr" }[locale.script as "sc" | "jp" | "kr"] ?? "";
getDictionary(locale.code).then((dictionary) => {
  createRoot(document.getElementById("root")!).render(<>
    <a className="aa-map-return" href="/k1-k12/">← K1–K12 学习地图</a>
    <LearningApp locale={locale} dictionary={dictionary} />
  </>);
}).catch(() => {
  document.getElementById("root")!.textContent = "页面加载失败，请刷新后重试。";
});
