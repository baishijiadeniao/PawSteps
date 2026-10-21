import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("prisma/dev.db");
const rows = db
  .prepare(
    `select phase, "order", name, category, targetValue, targetUnit, targetSets, timeOfDay
     from RehabPlanItem order by phase, "order"`
  )
  .all();
for (const r of rows) {
  console.log(
    [r.phase, r.order, r.name, r.category, `${r.targetValue}${r.targetUnit ?? ""}`, `×${r.targetSets}`, r.timeOfDay ?? "-"].join("  ")
  );
}
console.log("total", rows.length);
