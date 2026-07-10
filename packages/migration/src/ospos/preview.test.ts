import { describe, expect, it } from "vitest";
import { parseOspoItemsCsv } from "./csv.js";
import { parseOspoQuantities, parseOspoStoreProfile } from "./sql.js";

describe("OSPOS migration parsing", () => {
  it("parses item CSV rows into normalized item records", () => {
    const rows = parseOspoItemsCsv(
      `"name","category","item_number","description","cost_price","unit_price","reorder_level","receiving_quantity","item_id","deleted","pack_name"
"Cooking Oil 1L","Grocery","12345","Daily item","640.00","700.00","5.000","1.000","42","0","Each"
`
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      itemId: "42",
      name: "Cooking Oil 1L",
      category: "Grocery",
      barcode: "12345",
      costPrice: 640,
      salePrice: 700,
      deleted: false
    });
  });

  it("parses SQL app config and item quantities", () => {
    const sql = `
INSERT INTO \`ospos_app_config\` (\`key\`, \`value\`) VALUES
('company', 'Signature Mini Mart'),
('currency_code', 'PKR');
INSERT INTO \`ospos_item_quantities\` (\`item_id\`, \`location_id\`, \`quantity\`) VALUES
(42, 1, 12.000),
(42, 2, -2.000);
`;

    expect(parseOspoStoreProfile(sql)).toMatchObject({
      company: "Signature Mini Mart",
      currencyCode: "PKR"
    });
    expect(parseOspoQuantities(sql)).toEqual([
      { itemId: "42", locationId: "1", quantity: 12 },
      { itemId: "42", locationId: "2", quantity: -2 }
    ]);
  });
});
