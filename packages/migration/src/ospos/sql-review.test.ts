import { describe, expect, it } from "vitest";
import { extractInsertRows } from "./sql.js";
import { createSqlReview } from "./sql-review.js";

const fixture = `SET time_zone = '+00:00';
INSERT INTO \`ospos_app_config\` (\`key\`, \`value\`) VALUES ('company','Test Store'),('currency_code','PKR'),('timezone','Asia/Karachi');
INSERT INTO \`ospos_items\` (\`item_id\`,\`name\`,\`category\`,\`item_number\`,\`cost_price\`,\`unit_price\`,\`reorder_level\`,\`deleted\`,\`pack_name\`,\`stock_type\`) VALUES
(1,'Tea; large','Grocery','123',100,150,2,0,'Each',0),(2,'Tea','Grocery','123',100,0,0,0,'Each',0),(3,'Old item','Grocery',NULL,1,1,0,1,'Each',0);
INSERT INTO \`ospos_item_quantities\` (\`item_id\`,\`location_id\`,\`quantity\`) VALUES (1,1,5),(2,1,-2),(3,1,0);
INSERT INTO \`ospos_stock_locations\` (\`location_id\`,\`location_name\`,\`deleted\`) VALUES (1,'Store',0);
INSERT INTO \`ospos_people\` (\`person_id\`,\`first_name\`,\`last_name\`,\`phone_number\`) VALUES (7,'Test','Contact','12345');
INSERT INTO \`ospos_suppliers\` (\`person_id\`,\`company_name\`,\`deleted\`) VALUES (7,'Test supplier',0);
INSERT INTO \`ospos_sales\` (\`sale_id\`,\`sale_time\`) VALUES (1,'2026-07-07 17:20:18');`;

describe("SQL-only import review", () => {
  it("reads quoted semicolons and distinguishes literal NULL from SQL NULL", () => {
    expect(
      extractInsertRows(
        "INSERT INTO `x` (`a`,`b`) VALUES ('Tea; large','NULL'),(' O''Brien ',NULL);",
        "x"
      )
    ).toEqual([
      { a: "Tea; large", b: "NULL" },
      { a: " O'Brien ", b: null }
    ]);
  });
  it("rejects truncated tuples instead of silently importing partial records", () => {
    expect(() => extractInsertRows("INSERT INTO `x` (`a`,`b`) VALUES (1);", "x")).toThrow();
  });
  it("rejects a cut-off tuple or trailing row separator", () => {
    expect(() => extractInsertRows("INSERT INTO `x` (`a`,`b`) VALUES (1,;", "x")).toThrow();
    expect(() => extractInsertRows("INSERT INTO `x` (`a`,`b`) VALUES (1,2),;", "x")).toThrow();
  });
  it("builds a SQL-only snapshot with originals, contacts and UTC metadata", () => {
    const result = createSqlReview(fixture, "old-pos.sql");
    expect(result.products).toHaveLength(2);
    expect(result.products[0]).toMatchObject({
      sourceItemId: "1",
      name: "Tea; large",
      openingStock: 5,
      purchasePriceMinor: 10000
    });
    expect(result.products[1]?.openingStock).toBe(-2);
    expect(result.archivedProducts).toBe(1);
    expect(result.contacts[0]).toMatchObject({
      kind: "supplier",
      name: "Test supplier",
      phone: "12345"
    });
    expect(result.sourceTimezone).toBe("+00:00");
    expect(result.latestSaleAt).toBe("2026-07-07T17:20:18.000Z");
    expect(result.sourceHash).toHaveLength(64);
  });
  it("rejects unrelated databases and invalid numeric values", () => {
    expect(() => createSqlReview("CREATE TABLE other (id INT);", "other.sql")).toThrow();
    expect(() =>
      createSqlReview(fixture.replace("100,150,2", "'oops',150,2"), "bad.sql")
    ).toThrow();
  });
  it("does not silently combine multiple stock locations", () => {
    const review = createSqlReview(
      fixture.replace("(1,'Store',0)", "(1,'Store',0),(2,'Warehouse',0)"),
      "multi.sql"
    );
    expect(review.blockers.some((message) => message.includes("location"))).toBe(true);
  });
});
