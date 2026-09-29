import { access, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { openDesktop } from "./desktop-harness.mjs";
const option = process.argv.indexOf("--directory");
const directory = resolve(option < 0 ? ".orix-demo" : process.argv[option + 1]);
const marker = join(directory, "ORIX-DEMO.json");
try {
  await access(join(directory, "orix-retail-os.sqlite"));
  await access(marker); // Never seed an existing unmarked database.
} catch (error) {
  try {
    await access(join(directory, "orix-retail-os.sqlite"));
    throw new Error("Refusing to seed an existing non-demo database.");
  } catch (check) {
    if (check.code !== "ENOENT") throw check;
  }
}
const desktop = await openDesktop(directory);
const requireOk = async (name, payload) => {
  const result = await desktop.call(name, payload);
  if (!result.ok) throw new Error(`${name}: ${result.error.message}`);
  return result.value;
};
try {
  const status = await requireOk("auth.status");
  if (status.needsSetup) {
    await writeFile(marker, JSON.stringify({ type: "orix-demo", version: 1 }));
    await requireOk("setup.store", {
      storeName: "Orix Demo Store — TEST DATA",
      businessName: "Demo Grocery",
      ownerName: "Demo Owner",
      phone: "",
      email: "",
      address: "Training counter",
      logoDataUrl: null,
      currency: "PKR",
      timezone: "Asia/Karachi",
      taxEnabled: false,
      branchName: "Demo Counter",
      adminFullName: "Demo Owner",
      username: "owner",
      password: "DemoOwner!2026",
      confirmPassword: "DemoOwner!2026",
      pin: "2468"
    });
  } else {
    const stored = JSON.parse(await readFile(marker, "utf8"));
    if (stored.type !== "orix-demo") throw new Error("Invalid demo marker.");
    await requireOk("auth.login", {
      username: "owner",
      password: "DemoOwner!2026",
      rememberMe: false
    });
  }
  const counter = await requireOk("counter.summary");
  if (counter.session === null) await requireOk("counter.open", { openingCashMinor: 50000 });
  const users = await requireOk("users.list", {});
  for (const [username, fullName, role, password, pin] of [
    ["cashier", "Demo Cashier", "Cashier", "DemoCashier!2026", "1357"],
    ["viewer", "Demo Viewer", "Viewer", "DemoViewer!2026", "9876"]
  ]) {
    if (!users.users.some((user) => user.username === username))
      await requireOk("users.save", {
        username,
        fullName,
        roleNames: [role],
        status: "active",
        password,
        pin
      });
  }
  const catalog = await requireOk("products.catalog");
  const page = { page: 1, pageSize: 10000, sortBy: "name", sortDirection: "asc", status: "active" };
  const existing = await requireOk("products.list", page);
  const barcodes = new Set(existing.items.map((item) => item.barcode));
  const names = [
    "Basmati Rice 1kg",
    "Fresh Milk 1L",
    "Cooking Oil 1L",
    "Tea 250g",
    "Sugar 1kg",
    "Flour 5kg",
    "Mineral Water",
    "Biscuits",
    "Laundry Soap",
    "Shampoo"
  ];
  for (let i = 0; i < 600; i++) {
    const barcode = `990${String(i + 1).padStart(10, "0")}`;
    if (barcodes.has(barcode)) continue;
    await requireOk("products.save", {
      name: `${names[i % names.length]} — ${String(i + 1).padStart(3, "0")}`,
      barcode,
      categoryId: catalog.categories[0].id,
      unitId: catalog.units.find((u) => u.name === "Piece").id,
      purchasePriceMinor: 10000 + (i % 10) * 5000,
      salePriceMinor: 15000 + (i % 10) * 5000,
      openingStock: i % 20 === 0 ? 0 : i % 17 === 0 ? 2 : 100,
      minimumStock: 5,
      active: true
    });
  }
  const customers = await requireOk("customers.list", { ...page, customerType: "all" });
  for (let i = customers.totalItems; i < 12; i++)
    await requireOk("customers.save", {
      name: `Demo Customer ${i + 1}`,
      tags: [],
      customerType: "regular",
      creditLimitMinor: 500000,
      openingBalanceMinor: i % 3 === 0 ? 25000 : 0,
      city: "Karachi"
    });
  const suppliers = await requireOk("suppliers.list", page);
  for (let i = suppliers.totalItems; i < 4; i++)
    await requireOk("suppliers.save", {
      name: `Demo Supplier ${i + 1}`,
      tags: [],
      openingBalanceMinor: 100000,
      city: "Karachi"
    });
  const items = (await requireOk("products.list", page)).items.filter((p) => p.currentStock > 10);
  const customer = (await requireOk("customers.list", { ...page, customerType: "all" })).items[0];
  const sales = await requireOk("sales.list", { ...page, sortBy: "createdAt", status: "all" });
  if (sales.totalItems === 0) {
    for (const paymentType of ["cash", "credit"])
      await requireOk("sales.complete", {
        saleDate: new Date().toISOString(),
        paymentType,
        customerId: paymentType === "credit" ? customer.id : null,
        discountMinor: 0,
        taxMinor: 0,
        cashReceivedMinor: paymentType === "cash" ? items[0].salePriceMinor : 0,
        items: [
          {
            productId: items[0].id,
            unitId: items[0].unitId,
            quantity: 1,
            unitPriceMinor: items[0].salePriceMinor,
            discountMinor: 0,
            taxMinor: 0
          }
        ]
      });
    await requireOk("sales.hold", {
      saleDate: new Date().toISOString(),
      paymentType: "cash",
      discountMinor: 0,
      taxMinor: 0,
      cashReceivedMinor: 0,
      holdReason: "Training: resume this basket",
      items: [
        {
          productId: items[1].id,
          unitId: items[1].unitId,
          quantity: 2,
          unitPriceMinor: items[1].salePriceMinor,
          discountMinor: 0,
          taxMinor: 0
        }
      ]
    });
  }
  const result = {
    directory,
    products: (await requireOk("products.list", page)).totalItems,
    customers: (await requireOk("customers.list", { ...page, customerType: "all" })).totalItems,
    suppliers: (await requireOk("suppliers.list", page)).totalItems,
    sales: (await requireOk("sales.list", { ...page, sortBy: "createdAt", status: "all" }))
      .totalItems,
    ownerLogin: (
      await desktop.call("auth.login", {
        username: "owner",
        password: "DemoOwner!2026",
        rememberMe: false
      })
    ).ok,
    cashierLogin: (
      await desktop.call("auth.login", {
        username: "cashier",
        password: "DemoCashier!2026",
        rememberMe: false
      })
    ).ok
  };
  console.log(JSON.stringify(result));
} finally {
  desktop.close();
}
