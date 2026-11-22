import { LANGUAGES, REVIEWED, resolveText, translate, type Lang } from "../../lib/i18n";

const keys = ["nav.check", "nav.schemes", "nav.saved", "toggle.label", "status.likelyEligible", "status.needsInfo", "status.notMatched", "provenance.check"];
for (const option of LANGUAGES) {
  const lang: Lang = option.code;
  const rows = keys.map((k) => {
    const r = resolveText(lang, k);
    return `${k}=${JSON.stringify(r.text)}${r.fallback ? "(FALLBACK)" : ""}`;
  });
  console.log(`[${lang}] reviewed=${REVIEWED[lang]}`);
  console.log("  " + rows.join("\n  "));
}
console.log("translate('hi','nav.check') =", translate("hi", "nav.check"));
console.log("translate('kn','nav.check') =", translate("kn", "nav.check"));
