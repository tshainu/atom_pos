import { Hono } from "hono";
import { cors } from "hono/cors";
import { db } from "./database";
import * as schema from "./database/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

const app = new Hono()
  .basePath("api")
  .use(cors({ origin: "*" }))

  // ── Health ──────────────────────────────────────────────
  .get("/health", (c) => c.json({ status: "ok" }, 200))

  // ── Auth ────────────────────────────────────────────────
  .post("/auth/login", async (c) => {
    const { shopId, username, password } = await c.req.json();
    const shop = await db
      .select()
      .from(schema.shops)
      .where(eq(schema.shops.shopId, shopId))
      .get();
    if (!shop) return c.json({ error: "Shop not found" }, 404);

    const user = await db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.shopId, shop.id),
          eq(schema.users.username, username)
        )
      )
      .get();
    if (!user) return c.json({ error: "User not found" }, 404);
    if (user.passwordHash !== hashPassword(password))
      return c.json({ error: "Invalid password" }, 401);

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await db.insert(schema.sessions).values({ userId: user.id, token, expiresAt });

    return c.json(
      {
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          username: user.username,
          role: user.role,
          shopId: shop.id,
          shopName: shop.name,
        },
      },
      200
    );
  })

  .post("/auth/logout", async (c) => {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    if (token) {
      await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
    }
    return c.json({ success: true }, 200);
  })

  .get("/auth/me", async (c) => {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return c.json({ error: "No token" }, 401);
    const session = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.token, token))
      .get();
    if (!session || session.expiresAt < new Date())
      return c.json({ error: "Invalid session" }, 401);
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, session.userId))
      .get();
    if (!user) return c.json({ error: "User not found" }, 404);
    const shop = await db
      .select()
      .from(schema.shops)
      .where(eq(schema.shops.id, user.shopId))
      .get();
    return c.json(
      {
        user: {
          id: user.id,
          fullName: user.fullName,
          username: user.username,
          role: user.role,
          shopId: user.shopId,
          shopName: shop?.name ?? "",
        },
      },
      200
    );
  })

  // ── Shops ───────────────────────────────────────────────
  .get("/shops", async (c) => {
    const all = await db.select().from(schema.shops);
    return c.json({ shops: all }, 200);
  })
  .post("/shops", async (c) => {
    const body = await c.req.json();
    const [shop] = await db
      .insert(schema.shops)
      .values({ shopId: body.shopId, name: body.name, address: body.address })
      .returning();
    return c.json({ shop }, 201);
  })

  // ── Users / Staff ────────────────────────────────────────
  .get("/users", async (c) => {
    const shopId = c.req.query("shopId");
    const all = shopId
      ? await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.shopId, Number(shopId)))
      : await db.select().from(schema.users);
    return c.json({ users: all }, 200);
  })
  .post("/users", async (c) => {
    const body = await c.req.json();
    const [user] = await db
      .insert(schema.users)
      .values({
        shopId: body.shopId,
        username: body.username,
        passwordHash: hashPassword(body.password),
        fullName: body.fullName,
        role: body.role ?? "cashier",
        address: body.address,
        city: body.city,
        phone: body.phone,
        bank: body.bank,
        branch: body.branch,
        accountNumber: body.accountNumber,
        salary: body.salary,
        salaryPeriod: body.salaryPeriod ?? "monthly",
        commission: body.commission,
        photoUrl: body.photoUrl,
      })
      .returning();
    return c.json({ user }, 201);
  })
  .get("/users/:id", async (c) => {
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, Number(c.req.param("id"))))
      .get();
    if (!user) return c.json({ error: "Not found" }, 404);
    return c.json({ user }, 200);
  })
  .put("/users/:id", async (c) => {
    const body = await c.req.json();
    const updates: Partial<typeof schema.users.$inferInsert> = {
      fullName: body.fullName,
      role: body.role,
      address: body.address,
      city: body.city,
      phone: body.phone,
      bank: body.bank,
      branch: body.branch,
      accountNumber: body.accountNumber,
      salary: body.salary,
      salaryPeriod: body.salaryPeriod,
      commission: body.commission,
      photoUrl: body.photoUrl,
    };
    if (body.password) updates.passwordHash = hashPassword(body.password);
    const [user] = await db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, Number(c.req.param("id"))))
      .returning();
    return c.json({ user }, 200);
  })
  .delete("/users/:id", async (c) => {
    await db.delete(schema.users).where(eq(schema.users.id, Number(c.req.param("id"))));
    return c.json({ success: true }, 200);
  })

  // ── Categories ───────────────────────────────────────────
  .get("/categories", async (c) => {
    const shopId = c.req.query("shopId");
    const rows = shopId
      ? await db.select().from(schema.categories).where(eq(schema.categories.shopId, Number(shopId)))
      : await db.select().from(schema.categories);
    return c.json({ categories: rows }, 200);
  })
  .post("/categories", async (c) => {
    const body = await c.req.json();
    const [cat] = await db.insert(schema.categories).values({ shopId: body.shopId, name: body.name }).returning();
    return c.json({ category: cat }, 201);
  })
  .put("/categories/:id", async (c) => {
    const body = await c.req.json();
    const [cat] = await db.update(schema.categories).set({ name: body.name }).where(eq(schema.categories.id, Number(c.req.param("id")))).returning();
    return c.json({ category: cat }, 200);
  })
  .delete("/categories/:id", async (c) => {
    await db.delete(schema.categories).where(eq(schema.categories.id, Number(c.req.param("id"))));
    return c.json({ success: true }, 200);
  })

  // ── Items ────────────────────────────────────────────────
  .get("/items", async (c) => {
    const shopId = c.req.query("shopId");
    const itemsList = shopId
      ? await db
          .select()
          .from(schema.items)
          .where(eq(schema.items.shopId, Number(shopId)))
      : await db.select().from(schema.items);

    // Attach price groups
    const withPrices = await Promise.all(
      itemsList.map(async (item) => {
        const prices = await db
          .select()
          .from(schema.priceGroups)
          .where(eq(schema.priceGroups.itemId, item.id));
        return { ...item, priceGroups: prices };
      })
    );
    return c.json({ items: withPrices }, 200);
  })
  .post("/items", async (c) => {
    const body = await c.req.json();
    // Auto-generate SKU: count existing items for this shop + 1, padded to 3 digits
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.items)
      .where(eq(schema.items.shopId, body.shopId));
    const nextNum = (Number(countResult[0]?.count ?? 0)) + 1;
    const sku = String(nextNum).padStart(3, "0");

    const [item] = await db
      .insert(schema.items)
      .values({
        shopId: body.shopId,
        name: body.name,
        sku,
        category: body.category ?? "General",
        barcode: body.barcode,
        iconUrl: body.iconUrl,
        commission: body.commission ?? 0,
      })
      .returning();

    // Insert price groups
    if (body.priceGroups?.length) {
      await db.insert(schema.priceGroups).values(
        body.priceGroups.map((pg: { label: string; price: number }) => ({
          itemId: item.id,
          label: pg.label,
          price: pg.price,
        }))
      );
    }
    const prices = await db
      .select()
      .from(schema.priceGroups)
      .where(eq(schema.priceGroups.itemId, item.id));
    return c.json({ item: { ...item, priceGroups: prices } }, 201);
  })
  .put("/items/:id", async (c) => {
    const body = await c.req.json();
    const [item] = await db
      .update(schema.items)
      .set({
        name: body.name,
        category: body.category,
        barcode: body.barcode,
        iconUrl: body.iconUrl,
        commission: body.commission,
      })
      .where(eq(schema.items.id, Number(c.req.param("id"))))
      .returning();

    if (body.priceGroups) {
      await db.delete(schema.priceGroups).where(eq(schema.priceGroups.itemId, item.id));
      await db.insert(schema.priceGroups).values(
        body.priceGroups.map((pg: { label: string; price: number }) => ({
          itemId: item.id,
          label: pg.label,
          price: pg.price,
        }))
      );
    }
    const prices = await db
      .select()
      .from(schema.priceGroups)
      .where(eq(schema.priceGroups.itemId, item.id));
    return c.json({ item: { ...item, priceGroups: prices } }, 200);
  })
  .delete("/items/:id", async (c) => {
    await db.delete(schema.priceGroups).where(eq(schema.priceGroups.itemId, Number(c.req.param("id"))));
    await db.delete(schema.items).where(eq(schema.items.id, Number(c.req.param("id"))));
    return c.json({ success: true }, 200);
  })

  // ── Sales ────────────────────────────────────────────────
  .get("/sales", async (c) => {
    const shopId = c.req.query("shopId");
    const userId = c.req.query("userId");
    let query = db.select().from(schema.sales);
    if (shopId) {
      const all = await db
        .select()
        .from(schema.sales)
        .where(eq(schema.sales.shopId, Number(shopId)))
        .orderBy(desc(schema.sales.createdAt));
      return c.json({ sales: all }, 200);
    }
    const all = await db.select().from(schema.sales).orderBy(desc(schema.sales.createdAt));
    return c.json({ sales: all }, 200);
  })
  .post("/sales", async (c) => {
    const body = await c.req.json();
    const billNumber = `BILL-${Date.now()}`;
    const [sale] = await db
      .insert(schema.sales)
      .values({
        shopId: body.shopId,
        userId: body.userId,
        billNumber,
        subtotal: body.subtotal,
        discount: body.discount ?? 0,
        netPay: body.netPay,
        paymentMethod: body.paymentMethod ?? "cash",
        status: "completed",
      })
      .returning();

    if (body.items?.length) {
      await db.insert(schema.saleItems).values(
        body.items.map((si: { itemId: number; itemName: string; qty: number; pricePerItem: number; total: number }) => ({
          saleId: sale.id,
          itemId: si.itemId,
          itemName: si.itemName,
          qty: si.qty,
          pricePerItem: si.pricePerItem,
          total: si.total,
        }))
      );
    }
    return c.json({ sale }, 201);
  })
  .get("/sales/:id/items", async (c) => {
    const items = await db
      .select()
      .from(schema.saleItems)
      .where(eq(schema.saleItems.saleId, Number(c.req.param("id"))));
    return c.json({ items }, 200);
  })

  // ── Reports / Dashboard ───────────────────────────────────
  .get("/reports/summary", async (c) => {
    const shopId = c.req.query("shopId");
    if (!shopId) return c.json({ error: "shopId required" }, 400);

    const salesData = await db
      .select()
      .from(schema.sales)
      .where(
        and(
          eq(schema.sales.shopId, Number(shopId)),
          eq(schema.sales.status, "completed")
        )
      );

    const totalSales = salesData.reduce((sum, s) => sum + s.netPay, 0);
    const totalItems = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.saleItems)
      .where(
        sql`sale_id IN (SELECT id FROM sales WHERE shop_id = ${shopId} AND status = 'completed')`
      )
      .get();

    // Staff sales breakdown
    const staffSales = await db
      .select({
        userId: schema.sales.userId,
        total: sql<number>`sum(net_pay)`,
        count: sql<number>`count(*)`,
      })
      .from(schema.sales)
      .where(
        and(
          eq(schema.sales.shopId, Number(shopId)),
          eq(schema.sales.status, "completed")
        )
      )
      .groupBy(schema.sales.userId);

    const staffWithNames = await Promise.all(
      staffSales.map(async (s) => {
        const user = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, s.userId))
          .get();
        return {
          userId: s.userId,
          name: user?.fullName ?? "Unknown",
          total: s.total,
          count: s.count,
        };
      })
    );

    return c.json(
      {
        totalSales,
        totalItems: totalItems?.count ?? 0,
        totalBills: salesData.length,
        staffSales: staffWithNames,
      },
      200
    );
  })

  // Seed demo data
  .post("/seed", async (c) => {
    // Create demo shop
    const existing = await db
      .select()
      .from(schema.shops)
      .where(eq(schema.shops.shopId, "SHOP001"))
      .get();
    if (existing) return c.json({ message: "Already seeded" }, 200);

    const [shop] = await db
      .insert(schema.shops)
      .values({ shopId: "SHOP001", name: "ATOM Garments", address: "Colombo, Sri Lanka" })
      .returning();

    const [admin] = await db
      .insert(schema.users)
      .values({
        shopId: shop.id,
        username: "admin",
        passwordHash: hashPassword("admin123"),
        fullName: "Admin User",
        role: "admin",
        phone: "0771234567",
        salary: 50000,
        salaryPeriod: "monthly",
        commission: 2,
      })
      .returning();

    await db.insert(schema.users).values([
      {
        shopId: shop.id,
        username: "raju",
        passwordHash: hashPassword("raju123"),
        fullName: "Raju",
        role: "salesperson",
        phone: "0772345678",
        salary: 25000,
        commission: 5,
      },
      {
        shopId: shop.id,
        username: "kumar",
        passwordHash: hashPassword("kumar123"),
        fullName: "Kumar",
        role: "salesperson",
        phone: "0773456789",
        salary: 22000,
        commission: 5,
      },
      {
        shopId: shop.id,
        username: "priya",
        passwordHash: hashPassword("priya123"),
        fullName: "Priya",
        role: "cashier",
        phone: "0774567890",
        salary: 20000,
        commission: 3,
      },
    ]);

    // Sample items
    const itemsData = [
      { name: "White Shirt", category: "Shirts", prices: [1500, 1550, 1650] },
      { name: "Blue T-Shirt", category: "tshirt", prices: [950, 1000, 1100] },
      { name: "Kids Tee", category: "Kids", prices: [600, 650] },
      { name: "Leather Belt", category: "Accessories", prices: [750, 800] },
      { name: "Black Trousers", category: "Trending", prices: [2200, 2300, 2500] },
    ];

    for (const it of itemsData) {
      const [item] = await db
        .insert(schema.items)
        .values({ shopId: shop.id, name: it.name, category: it.category, commission: 3 })
        .returning();
      await db.insert(schema.priceGroups).values(
        it.prices.map((price, i) => ({
          itemId: item.id,
          label: `Tier ${i + 1}`,
          price,
        }))
      );
    }

    return c.json({ message: "Seeded successfully", shopId: "SHOP001", username: "admin", password: "admin123" }, 201);
  });

export type AppType = typeof app;
export default app;
