import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
export function createDb() {
  const sql = new DatabaseSync(":memory:");
  for (const file of ["0001_app_state.sql", "0002_login_limits.sql"])
    sql.exec(
      readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"),
    );
  return {
    sql,
    prepare(query) {
      const statement = sql.prepare(query);
      let values = [];
      return {
        bind(...params) {
          values = params;
          return this;
        },
        async first() {
          return statement.get(...values) || null;
        },
        async run() {
          let results = [];
          if (query.includes("RETURNING")) results = statement.all(...values);
          else statement.run(...values);
          return {
            success: true,
            results,
            meta: {
              changes: Number(
                sql.prepare("SELECT changes() AS count").get().count,
              ),
            },
          };
        },
      };
    },
    async batch(statements) {
      sql.exec("BEGIN");
      try {
        const out = [];
        for (const statement of statements) out.push(await statement.run());
        sql.exec("COMMIT");
        return out;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
  };
}
