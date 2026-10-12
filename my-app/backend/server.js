const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on("connect", () => console.log("PostgreSQL подключён"));
pool.on("error", (err) => console.error("PostgreSQL ошибка:", err));

const BAD_WORDS = ["мат", "дурак", "идиот", "тупой", "хрен", "блин"];

const NAME_BLACKLIST = [
  "ааа", "ббб", "ввв", "ггг", "ддд", "еее", "жжж", "ззз", "иии", "ккк",
  "ллл", "ммм", "ннн", "ооо", "ппп", "ррр", "ссс", "ттт", "ууу", "ффф",
  "ххх", "ццц", "ччч", "шшш", "щщщ", "ъъъ", "ыыы", "ььь", "эээ", "ююю", "яяя",
  "test", "тест", "admin", "user", "qwerty", "asdf", "ййй",
];

function containsBadWords(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return BAD_WORDS.some((w) => lower.includes(w));
}

function validateFullName(name) {
  if (!name || typeof name !== "string") return false;

  const trimmed = name.trim();

  const re = /^[А-ЯЁ][а-яё]+(-[А-ЯЁ][а-яё]+)?\s+[А-ЯЁ][а-яё]+(-[А-ЯЁ][а-яё]+)?(\s+[А-ЯЁ][а-яё]+(-[А-ЯЁ][а-яё]+)?)?$/;
  if (!re.test(trimmed)) return false;

  const parts = trimmed.toLowerCase().split(/\s+/);

  for (const part of parts) {
    if (part.length < 2) return false;

    const uniqueLetters = new Set(part.replace(/-/g, "").split(""));
    if (uniqueLetters.size < 3) return false;

    if (NAME_BLACKLIST.includes(part)) return false;
  }

  return true;
}

