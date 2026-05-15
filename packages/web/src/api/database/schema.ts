import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Shops / branches
export const shops = sqliteTable("shops", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopId: text("shop_id").notNull().unique(), // login identifier
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  ownerName: text("owner_name"),
  ownerContact: text("owner_contact"),
  adminPasswordHash: text("admin_password_hash"),
  suspended: integer("suspended", { mode: "boolean" }).notNull().default(false),
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
  suspended: integer("suspended", { mode: "boolean" }).notNull().default(false),
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
  billType: text("bill_type").notNull().default("normal"), // normal | quick
  subtotal: real("subtotal").notNull().default(0),
  discount: real("discount").notNull().default(0),
  netPay: real("net_pay").notNull().default(0),
  paymentMethod: text("payment_method").notNull().default("cash"), // cash | card | credit
  status: text("status").notNull().default("completed"), // completed | held | cancelled
  // Credit sale fields
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  promisedDate: text("promised_date"),
  // Held bill label (optional)
  heldLabel: text("held_label"),
  // Salesperson who made the sale (separate from userId = cashier/logged-in user)
  soldBy: integer("sold_by"),
  // Credit collection tracking
  collectedAmount: real("collected_amount").notNull().default(0),
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

// Shop settings (printer config, receipt preferences)
export const shopSettings = sqliteTable("shop_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopId: integer("shop_id").notNull().unique(),
  // Printer settings
  printerEnabled: integer("printer_enabled", { mode: "boolean" }).default(false),
  printerType: text("printer_type").default("bluetooth"), // bluetooth | wifi | usb
  printerName: text("printer_name"),
  printerAddress: text("printer_address"), // BT MAC address
  wifiHost: text("wifi_host"), // Network printer IP
  wifiPort: text("wifi_port").default("9100"), // Network printer port
  paperWidth: text("paper_width").default("80mm"), // 58mm | 80mm
  // Receipt settings
  receiptHeader: text("receipt_header").default("Thank you for shopping!"),
  receiptFooter: text("receipt_footer").default("Visit us again"),
  showLogo: integer("show_logo", { mode: "boolean" }).default(false),
  // WhatsApp settings
  whatsappPhone: text("whatsapp_phone"),
  whatsappEnabled: integer("whatsapp_enabled", { mode: "boolean" }).default(false),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
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

// Activity log — login/logout events per user
export const activityLog = sqliteTable("activity_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  shopId: integer("shop_id").notNull(),
  action: text("action").notNull(), // login | logout | failed_login
  details: text("details"),
  ip: text("ip"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Announcements from admin to shops
export const announcements = sqliteTable("announcements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  priority: text("priority").notNull().default("normal"), // normal | important | urgent
  targetShopId: integer("target_shop_id"), // null = all shops
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
});

// Credit collection payments (partial/full payments on credit bills)
export const creditCollections = sqliteTable("credit_collections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopId: integer("shop_id").notNull(),
  saleId: integer("sale_id").notNull(),
  amount: real("amount").notNull(),
  note: text("note"),
  collectedBy: integer("collected_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
