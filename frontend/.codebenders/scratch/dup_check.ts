import { generateFullCatalogue } from "../../lib/schemeCatalogue";
import { matchAll } from "../../lib/matcher";

const catalogue = generateFullCatalogue();
const ids = catalogue.map((s) => s.id);
const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
console.log("catalogue size:", catalogue.length, "unique ids:", new Set(ids).size, "duplicate ids:", [...new Set(dupIds)]);

const results = matchAll({}, catalogue);
const resIds = results.map((r) => r.scheme.id);
const dupRes = resIds.filter((id, i) => resIds.indexOf(id) !== i);
console.log("matchAll results:", results.length, "duplicate result ids:", [...new Set(dupRes)]);