function validatePhone(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return /^\+?\d{10,11}$/.test(cleaned);
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Нет токена" });
  try {
    const payload = jwt.verify(auth.replace("Bearer ", ""), process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Неверный токен" });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.roleId !== 2) {
    return res.status(403).json({ error: "Доступ запрещён" });
  }
  next();
}

app.get("/api/test", (req, res) => {
  res.json({ message: "API магазина зоотоваров работает!", timestamp: new Date() });
});

app.post("/api/auth/register", async (req, res) => {
  const { full_name, email, password, phone } = req.body;
  if (!full_name || !email || !password || !phone) {
    return res.status(400).json({ error: "Заполните обязательные поля" });
  }
  if (!validateFullName(full_name)) {
    return res.status(400).json({ error: "Введите настоящее ФИО (Иванов Иван Иванович)" });
  }
  if (!validatePhone(phone)) {
    return res.status(400).json({ error: "Телефон в формате +7XXXXXXXXXX" });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, phone)
       VALUES ($1,$2,$3,$4)
       RETURNING user_id, full_name, email, phone, role_id`,
      [full_name.trim(), email, hash, phone]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (!result.rows.length) return res.status(401).json({ error: "Пользователь не найден" });
    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Неверный пароль" });

    const token = jwt.sign(
      { userId: user.user_id, roleId: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role_id: user.role_id,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.address, u.role_id
       FROM users u
       WHERE u.user_id = $1`,
      [req.user.userId]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/auth/profile", authMiddleware, async (req, res) => {
  const { full_name, email, phone, address, password } = req.body;
  if (!validateFullName(full_name)) {
    return res.status(400).json({ error: "Введите настоящее ФИО" });
  }
  if (!validatePhone(phone)) {
    return res.status(400).json({ error: "Телефон в формате +7XXXXXXXXXX" });
  }
  try {
    let sql = "UPDATE users SET full_name=$1, email=$2, phone=$3, address=$4";
    const params = [full_name.trim(), email, phone, address];

    if (password && password.length >= 6) {
      const hash = await bcrypt.hash(password, 10);
      sql += `, password_hash=$5 WHERE user_id=$6`;
      params.push(hash, req.user.userId);
    } else {
      sql += ` WHERE user_id=$5`;
      params.push(req.user.userId);
    }

    sql += " RETURNING user_id, full_name, email, phone, address, role_id";
    const result = await pool.query(sql, params);
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const userResult = await pool.query("SELECT user_id FROM users WHERE email=$1", [email]);
    if (!userResult.rows.length) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    const userId = userResult.rows[0].user_id;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query("DELETE FROM password_resets WHERE user_id=$1", [userId]);
    await pool.query(
      "INSERT INTO password_resets (user_id, code, expires_at) VALUES ($1,$2,$3)",
      [userId, code, expires]
    );

    console.log(`Код для сброса пароля (${email}): ${code}`);

    res.json({ message: "Код отправлен на почту", debug_code: code });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { email, code, new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: "Пароль минимум 6 символов" });
  }
  try {
    const result = await pool.query(
      `SELECT pr.reset_id, pr.expires_at, u.user_id
       FROM password_resets pr
       JOIN users u ON pr.user_id = u.user_id
       WHERE u.email = $1 AND pr.code = $2
       ORDER BY pr.reset_id DESC LIMIT 1`,
      [email, code]
    );
    if (!result.rows.length) return res.status(400).json({ error: "Неверный код" });
    if (new Date(result.rows[0].expires_at) < new Date()) {
      return res.status(400).json({ error: "Код истёк" });
    }
    const userId = result.rows[0].user_id;
    const hash = await bcrypt.hash(new_password, 10);
    await pool.query("UPDATE users SET password_hash=$1 WHERE user_id=$2", [hash, userId]);
    await pool.query("DELETE FROM password_resets WHERE user_id=$1", [userId]);
    res.json({ message: "Пароль изменён" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const { search, category_id } = req.query;
    let sql = `
      SELECT p.product_id, p.title, p.description, p.price, p.discount, p.image, p.stock,
             COALESCE(c.category_id, 0) AS category_id,
             COALESCE(c.name, 'Без категории') AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (p.title ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
    }
    if (category_id === "0") {
      sql += ` AND p.category_id IS NULL`;
    } else if (category_id) {
      params.push(category_id);
      sql += ` AND p.category_id = $${params.length}`;
    }
    sql += " ORDER BY p.product_id";
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.product_id, p.title, p.description, p.price, p.discount, p.image, p.stock,
              COALESCE(c.category_id, 0) AS category_id,
              COALESCE(c.name, 'Без категории') AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.category_id
       WHERE p.product_id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Товар не найден" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/products", authMiddleware, adminMiddleware, async (req, res) => {
  const { title, description, price, discount, category_id, image, stock } = req.body;
  if (!price || Number(price) <= 0) {
    return res.status(400).json({ error: "Цена должна быть больше нуля" });
  }
  if (Number(discount) > 99) {
    return res.status(400).json({ error: "Скидка не больше 99%" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO products (title, description, price, discount, category_id, image, stock)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, description, price, discount || 0, category_id || null, image, stock || 100]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { title, description, price, discount, category_id, image, stock } = req.body;
  if (!price || Number(price) <= 0) {
    return res.status(400).json({ error: "Цена должна быть больше нуля" });
  }
  if (Number(discount) > 99) {
    return res.status(400).json({ error: "Скидка не больше 99%" });
  }
  try {
    const result = await pool.query(
      `UPDATE products
       SET title=$1, description=$2, price=$3, discount=$4, category_id=$5, image=$6, stock=$7
       WHERE product_id=$8 RETURNING *`,
      [title, description, price, discount, category_id || null, image, stock, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/products/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query("DELETE FROM products WHERE product_id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories ORDER BY category_id");
    const list = result.rows.filter((c) => c.name !== "Без категории");
    const hasNoCategory = result.rows.some((c) => c.name === "Без категории");

    if (hasNoCategory) {
      list.push({ category_id: 0, name: "Без категории" });
    }

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/categories", authMiddleware, adminMiddleware, async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ error: "Название не может быть пустым" });
  try {
    const exists = await pool.query("SELECT 1 FROM categories WHERE LOWER(name)=LOWER($1)", [name]);
    if (exists.rows.length) return res.status(400).json({ error: "Такая категория уже есть" });
    const result = await pool.query("INSERT INTO categories (name) VALUES ($1) RETURNING *", [name]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/categories/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ error: "Название не может быть пустым" });
  try {
    const exists = await pool.query(
      "SELECT 1 FROM categories WHERE LOWER(name)=LOWER($1) AND category_id != $2",
      [name, req.params.id]
    );
    if (exists.rows.length) return res.status(400).json({ error: "Такая категория уже есть" });
    const result = await pool.query(
      "UPDATE categories SET name=$1 WHERE category_id=$2 RETURNING *",
      [name, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/categories/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const neutral = await pool.query("SELECT category_id FROM categories WHERE name='Без категории'");
    const neutralId = neutral.rows[0]?.category_id;
    if (Number(req.params.id) === neutralId) {
      return res.status(400).json({ error: "Нельзя удалить нейтральную категорию" });
    }
    await pool.query("DELETE FROM categories WHERE category_id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/cart", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.cart_id, c.quantity,
              p.product_id, p.title, p.price, p.discount, p.image
       FROM carts c
       JOIN products p ON c.product_id = p.product_id
       WHERE c.user_id = $1
       ORDER BY c.cart_id`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cart", authMiddleware, async (req, res) => {
  const { product_id, quantity } = req.body;
  const qty = Number(quantity) || 1;
  if (qty > 10) {
    return res.status(400).json({ error: "Максимум 10 штук одного товара" });
  }
  try {
    const product = await pool.query("SELECT stock FROM products WHERE product_id=$1", [product_id]);
    if (!product.rows.length) return res.status(404).json({ error: "Товар не найден" });
    if (product.rows[0].stock < qty) {
      return res.status(400).json({ error: "Недостаточно товара на складе" });
    }

    const existing = await pool.query(
      "SELECT quantity FROM carts WHERE user_id=$1 AND product_id=$2",
      [req.user.userId, product_id]
    );
    const newQty = existing.rows.length ? existing.rows[0].quantity + qty : qty;
    if (newQty > 10) {
      return res.status(400).json({ error: "Максимум 10 штук одного товара" });
    }

    const result = await pool.query(
      `INSERT INTO carts (user_id, product_id, quantity)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = carts.quantity + EXCLUDED.quantity
       RETURNING *`,
      [req.user.userId, product_id, qty]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/cart/:id", authMiddleware, async (req, res) => {
  const { quantity } = req.body;
  if (Number(quantity) > 10) {
    return res.status(400).json({ error: "Максимум 10 штук" });
  }
  try {
    if (quantity < 1) {
      await pool.query("DELETE FROM carts WHERE cart_id=$1 AND user_id=$2", [req.params.id, req.user.userId]);
      return res.json({ ok: true });
    }
    const result = await pool.query(
      "UPDATE carts SET quantity=$1 WHERE cart_id=$2 AND user_id=$3 RETURNING *",
      [quantity, req.params.id, req.user.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/cart/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query("DELETE FROM carts WHERE cart_id=$1 AND user_id=$2", [req.params.id, req.user.userId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/delivery-slots", authMiddleware, async (req, res) => {
  try {
    const existing = await pool.query(
      `SELECT delivery_date, max_orders, current_orders,
              (max_orders - current_orders) AS available
       FROM delivery_slots
       WHERE delivery_date >= CURRENT_DATE
       ORDER BY delivery_date`
    );

    const map = {};
    for (const row of existing.rows) {
      const d = new Date(row.delivery_date).toISOString().split("T")[0];
      map[d] = { ...row, delivery_date: d };
    }

    const result = [];
    for (let i = 1; i <= 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      if (map[iso]) {
        result.push(map[iso]);
      } else {
        result.push({
          delivery_date: iso,
          max_orders: 10,
          current_orders: 0,
          available: 10,
        });
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders", authMiddleware, async (req, res) => {
  const { address, delivery_date } = req.body;
  if (!address || !delivery_date) {
    return res.status(400).json({ error: "Укажите адрес и дату доставки" });
  }
  const today = new Date().toISOString().split("T")[0];
  if (delivery_date < today) {
    return res.status(400).json({ error: "Дата доставки не может быть в прошлом" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const slot = await client.query(
      "SELECT * FROM delivery_slots WHERE delivery_date = $1 FOR UPDATE",
      [delivery_date]
    );
    if (slot.rows.length && slot.rows[0].current_orders >= slot.rows[0].max_orders) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "На эту дату больше нет свободных слотов" });
    }

    const cart = await client.query(
      `SELECT c.quantity, p.product_id, p.price, p.discount
       FROM carts c
       JOIN products p ON c.product_id = p.product_id
       WHERE c.user_id = $1`,
      [req.user.userId]
    );
    if (!cart.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Корзина пуста" });
    }

    const ordersCount = await client.query(
      "SELECT COUNT(*) FROM orders WHERE user_id=$1",
      [req.user.userId]
    );
    const isFirstOrder = Number(ordersCount.rows[0].count) === 0;

    const userRow = await client.query(
      `SELECT u.coupon_id, c.discount
       FROM users u
       LEFT JOIN coupons c ON u.coupon_id = c.coupon_id
       WHERE u.user_id = $1`,
      [req.user.userId]
    );
    const personalDiscount = isFirstOrder && userRow.rows[0]?.discount ? userRow.rows[0].discount : 0;

    let total = 0;
    const items = [];
    for (const row of cart.rows) {
      const price = Number(row.price);
      const discount = Math.max(row.discount || 0, personalDiscount);
      const final = discount > 0 ? price * (1 - discount / 100) : price;
      total += final * row.quantity;
      items.push({ product_id: row.product_id, quantity: row.quantity, price: final });
    }

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total, address, delivery_date, status)
       VALUES ($1,$2,$3,$4,'pending_payment') RETURNING order_id`,
      [req.user.userId, total, address, delivery_date]
    );
    const orderId = orderResult.rows[0].order_id;

    for (const it of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1,$2,$3,$4)`,
        [orderId, it.product_id, it.quantity, it.price]
      );
    }

    for (const row of cart.rows) {
      await client.query(
        "UPDATE products SET stock = stock - $1 WHERE product_id = $2",
        [row.quantity, row.product_id]
      );
    }

    await client.query("DELETE FROM carts WHERE user_id=$1", [req.user.userId]);

    if (slot.rows.length) {
      await client.query(
        "UPDATE delivery_slots SET current_orders = current_orders + 1 WHERE delivery_date = $1",
        [delivery_date]
      );
    } else {
      await client.query(
        "INSERT INTO delivery_slots (delivery_date, current_orders) VALUES ($1, 1)",
        [delivery_date]
      );
    }

    await client.query("COMMIT");
    res.json({ order_id: orderId, total });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get("/api/orders/my", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.order_id, o.total, o.address, o.delivery_date, o.status, o.created_at,
              (SELECT json_agg(json_build_object(
                'title', p.title,
                'quantity', oi.quantity,
                'price', oi.price
              ))
               FROM order_items oi
               JOIN products p ON oi.product_id = p.product_id
               WHERE oi.order_id = o.order_id) AS items
       FROM orders o
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/orders", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.order_id, o.total, o.address, o.delivery_date, o.status, o.created_at,
              u.full_name AS user_name, u.email AS user_email,
              (SELECT json_agg(json_build_object(
                'title', p.title,
                'quantity', oi.quantity,
                'price', oi.price
              ))
               FROM order_items oi
               JOIN products p ON oi.product_id = p.product_id
               WHERE oi.order_id = o.order_id) AS items
       FROM orders o
       JOIN users u ON o.user_id = u.user_id
       ORDER BY o.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/orders/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  const { status } = req.body;
  if (status === "pending_payment") {
    return res.status(400).json({ error: "Нельзя вернуть статус 'ожидает оплаты'" });
  }
  try {
    const current = await pool.query("SELECT status FROM orders WHERE order_id=$1", [req.params.id]);
    if (!current.rows.length) return res.status(404).json({ error: "Заказ не найден" });
    if (current.rows[0].status === "paid") {
      return res.status(400).json({ error: "Оплаченный заказ нельзя изменить" });
    }
    const result = await pool.query(
      "UPDATE orders SET status=$1 WHERE order_id=$2 RETURNING *",
      [status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/orders/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const current = await pool.query("SELECT status FROM orders WHERE order_id=$1", [req.params.id]);
    if (!current.rows.length) return res.status(404).json({ error: "Заказ не найден" });
    if (current.rows[0].status === "paid") {
      return res.status(400).json({ error: "Оплаченный заказ нельзя удалить" });
    }
    await pool.query("DELETE FROM orders WHERE order_id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/reviews", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT r.review_id, r.rating, r.comment, r.created_at, r.is_deleted_by_admin,
             u.full_name AS author, u.email AS author_email,
             p.title AS product_title, p.product_id
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      JOIN products p ON r.product_id = p.product_id
    `;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      sql += ` WHERE r.comment ILIKE $1 OR u.full_name ILIKE $1 OR p.title ILIKE $1`;
    }
    sql += " ORDER BY r.created_at DESC";
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/reviews/:productId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.review_id, r.rating, r.comment, r.created_at,
              u.full_name AS author, r.is_deleted_by_admin
       FROM reviews r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.productId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/reviews", authMiddleware, async (req, res) => {
  const { product_id, rating, comment } = req.body;
  if (!product_id || !rating) {
    return res.status(400).json({ error: "Укажите товар и оценку" });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Оценка от 1 до 5" });
  }
  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: "Комментарий не может быть пустым" });
  }
  if (containsBadWords(comment)) {
    return res.status(400).json({ error: "Отзыв содержит недопустимые слова" });
  }
  try {
    const existing = await pool.query(
      "SELECT 1 FROM reviews WHERE user_id=$1 AND product_id=$2",
      [req.user.userId, product_id]
    );
    if (existing.rows.length) {
      return res.status(400).json({ error: "Вы уже оставили отзыв на этот товар" });
    }
    const result = await pool.query(
      `INSERT INTO reviews (user_id, product_id, rating, comment)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.userId, product_id, rating, comment.trim()]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/reviews/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE reviews SET is_deleted_by_admin=TRUE, comment='Удалено администратором за нарушение политики' WHERE review_id=$1 RETURNING *",
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/coupons", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM coupons ORDER BY coupon_id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/coupons", authMiddleware, adminMiddleware, async (req, res) => {
  const { code, discount } = req.body;
  if (discount > 99) return res.status(400).json({ error: "Скидка не больше 99%" });
  try {
    const result = await pool.query(
      "INSERT INTO coupons (code, discount) VALUES ($1,$2) RETURNING *",
      [code, discount]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/coupons/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { code, discount, is_active } = req.body;
  if (discount > 99) return res.status(400).json({ error: "Скидка не больше 99%" });
  try {
    const result = await pool.query(
      "UPDATE coupons SET code=$1, discount=$2, is_active=$3 WHERE coupon_id=$4 RETURNING *",
      [code, discount, is_active, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/coupons/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query("DELETE FROM coupons WHERE coupon_id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT u.user_id, u.full_name, u.email, u.phone, u.role_id,
             c.code AS coupon_code, c.discount AS coupon_discount
      FROM users u
      LEFT JOIN coupons c ON u.coupon_id = c.coupon_id
    `;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      sql += ` WHERE u.email ILIKE $1 OR u.full_name ILIKE $1`;
    }
    sql += " ORDER BY u.user_id";
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id/coupon", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE users SET coupon_id=$1 WHERE user_id=$2 RETURNING user_id, email, coupon_id",
      [req.body.coupon_id, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер магазина зоотоваров запущен на http://localhost:${PORT}`);
});