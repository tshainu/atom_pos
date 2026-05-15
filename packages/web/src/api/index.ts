import { Hono } from "hono";
import { cors } from "hono/cors";
import { db } from "./database";
import * as schema from "./database/schema";
import { eq, and, desc, sql, or, isNull } from "drizzle-orm";
import crypto from "crypto";
import { generateText } from "ai";
import { gateway } from "./lib/gateway";

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
    if ((shop as any).suspended) return c.json({ error: "Shop is suspended" }, 403);

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
    if ((user as any).suspended) return c.json({ error: "User is suspended" }, 403);
    if (user.passwordHash !== hashPassword(password))
      return c.json({ error: "Invalid password" }, 401);

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(schema.sessions).values({ userId: user.id, token, expiresAt });

    // Log login activity
    try {
      await db.insert(schema.activityLog).values({ userId: user.id, shopId: shop.id, action: "login", details: `${user.username} logged in`, ip: c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? null } as any);
    } catch (_) {}

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
          shopCode: shop.shopId,
          shopAddress: shop.address ?? "",
          shopPhone: shop.phone ?? "",
        },
      },
      200
    );
  })

  .post("/auth/logout", async (c) => {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    if (token) {
      const session = await db.select().from(schema.sessions).where(eq(schema.sessions.token, token)).get();
      if (session) {
        const user = await db.select().from(schema.users).where(eq(schema.users.id, session.userId)).get();
        if (user) {
          try {
            await db.insert(schema.activityLog).values({ userId: user.id, shopId: user.shopId, action: "logout", details: `${user.username} logged out` } as any);
          } catch (_) {}
        }
      }
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
          shopCode: shop?.shopId ?? "",
          shopAddress: shop?.address ?? "",
          shopPhone: (shop as any)?.phone ?? "",
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
  .get("/shops/:id", async (c) => {
    const shop = await db.select().from(schema.shops).where(eq(schema.shops.id, Number(c.req.param("id")))).get();
    if (!shop) return c.json({ error: "Not found" }, 404);
    return c.json({ shop }, 200);
  })
  .put("/shops/:id", async (c) => {
    const body = await c.req.json();
    const [shop] = await db
      .update(schema.shops)
      .set({ name: body.name, address: body.address, phone: body.phone })
      .where(eq(schema.shops.id, Number(c.req.param("id"))))
      .returning();
    return c.json({ shop }, 200);
  })
  .post("/shops", async (c) => {
    const body = await c.req.json();
    const [shop] = await db
      .insert(schema.shops)
      .values({ shopId: body.shopId, name: body.name, address: body.address, phone: body.phone })
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

  // ── Patch item icon URL ──────────────────────────────────
  .patch("/items/:id", async (c) => {
    const { iconUrl } = await c.req.json();
    await db.update(schema.items)
      .set({ iconUrl })
      .where(eq(schema.items.id, Number(c.req.param("id"))));
    return c.json({ success: true }, 200);
  })

  // ── Generate product icon via AI ─────────────────────────
  .post("/items/generate-icon", async (c) => {
    const { name, category } = await c.req.json();
    if (!name) return c.json({ error: "name required" }, 400);
    try {
      const prompt = `Generate a clean, minimal flat icon for a garment/clothing product: "${name}" (category: ${category || "General"}). 
The icon should be a simple, centered illustration on a pure white background. 
Style: flat design, no shadows, no text, no labels, single clothing item, vibrant colors, suitable as a small product thumbnail. 
The image should be square, 256x256 pixels.`;
      const { files } = await generateText({
        model: gateway("google/gemini-3-pro-image"),
        providerOptions: { google: { responseModalities: ["TEXT", "IMAGE"] } },
        prompt,
      });
      if (files && files.length > 0) {
        const file = files[0]!;
        const base64 = Buffer.from(file.uint8Array).toString("base64");
        const dataUrl = `data:${file.mediaType};base64,${base64}`;
        return c.json({ iconUrl: dataUrl }, 200);
      }
      return c.json({ error: "No image generated" }, 500);
    } catch (e: any) {
      console.error("Icon generation error:", e?.message);
      return c.json({ error: e?.message || "Failed to generate icon" }, 500);
    }
  })

  // ── Sales ────────────────────────────────────────────────

  // GET held bills for a shop
  .get("/sales/held", async (c) => {
    const shopId = c.req.query("shopId");
    if (!shopId) return c.json({ error: "shopId required" }, 400);
    const heldSales = await db
      .select()
      .from(schema.sales)
      .where(and(eq(schema.sales.shopId, Number(shopId)), eq(schema.sales.status, "held")))
      .orderBy(desc(schema.sales.createdAt));
    // Attach line items
    const withItems = await Promise.all(
      heldSales.map(async (sale) => {
        const lineItems = await db
          .select()
          .from(schema.saleItems)
          .where(eq(schema.saleItems.saleId, sale.id));
        return { ...sale, items: lineItems };
      })
    );
    return c.json({ sales: withItems }, 200);
  })

  // GET recent completed bills for a shop
  .get("/sales/recent", async (c) => {
    const shopId = c.req.query("shopId");
    if (!shopId) return c.json({ error: "shopId required" }, 400);
    const recentSales = await db
      .select()
      .from(schema.sales)
      .where(and(eq(schema.sales.shopId, Number(shopId)), eq(schema.sales.status, "completed")))
      .orderBy(desc(schema.sales.createdAt))
      .limit(50);
    return c.json({ sales: recentSales }, 200);
  })

  .get("/sales", async (c) => {
    const shopId = c.req.query("shopId");
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
    // Sequential bill number per shop: 001, 002, 003...
    const countRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.sales)
      .where(eq(schema.sales.shopId, body.shopId));
    const nextNum = (Number(countRes[0]?.count ?? 0)) + 1;
    const billNumber = String(nextNum).padStart(3, "0");
    const [sale] = await db
      .insert(schema.sales)
      .values({
        shopId: body.shopId,
        userId: body.userId,
        soldBy: body.soldBy ?? body.userId,
        billNumber,
        billType: body.billType ?? "normal",
        subtotal: body.subtotal,
        discount: body.discount ?? 0,
        netPay: body.netPay,
        paymentMethod: body.paymentMethod ?? "cash",
        status: body.status ?? "completed",
        customerName: body.customerName ?? null,
        customerPhone: body.customerPhone ?? null,
        promisedDate: body.promisedDate ?? null,
        heldLabel: body.heldLabel ?? null,
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
    const saleLineItems = await db
      .select()
      .from(schema.saleItems)
      .where(eq(schema.saleItems.saleId, Number(c.req.param("id"))));
    return c.json({ items: saleLineItems }, 200);
  })

  // Restore a held bill — mark as completed
  .put("/sales/:id/restore", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const [sale] = await db
      .update(schema.sales)
      .set({
        status: "completed",
        paymentMethod: body.paymentMethod ?? "cash",
        customerName: body.customerName ?? null,
        customerPhone: body.customerPhone ?? null,
        promisedDate: body.promisedDate ?? null,
      })
      .where(eq(schema.sales.id, Number(c.req.param("id"))))
      .returning();
    return c.json({ sale }, 200);
  })

  // Delete a sale (held or otherwise)
  .delete("/sales/:id", async (c) => {
    await db.delete(schema.saleItems).where(eq(schema.saleItems.saleId, Number(c.req.param("id"))));
    await db.delete(schema.sales).where(eq(schema.sales.id, Number(c.req.param("id"))));
    return c.json({ success: true }, 200);
  })

  // ── Reports / Dashboard ───────────────────────────────────
  .get("/reports/sales-chart", async (c) => {
    const shopId = c.req.query("shopId");
    const range = c.req.query("range") ?? "today";
    const from = c.req.query("from");
    const to = c.req.query("to");
    if (!shopId) return c.json({ error: "shopId required" }, 400);

    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);
    let groupBy: "hour" | "day" | "month" = "day";

    if (range === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(startDate.getTime() + 86400000);
      groupBy = "hour";
    } else if (range === "week") {
      const day = now.getDay();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      endDate = new Date(startDate.getTime() + 7 * 86400000);
      groupBy = "day";
    } else if (range === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      groupBy = "day";
    } else if (range === "lastmonth") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 1);
      groupBy = "day";
    } else if (range === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear() + 1, 0, 1);
      groupBy = "month";
    } else if (range === "custom" && from && to) {
      startDate = new Date(from);
      endDate = new Date(to);
      const diffDays = (endDate.getTime() - startDate.getTime()) / 86400000;
      groupBy = diffDays <= 2 ? "hour" : diffDays <= 90 ? "day" : "month";
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(startDate.getTime() + 86400000);
      groupBy = "hour";
    }

    const sales = await db
      .select({ netPay: schema.sales.netPay, createdAt: schema.sales.createdAt })
      .from(schema.sales)
      .where(
        and(
          eq(schema.sales.shopId, Number(shopId)),
          eq(schema.sales.status, "completed"),
          sql`created_at >= ${Math.floor(startDate.getTime() / 1000)}`,
          sql`created_at < ${Math.floor(endDate.getTime() / 1000)}`
        )
      );

    const buckets: Record<string, number> = {};

    if (groupBy === "hour") {
      for (let h = 0; h < 24; h++) buckets[String(h).padStart(2, "0") + ":00"] = 0;
      for (const s of sales) {
        const d = new Date(s.createdAt instanceof Date ? s.createdAt : (s.createdAt as number) * 1000);
        const key = String(d.getHours()).padStart(2, "0") + ":00";
        buckets[key] = (buckets[key] ?? 0) + s.netPay;
      }
    } else if (groupBy === "day") {
      const cur = new Date(startDate);
      while (cur < endDate) {
        const key = `${cur.getMonth() + 1}/${cur.getDate()}`;
        buckets[key] = 0;
        cur.setDate(cur.getDate() + 1);
      }
      for (const s of sales) {
        const d = new Date(s.createdAt instanceof Date ? s.createdAt : (s.createdAt as number) * 1000);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        if (key in buckets) buckets[key] = (buckets[key] ?? 0) + s.netPay;
      }
    } else {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (cur < endDate) {
        buckets[months[cur.getMonth()]] = 0;
        cur.setMonth(cur.getMonth() + 1);
      }
      for (const s of sales) {
        const d = new Date(s.createdAt instanceof Date ? s.createdAt : (s.createdAt as number) * 1000);
        const key = months[d.getMonth()];
        if (key in buckets) buckets[key] = (buckets[key] ?? 0) + s.netPay;
      }
    }

    const points = Object.entries(buckets).map(([label, value]) => ({ label, value }));
    const totalSales = sales.reduce((sum, s) => sum + s.netPay, 0);
    const totalBills = sales.length;

    return c.json({ points, totalSales, totalBills, groupBy }, 200);
  })

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

    const staffSales = await db
      .select({
        soldBy: sql<number>`coalesce(sold_by, user_id)`,
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
      .groupBy(sql`coalesce(sold_by, user_id)`);

    const staffWithNames = await Promise.all(
      staffSales.map(async (s) => {
        const user = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, s.soldBy))
          .get();
        return {
          userId: s.soldBy,
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

  // ── Staff Sales Report ────────────────────────────────────────────────────
  .get("/reports/staff-sales", async (c) => {
    const shopId = Number(c.req.query("shopId"));
    const from = c.req.query("from");
    const to = c.req.query("to");
    if (!shopId) return c.json({ error: "shopId required" }, 400);

    const conditions: any[] = [
      eq(schema.sales.shopId, shopId),
      eq(schema.sales.status, "completed"),
    ];
    if (from) conditions.push(sql`created_at >= ${Math.floor(new Date(from + "T00:00:00").getTime() / 1000)}`);
    if (to) conditions.push(sql`created_at <= ${Math.floor(new Date(to + "T23:59:59").getTime() / 1000)}`);

    const staffRows = await db
      .select({
        soldBy: sql<number>`coalesce(sold_by, user_id)`,
        total: sql<number>`sum(net_pay)`,
        count: sql<number>`count(*)`,
        cashTotal: sql<number>`sum(case when payment_method != 'credit' then net_pay else 0 end)`,
        creditTotal: sql<number>`sum(case when payment_method = 'credit' then net_pay else 0 end)`,
      })
      .from(schema.sales)
      .where(and(...conditions))
      .groupBy(sql`coalesce(sold_by, user_id)`);

    const rows = await Promise.all(
      staffRows.map(async (s) => {
        const user = await db.select().from(schema.users).where(eq(schema.users.id, s.soldBy)).get();
        return {
          userId: s.soldBy,
          name: user?.fullName ?? "Unknown",
          role: user?.role ?? "—",
          total: s.total,
          count: s.count,
          cashTotal: s.cashTotal,
          creditTotal: s.creditTotal,
        };
      })
    );

    const grandTotal = rows.reduce((sum, r) => sum + (r.total ?? 0), 0);
    return c.json({ rows, grandTotal }, 200);
  })

  // ── Today's Dashboard Summary ─────────────────────────────────────────────
  .get("/reports/today", async (c) => {
    const shopId = Number(c.req.query("shopId"));
    if (!shopId) return c.json({ error: "shopId required" }, 400);
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

    // Today's sales (cash + card)
    const todaySales = await db.select({ netPay: schema.sales.netPay, paymentMethod: schema.sales.paymentMethod })
      .from(schema.sales)
      .where(and(
        eq(schema.sales.shopId, shopId),
        eq(schema.sales.status, "completed"),
        sql`created_at >= ${Math.floor(todayStart.getTime()/1000)}`,
        sql`created_at <= ${Math.floor(todayEnd.getTime()/1000)}`
      ));

    const totalSales = todaySales.filter(s => s.paymentMethod !== "credit").reduce((s,x) => s + x.netPay, 0);

    // Today's credit collections
    const todayCollections = await db.select({ amount: schema.creditCollections.amount })
      .from(schema.creditCollections)
      .where(and(
        eq(schema.creditCollections.shopId, shopId),
        sql`created_at >= ${Math.floor(todayStart.getTime()/1000)}`,
        sql`created_at <= ${Math.floor(todayEnd.getTime()/1000)}`
      ));
    const totalCollections = todayCollections.reduce((s,x) => s + x.amount, 0);

    // Today's items sold
    const itemsSold = await db.select({ qty: schema.saleItems.qty })
      .from(schema.saleItems)
      .where(sql`sale_id IN (SELECT id FROM sales WHERE shop_id = ${shopId} AND status = 'completed' AND created_at >= ${Math.floor(todayStart.getTime()/1000)} AND created_at <= ${Math.floor(todayEnd.getTime()/1000)})`);
    const totalItemsSold = itemsSold.reduce((s,x) => s + x.qty, 0);

    return c.json({ totalSales, totalCollections, todayCollection: totalSales + totalCollections, totalItemsSold }, 200);
  })

  // ── Report: Sales Report (Bill no | amount) ────────────────────────────────
  .get("/reports/sales", async (c) => {
    const shopId = Number(c.req.query("shopId"));
    const { from, to } = c.req.query() as { from?: string; to?: string };
    if (!shopId) return c.json({ error: "shopId required" }, 400);
    const conditions: any[] = [eq(schema.sales.shopId, shopId), eq(schema.sales.status, "completed")];
    if (from) conditions.push(sql`created_at >= ${Math.floor(new Date(from).getTime()/1000)}`);
    if (to) conditions.push(sql`created_at <= ${Math.floor(new Date(to).getTime()/1000)}`);
    const rows = await db.select({
      id: schema.sales.id, billNumber: schema.sales.billNumber,
      netPay: schema.sales.netPay, discount: schema.sales.discount,
      paymentMethod: schema.sales.paymentMethod, createdAt: schema.sales.createdAt,
      customerName: schema.sales.customerName,
    }).from(schema.sales).where(and(...conditions)).orderBy(desc(schema.sales.createdAt));
    const total = rows.reduce((s,r) => s + r.netPay, 0);
    return c.json({ rows, total }, 200);
  })

  // ── Report: Item Sales Report (Bill no | item | amount) ────────────────────
  .get("/reports/item-sales", async (c) => {
    const shopId = Number(c.req.query("shopId"));
    const { from, to } = c.req.query() as { from?: string; to?: string };
    if (!shopId) return c.json({ error: "shopId required" }, 400);
    const saleConditions: any[] = [eq(schema.sales.shopId, shopId), eq(schema.sales.status, "completed")];
    if (from) saleConditions.push(sql`s.created_at >= ${Math.floor(new Date(from).getTime()/1000)}`);
    if (to) saleConditions.push(sql`s.created_at <= ${Math.floor(new Date(to).getTime()/1000)}`);

    const fromTs = from ? Math.floor(new Date(from).getTime()/1000) : null;
    const toTs = to ? Math.floor(new Date(to).getTime()/1000) : null;
    const conditions: any[] = [eq(schema.sales.shopId, shopId), eq(schema.sales.status, "completed")];
    if (fromTs) conditions.push(sql`s.created_at >= ${fromTs}`);
    if (toTs) conditions.push(sql`s.created_at <= ${toTs}`);
    const rows = await db
      .select({
        bill_number: schema.sales.billNumber,
        item_name: schema.saleItems.itemName,
        qty: schema.saleItems.qty,
        price_per_item: schema.saleItems.pricePerItem,
        total: schema.saleItems.total,
        created_at: schema.sales.createdAt,
      })
      .from(schema.saleItems)
      .innerJoin(schema.sales, eq(schema.saleItems.saleId, schema.sales.id))
      .where(and(
        eq(schema.sales.shopId, shopId),
        eq(schema.sales.status, "completed"),
        ...(fromTs ? [sql`${schema.sales.createdAt} >= ${new Date(fromTs * 1000)}`] : []),
        ...(toTs ? [sql`${schema.sales.createdAt} <= ${new Date(toTs * 1000)}`] : []),
      ))
      .orderBy(desc(schema.sales.createdAt));
    const total = rows.reduce((s: number, r: any) => s + (Number(r.total) || 0), 0);
    return c.json({ rows, total }, 200);
  })

  // ── Report: Item Report (Item | qty | amount) ──────────────────────────────
  .get("/reports/items", async (c) => {
    const shopId = Number(c.req.query("shopId"));
    const { from, to } = c.req.query() as { from?: string; to?: string };
    if (!shopId) return c.json({ error: "shopId required" }, 400);

    const fromTs2 = from ? Math.floor(new Date(from).getTime() / 1000) : null;
    const toTs2 = to ? Math.floor(new Date(to).getTime() / 1000) : null;
    const rows = await db
      .select({
        item_name: schema.saleItems.itemName,
        total_qty: sql<number>`SUM(${schema.saleItems.qty})`,
        total_amount: sql<number>`SUM(${schema.saleItems.total})`,
      })
      .from(schema.saleItems)
      .innerJoin(schema.sales, eq(schema.saleItems.saleId, schema.sales.id))
      .where(and(
        eq(schema.sales.shopId, shopId),
        eq(schema.sales.status, "completed"),
        ...(fromTs2 ? [sql`${schema.sales.createdAt} >= ${fromTs2}`] : []),
        ...(toTs2 ? [sql`${schema.sales.createdAt} <= ${toTs2}`] : []),
      ))
      .groupBy(schema.saleItems.itemName)
      .orderBy(sql`SUM(${schema.saleItems.total}) DESC`);
    const totalAmount = rows.reduce((s: number, r: any) => s + (Number(r.total_amount) || 0), 0);
    const totalQty = rows.reduce((s: number, r: any) => s + (Number(r.total_qty) || 0), 0);
    return c.json({ rows, totalAmount, totalQty }, 200);
  })

  // ── Report: Credit Sales Report ────────────────────────────────────────────
  .get("/reports/credit-sales", async (c) => {
    const shopId = Number(c.req.query("shopId"));
    const { from, to } = c.req.query() as { from?: string; to?: string };
    if (!shopId) return c.json({ error: "shopId required" }, 400);
    const conditions: any[] = [
      eq(schema.sales.shopId, shopId),
      eq(schema.sales.paymentMethod, "credit"),
      eq(schema.sales.status, "completed"),
    ];
    if (from) conditions.push(sql`created_at >= ${Math.floor(new Date(from).getTime()/1000)}`);
    if (to) conditions.push(sql`created_at <= ${Math.floor(new Date(to).getTime()/1000)}`);
    const rows = await db.select().from(schema.sales).where(and(...conditions)).orderBy(desc(schema.sales.createdAt));
    const totalCredit = rows.reduce((s,r) => s + r.netPay, 0);
    const totalCollected = rows.reduce((s,r) => s + r.collectedAmount, 0);
    return c.json({ rows, totalCredit, totalCollected, totalOutstanding: totalCredit - totalCollected }, 200);
  })

  // ── Report: Collection Report ──────────────────────────────────────────────
  .get("/reports/collections", async (c) => {
    const shopId = Number(c.req.query("shopId"));
    const { from, to } = c.req.query() as { from?: string; to?: string };
    if (!shopId) return c.json({ error: "shopId required" }, 400);
    const conditions: any[] = [eq(schema.creditCollections.shopId, shopId)];
    if (from) conditions.push(sql`created_at >= ${Math.floor(new Date(from).getTime()/1000)}`);
    if (to) conditions.push(sql`created_at <= ${Math.floor(new Date(to).getTime()/1000)}`);
    const fromTs3 = from ? Math.floor(new Date(from).getTime() / 1000) : null;
    const toTs3 = to ? Math.floor(new Date(to).getTime() / 1000) : null;
    const rows = await db
      .select({
        id: schema.creditCollections.id,
        amount: schema.creditCollections.amount,
        note: schema.creditCollections.note,
        created_at: schema.creditCollections.createdAt,
        bill_number: schema.sales.billNumber,
        customer_name: schema.sales.customerName,
        customer_phone: schema.sales.customerPhone,
        net_pay: schema.sales.netPay,
      })
      .from(schema.creditCollections)
      .innerJoin(schema.sales, eq(schema.creditCollections.saleId, schema.sales.id))
      .where(and(
        eq(schema.creditCollections.shopId, shopId),
        ...(fromTs3 ? [sql`${schema.creditCollections.createdAt} >= ${fromTs3}`] : []),
        ...(toTs3 ? [sql`${schema.creditCollections.createdAt} <= ${toTs3}`] : []),
      ))
      .orderBy(desc(schema.creditCollections.createdAt));
    const total = rows.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
    return c.json({ rows, total }, 200);
  })

  // ── Credit Sales for collection screen ────────────────────────────────────
  .get("/credit-sales", async (c) => {
    const shopId = Number(c.req.query("shopId"));
    if (!shopId) return c.json({ error: "shopId required" }, 400);
    const rows = await db.select().from(schema.sales)
      .where(and(eq(schema.sales.shopId, shopId), eq(schema.sales.paymentMethod, "credit"), eq(schema.sales.status, "completed")))
      .orderBy(desc(schema.sales.createdAt));
    return c.json({ sales: rows }, 200);
  })

  // ── Record credit collection payment ──────────────────────────────────────
  .post("/credit-collections", async (c) => {
    const body = await c.req.json();
    const { shopId, saleId, amount, note, collectedBy, userId } = body;
    if (!shopId || !saleId || !amount) return c.json({ error: "Missing fields" }, 400);
    const collectorId = collectedBy ?? userId ?? 0;

    const [collection] = await db.insert(schema.creditCollections)
      .values({ shopId, saleId, amount, note: note ?? "", collectedBy: collectorId })
      .returning();

    // Update the collected amount on the sale
    const sale = await db.select().from(schema.sales).where(eq(schema.sales.id, saleId)).get();
    if (sale) {
      await db.update(schema.sales)
        .set({ collectedAmount: (sale.collectedAmount ?? 0) + amount })
        .where(eq(schema.sales.id, saleId));
    }
    return c.json({ collection }, 201);
  })

  // ── Shop Settings ──────────────────────────────────────────────────────────
  .get("/settings/:shopId", async (c) => {
    const shopId = Number(c.req.param("shopId"));
    let settings = await db.select().from(schema.shopSettings).where(eq(schema.shopSettings.shopId, shopId)).get();
    if (!settings) {
      // auto-create defaults
      const [created] = await db.insert(schema.shopSettings).values({ shopId }).returning();
      settings = created;
    }
    return c.json({ settings }, 200);
  })
  .put("/settings/:shopId", async (c) => {
    const shopId = Number(c.req.param("shopId"));
    const body = await c.req.json();
    const existing = await db.select().from(schema.shopSettings).where(eq(schema.shopSettings.shopId, shopId)).get();
    if (!existing) {
      const [created] = await db.insert(schema.shopSettings).values({ shopId, ...body, updatedAt: new Date() }).returning();
      return c.json({ settings: created }, 201);
    }
    const [updated] = await db
      .update(schema.shopSettings)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(schema.shopSettings.shopId, shopId))
      .returning();
    return c.json({ settings: updated }, 200);
  })

  // Seed demo data
  .post("/seed", async (c) => {
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

    await db.insert(schema.users).values({
      shopId: shop.id,
      username: "admin",
      passwordHash: hashPassword("admin123"),
      fullName: "Admin User",
      role: "admin",
      phone: "0771234567",
      salary: 50000,
      salaryPeriod: "monthly",
      commission: 2,
    });

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
    ]);

    const itemsData = [
      { name: "White Shirt", category: "Shirts", prices: [1500, 1550, 1650] },
      { name: "Blue T-Shirt", category: "Tshirts", prices: [950, 1000, 1100] },
      { name: "Kids Tee", category: "Kids", prices: [600, 650] },
      { name: "Leather Belt", category: "Belts", prices: [750, 800] },
      { name: "Black Trousers", category: "Pants", prices: [2200, 2300, 2500] },
    ];

    for (const it of itemsData) {
      const [item] = await db
        .insert(schema.items)
        .values({ shopId: shop.id, name: it.name, category: it.category, commission: 3 })
        .returning();
      await db.insert(schema.priceGroups).values(
        it.prices.map((price, i) => ({ itemId: item.id, label: `Tier ${i + 1}`, price }))
      );
    }

    return c.json({ message: "Seeded successfully", shopId: "SHOP001", username: "admin", password: "admin123" }, 201);
  })

  // ── Admin Auth ──────────────────────────────────────────
  .post("/admin/login", async (c) => {
    const { username, password } = await c.req.json();
    const adminUser = process.env.ADMIN_USERNAME || "superadmin";
    const adminPass = process.env.ADMIN_PASSWORD || "admin123";
    if (username !== adminUser || password !== adminPass) {
      return c.json({ error: "Invalid credentials" }, 401);
    }
    const token = "admin_" + crypto.randomBytes(32).toString("hex");
    return c.json({ token }, 200);
  })

  // ── Admin Middleware helper ─────────────────────────────
  // All /admin/* routes below validate the admin token
  .get("/admin/dashboard", async (c) => {
    const auth = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!auth?.startsWith("admin_")) return c.json({ error: "Unauthorized" }, 401);

    const totalShops = await db.select({ count: sql<number>`count(*)` }).from(schema.shops).get();
    const activeShops = await db.select({ count: sql<number>`count(*)` }).from(schema.shops).where(sql`suspended = 0`).get();
    const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(schema.users).get();

    // Currently logged in = active sessions not expired
    const nowSec = Math.floor(Date.now() / 1000);
    const activeSessions = await db.select({ count: sql<number>`count(distinct user_id)` })
      .from(schema.sessions)
      .where(sql`expires_at > ${nowSec}`)
      .get();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime() / 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000;

    const salesToday = await db
      .select({ count: sql<number>`count(*)`, revenue: sql<number>`sum(net_pay)` })
      .from(schema.sales).where(sql`created_at >= ${todayStart} AND status = 'completed'`).get();
    const salesWeek = await db
      .select({ count: sql<number>`count(*)`, revenue: sql<number>`sum(net_pay)` })
      .from(schema.sales).where(sql`created_at >= ${weekStart} AND status = 'completed'`).get();
    const salesMonth = await db
      .select({ count: sql<number>`count(*)`, revenue: sql<number>`sum(net_pay)` })
      .from(schema.sales).where(sql`created_at >= ${monthStart} AND status = 'completed'`).get();
    const salesAll = await db
      .select({ count: sql<number>`count(*)`, revenue: sql<number>`sum(net_pay)` })
      .from(schema.sales).where(sql`status = 'completed'`).get();

    // Last 30 days chart data
    const days30Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime() / 1000;
    const dailySales = await db
      .select({
        day: sql<string>`date(datetime(created_at, 'unixepoch'))`,
        revenue: sql<number>`sum(net_pay)`,
        count: sql<number>`count(*)`,
      })
      .from(schema.sales)
      .where(sql`created_at >= ${days30Start} AND status = 'completed'`)
      .groupBy(sql`date(datetime(created_at, 'unixepoch'))`)
      .orderBy(sql`date(datetime(created_at, 'unixepoch')) ASC`);

    // Monthly new shops chart (last 12 months)
    const year1Start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).getTime() / 1000;
    const monthlyShops = await db
      .select({
        month: sql<string>`strftime('%Y-%m', datetime(created_at, 'unixepoch'))`,
        count: sql<number>`count(*)`,
      })
      .from(schema.shops)
      .where(sql`created_at >= ${year1Start}`)
      .groupBy(sql`strftime('%Y-%m', datetime(created_at, 'unixepoch'))`)
      .orderBy(sql`strftime('%Y-%m', datetime(created_at, 'unixepoch')) ASC`);

    return c.json({
      totalShops: totalShops?.count ?? 0,
      activeShops: activeShops?.count ?? 0,
      loggedIn: activeSessions?.count ?? 0,
      totalUsers: totalUsers?.count ?? 0,
      today: { count: salesToday?.count ?? 0, revenue: salesToday?.revenue ?? 0 },
      week: { count: salesWeek?.count ?? 0, revenue: salesWeek?.revenue ?? 0 },
      month: { count: salesMonth?.count ?? 0, revenue: salesMonth?.revenue ?? 0 },
      allTime: { count: salesAll?.count ?? 0, revenue: salesAll?.revenue ?? 0 },
      dailyChart: dailySales,
      monthlyShops,
    }, 200);
  })

  .get("/admin/shops", async (c) => {
    const auth = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!auth?.startsWith("admin_")) return c.json({ error: "Unauthorized" }, 401);

    const allShops = await db.select().from(schema.shops).orderBy(desc(schema.shops.createdAt));
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000;
    const yearStart = new Date(now.getFullYear(), 0, 1).getTime() / 1000;

    const enriched = await Promise.all(allShops.map(async (shop) => {
      const [salesCount, usersCount, revenueToday, revenueMonth, revenueYear, catCount, itemCount] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(schema.sales).where(eq(schema.sales.shopId, shop.id)).get(),
        db.select({ count: sql<number>`count(*)` }).from(schema.users).where(eq(schema.users.shopId, shop.id)).get(),
        db.select({ revenue: sql<number>`sum(net_pay)` }).from(schema.sales).where(and(eq(schema.sales.shopId, shop.id), sql`status='completed' AND created_at >= ${todayStart}`)).get(),
        db.select({ revenue: sql<number>`sum(net_pay)` }).from(schema.sales).where(and(eq(schema.sales.shopId, shop.id), sql`status='completed' AND created_at >= ${monthStart}`)).get(),
        db.select({ revenue: sql<number>`sum(net_pay)` }).from(schema.sales).where(and(eq(schema.sales.shopId, shop.id), sql`status='completed' AND created_at >= ${yearStart}`)).get(),
        db.select({ count: sql<number>`count(*)` }).from(schema.categories).where(eq(schema.categories.shopId, shop.id)).get(),
        db.select({ count: sql<number>`count(*)` }).from(schema.items).where(eq(schema.items.shopId, shop.id)).get(),
      ]);
      const { adminPasswordHash: _ph, ...shopSafe } = shop as any;
      return {
        ...shopSafe,
        salesCount: salesCount?.count ?? 0,
        usersCount: usersCount?.count ?? 0,
        revenueToday: revenueToday?.revenue ?? 0,
        revenueMonth: revenueMonth?.revenue ?? 0,
        revenueYear: revenueYear?.revenue ?? 0,
        categoriesCount: catCount?.count ?? 0,
        itemsCount: itemCount?.count ?? 0,
      };
    }));

    return c.json({ shops: enriched }, 200);
  })

  .put("/admin/shops/:id", async (c) => {
    const auth = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!auth?.startsWith("admin_")) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json();
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.address !== undefined) updates.address = body.address;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.ownerName !== undefined) updates.ownerName = body.ownerName;
    if (body.ownerContact !== undefined) updates.ownerContact = body.ownerContact;
    const [shop] = await db.update(schema.shops).set(updates).where(eq(schema.shops.id, Number(c.req.param("id")))).returning();
    return c.json({ shop }, 200);
  })

  .put("/admin/shops/:id/suspend", async (c) => {
    const auth = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!auth?.startsWith("admin_")) return c.json({ error: "Unauthorized" }, 401);
    const { suspended } = await c.req.json();
    const [shop] = await db.update(schema.shops).set({ suspended } as any).where(eq(schema.shops.id, Number(c.req.param("id")))).returning();
    return c.json({ shop }, 200);
  })

  .put("/admin/shops/:id/password", async (c) => {
    const auth = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!auth?.startsWith("admin_")) return c.json({ error: "Unauthorized" }, 401);
    const { password } = await c.req.json();
    if (!password) return c.json({ error: "Password required" }, 400);
    // Update the admin user's password for this shop
    const shopId = Number(c.req.param("id"));
    const adminUser = await db.select().from(schema.users)
      .where(and(eq(schema.users.shopId, shopId), sql`role = 'admin'`))
      .get();
    if (adminUser) {
      await db.update(schema.users).set({ passwordHash: hashPassword(password) } as any).where(eq(schema.users.id, adminUser.id));
    }
    // also store hash on shop for reference
    await db.update(schema.shops).set({ adminPasswordHash: hashPassword(password) } as any).where(eq(schema.shops.id, shopId));
    return c.json({ ok: true }, 200);
  })

  .post("/admin/shops", async (c) => {
    const auth = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!auth?.startsWith("admin_")) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json();
    if (!body.shopId || !body.name) return c.json({ error: "shopId and name required" }, 400);
    const [shop] = await db.insert(schema.shops).values({
      shopId: body.shopId, name: body.name,
      address: body.address || null, phone: body.phone || null,
      ownerName: body.ownerName || null, ownerContact: body.ownerContact || null,
      adminPasswordHash: body.adminPassword ? hashPassword(body.adminPassword) : null,
    } as any).returning();
    // Always create the admin user for this shop
    const defaultPassword = body.adminPassword || "admin123";
    const adminUsername = body.shopId.toLowerCase();
    await db.insert(schema.users).values({
      shopId: shop.id, username: adminUsername,
      passwordHash: hashPassword(defaultPassword),
      fullName: body.ownerName || body.name, role: "admin",
    } as any);
    return c.json({ shop, adminUsername, defaultPassword: body.adminPassword ? undefined : "admin123" }, 201);
  })

  .get("/admin/users", async (c) => {
    const auth = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!auth?.startsWith("admin_")) return c.json({ error: "Unauthorized" }, 401);

    const shopId = c.req.query("shopId");
    const allUsers = shopId
      ? await db.select().from(schema.users).where(eq(schema.users.shopId, Number(shopId))).orderBy(desc(schema.users.createdAt))
      : await db.select().from(schema.users).orderBy(desc(schema.users.createdAt));

    // enrich with shop name
    const enriched = await Promise.all(allUsers.map(async (u) => {
      const shop = await db.select({ name: schema.shops.name, shopId: schema.shops.shopId })
        .from(schema.shops).where(eq(schema.shops.id, u.shopId)).get();
      return { ...u, shopName: shop?.name ?? "", shopCode: shop?.shopId ?? "" };
    }));

    return c.json({ users: enriched }, 200);
  })

  .post("/admin/users", async (c) => {
    const auth = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!auth?.startsWith("admin_")) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json();
    if (!body.shopId || !body.username || !body.password || !body.fullName)
      return c.json({ error: "shopId, username, password, fullName required" }, 400);
    const [user] = await db.insert(schema.users).values({
      shopId: body.shopId,
      username: body.username.toLowerCase().trim(),
      passwordHash: hashPassword(body.password),
      fullName: body.fullName,
      role: body.role ?? "cashier",
      phone: body.phone || null,
    } as any).returning();
    return c.json({ user }, 201);
  })

  .put("/admin/users/:id/suspend", async (c) => {
    const auth = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!auth?.startsWith("admin_")) return c.json({ error: "Unauthorized" }, 401);

    const { suspended } = await c.req.json();
    const [user] = await db
      .update(schema.users)
      .set({ suspended: suspended } as any)
      .where(eq(schema.users.id, Number(c.req.param("id"))))
      .returning();
    return c.json({ user }, 200);
  })
  
  .put("/admin/users/:id/reset-password", async (c) => {
    const auth = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!auth?.startsWith("admin_")) return c.json({ error: "Unauthorized" }, 401);
    const { password } = await c.req.json();
    if (!password) return c.json({ error: "password required" }, 400);
    const [user] = await db.update(schema.users)
      .set({ passwordHash: hashPassword(password) } as any)
      .where(eq(schema.users.id, Number(c.req.param("id"))))
      .returning();
    return c.json({ user }, 200);
  })

  // ── Admin: Per-shop transactions ──────────────────────────
  .get("/admin/shops/:id/transactions", async (c) => {
    const auth = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!auth?.startsWith("admin_")) return c.json({ error: "Unauthorized" }, 401);

    const shopId = Number(c.req.param("id"));
    const page = Number(c.req.query("page") ?? "1");
    const limit = 50;
    const offset = (page - 1) * limit;
    const from = c.req.query("from");
    const to = c.req.query("to");

    const conditions: any[] = [eq(schema.sales.shopId, shopId)];
    if (from) conditions.push(sql`created_at >= ${Math.floor(new Date(from).getTime() / 1000)}`);
    if (to) conditions.push(sql`created_at <= ${Math.floor(new Date(to).getTime() / 1000) + 86399}`);

    const salesRows = await db.select().from(schema.sales)
      .where(and(...conditions))
      .orderBy(desc(schema.sales.createdAt))
      .limit(limit).offset(offset);

    const total = await db.select({ count: sql<number>`count(*)` })
      .from(schema.sales).where(and(...conditions)).get();

    const withUser = await Promise.all(salesRows.map(async (s) => {
      const user = await db.select({ fullName: schema.users.fullName, username: schema.users.username })
        .from(schema.users).where(eq(schema.users.id, s.userId)).get();
      return { ...s, staffName: user?.fullName ?? "Unknown", staffUsername: user?.username ?? "" };
    }));

    return c.json({ sales: withUser, total: total?.count ?? 0, page, limit }, 200);
  })

  // ── Admin: Activity log ───────────────────────────────────
  .get("/admin/activity-log", async (c) => {
    const auth = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!auth?.startsWith("admin_")) return c.json({ error: "Unauthorized" }, 401);

    const shopId = c.req.query("shopId");
    const page = Number(c.req.query("page") ?? "1");
    const limit = 50;
    const offset = (page - 1) * limit;

    const conditions: any[] = shopId ? [eq(schema.activityLog.shopId, Number(shopId))] : [];

    const rows = conditions.length
      ? await db.select().from(schema.activityLog).where(and(...conditions))
          .orderBy(desc(schema.activityLog.createdAt)).limit(limit).offset(offset)
      : await db.select().from(schema.activityLog)
          .orderBy(desc(schema.activityLog.createdAt)).limit(limit).offset(offset);

    const total = conditions.length
      ? await db.select({ count: sql<number>`count(*)` }).from(schema.activityLog).where(and(...conditions)).get()
      : await db.select({ count: sql<number>`count(*)` }).from(schema.activityLog).get();

    const enriched = await Promise.all(rows.map(async (row) => {
      const user = await db.select({ fullName: schema.users.fullName, username: schema.users.username })
        .from(schema.users).where(eq(schema.users.id, row.userId)).get();
      const shop = await db.select({ name: schema.shops.name, shopId: schema.shops.shopId })
        .from(schema.shops).where(eq(schema.shops.id, row.shopId)).get();
      return {
        ...row,
        userName: user?.fullName ?? "Unknown",
        userUsername: user?.username ?? "",
        shopName: shop?.name ?? "",
        shopCode: shop?.shopId ?? "",
      };
    }));

    return c.json({ logs: enriched, total: total?.count ?? 0, page, limit }, 200);
  })

  // ── Admin: Announcements CRUD ─────────────────────────────
  .get("/admin/announcements", async (c) => {
    const auth = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!auth?.startsWith("admin_")) return c.json({ error: "Unauthorized" }, 401);

    const rows = await db.select().from(schema.announcements)
      .orderBy(desc(schema.announcements.createdAt));

    // Enrich with shop name if targeted
    const enriched = await Promise.all(rows.map(async (a) => {
      if (!a.targetShopId) return { ...a, shopName: "All Shops" };
      const shop = await db.select({ name: schema.shops.name }).from(schema.shops)
        .where(eq(schema.shops.id, a.targetShopId)).get();
      return { ...a, shopName: shop?.name ?? "Unknown Shop" };
    }));

    return c.json({ announcements: enriched }, 200);
  })

  .post("/admin/announcements", async (c) => {
    const auth = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!auth?.startsWith("admin_")) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    if (!body.title || !body.body) return c.json({ error: "title and body required" }, 400);

    const [ann] = await db.insert(schema.announcements).values({
      title: body.title,
      body: body.body,
      priority: body.priority ?? "normal",
      targetShopId: body.targetShopId ?? null,
      isActive: true,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    } as any).returning();

    return c.json({ announcement: ann }, 201);
  })

  .put("/admin/announcements/:id", async (c) => {
    const auth = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!auth?.startsWith("admin_")) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const updates: any = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.body !== undefined) updates.body = body.body;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.targetShopId !== undefined) updates.targetShopId = body.targetShopId;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.expiresAt !== undefined) updates.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    const [ann] = await db.update(schema.announcements).set(updates)
      .where(eq(schema.announcements.id, Number(c.req.param("id"))))
      .returning();
    return c.json({ announcement: ann }, 200);
  })

  .delete("/admin/announcements/:id", async (c) => {
    const auth = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!auth?.startsWith("admin_")) return c.json({ error: "Unauthorized" }, 401);

    await db.delete(schema.announcements)
      .where(eq(schema.announcements.id, Number(c.req.param("id"))));
    return c.json({ success: true }, 200);
  })

  // ── Shop-facing: Get active announcements for a shop ──────
  .get("/announcements", async (c) => {
    const shopId = Number(c.req.query("shopId"));
    if (!shopId) return c.json({ error: "shopId required" }, 400);

    const now = new Date();
    const rows = await db
      .select()
      .from(schema.announcements)
      .where(and(
        eq(schema.announcements.isActive, true),
        or(
          isNull(schema.announcements.targetShopId),
          eq(schema.announcements.targetShopId, shopId),
        ),
        or(
          isNull(schema.announcements.expiresAt),
          sql`${schema.announcements.expiresAt} > ${now}`,
        ),
      ))
      .orderBy(desc(schema.announcements.createdAt))
      .limit(10);
    return c.json({ announcements: rows }, 200);
  });

// Log activity helper — called from auth routes
async function logActivity(userId: number, shopId: number, action: string, details?: string, ip?: string) {
  try {
    await db.insert(schema.activityLog).values({ userId, shopId, action, details: details ?? null, ip: ip ?? null } as any);
  } catch (_) {}
}

export type AppType = typeof app;
export default app;
