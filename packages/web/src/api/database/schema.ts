import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Shops / branches
export const shops = sqliteTable("shops", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopId: text("shop_id").notNull().unique(), // login identifier
  name: text("name").notNull(),
  address: text("address"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Users / Staff
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopId: integer("shop_id").notNull(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("cashier"), // admin | cashier | salesperson
  address: text("address"),
  city: text("city"),
  phone: text("phone"),
  bank: text("bank"),
  branch: text("branch"),
  accountNumber: text("account_number"),
  salary: real("salary").default(0),
  salaryPeriod: text("salary_period").default("monthly"),
  commission: real("commission").default(0),
  photoUrl: text("photo_url"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Item price groups (multiple price tiers per item)
export const priceGroups = sqliteTable("price_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id").notNull(),
  label: text("label").notNull().default("Default"),
  price: real("price").notNull(),
});

// Item categories per shop
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopId: integer("shop_id").notNull(),
  name: text("name").notNull(),
});

// Items / Products
export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopId: integer("shop_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().default("General"),
  sku: text("sku"),
  barcode: text("barcode"),
  iconUrl: text("icon_url"),
  commission: real("commission").default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Sales (bills)
export const sales = sqliteTable("sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopId: integer("shop_id").notNull(),
  userId: integer("user_id").notNull(), // cashier
  billNumber: text("bill_number").notNull(),
  subtotal: real("subtotal").notNull().default(0),
  discount: real("discount").notNull().default(0),
  netPay: real("net_pay").notNull().default(0),
  paymentMethod: text("payment_method").notNull().default("cash"), // cash | credit
  status: text("status").notNull().default("completed"), // completed | held | cancelled
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Sale line items
export const saleItems = sqliteTable("sale_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saleId: integer("sale_id").notNull(),
  itemId: integer("item_id").notNull(),
  itemName: text("item_name").notNull(),
  qty: integer("qty").notNull().default(1),
  pricePerItem: real("price_per_item").notNull(),
  total: real("total").notNull(),
});

// Sessions (login tokens — simple JWT-less approach)
export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
