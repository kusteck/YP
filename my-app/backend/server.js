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
    return res.status(403).json({ error: "Только для админа" });
  }
  next();
}

app.get("/api/test", (req, res) => {
  res.json({ message: "API магазина техники работает!", timestamp: new Date() });
});

app.post("/api/auth/register", async (req, res) => {
  const { email, password, name, address } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name, address) VALUES ($1,$2,$3,$4) RETURNING user_id, email, name, role_id, address",
      [email, hash, name, address || null]
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
        email: user.email,
        name: user.name,
        role_id: user.role_id,
        address: user.address,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.email, u.name, u.role_id, u.coupon_id, u.address,
              c.code AS coupon_code, c.discount AS coupon_discount
       FROM users u
       LEFT JOIN coupons c ON u.coupon_id = c.coupon_id
       WHERE u.user_id = $1`,
      [req.user.userId]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/auth/profile", authMiddleware, async (req, res) => {
  const { email, password, name, address } = req.body;
  try {
    let sql = "UPDATE users SET email=$1, name=$2, address=$3";
    const params = [email, name, address];

    if (password && password.length >= 6) {
      const hash = await bcrypt.hash(password, 10);
      sql += `, password_hash=$4 WHERE user_id=$5`;
      params.push(hash, req.user.userId);
    } else {
      sql += ` WHERE user_id=$4`;
      params.push(req.user.userId);
    }

    sql += " RETURNING user_id, email, name, address, role_id";
    const result = await pool.query(sql, params);
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/services", async (req, res) => {
  try {
    const { search, category_id } = req.query;
    let sql = `
      SELECT s.*, c.name AS category_name
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.category_id
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (s.title ILIKE $${params.length} OR s.description ILIKE $${params.length})`;
    }
    if (category_id) {
      params.push(category_id);
      sql += ` AND s.category_id = $${params.length}`;
    }
    sql += " ORDER BY s.service_id";
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/services", authMiddleware, adminMiddleware, async (req, res) => {
  const { title, description, duration, price, category_id, discount, image } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO services (title, description, duration, price, category_id, discount, image)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, description, duration, price, category_id, discount || 0, image]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/services/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { title, description, duration, price, category_id, discount, image } = req.body;
  try {
    const result = await pool.query(
      `UPDATE services
       SET title=$1, description=$2, duration=$3, price=$4, category_id=$5, discount=$6, image=$7
       WHERE service_id=$8 RETURNING *`,
      [title, description, duration, price, category_id, discount, image, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/services/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query("DELETE FROM services WHERE service_id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories ORDER BY category_id");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/categories", authMiddleware, adminMiddleware, async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ error: "Название не может быть пустым" });
  try {
    const exists = await pool.query(
      "SELECT 1 FROM categories WHERE LOWER(name) = LOWER($1)",
      [name]
    );
    if (exists.rows.length) {
      return res.status(400).json({ error: "Категория с таким названием уже существует" });
    }
    const result = await pool.query(
      "INSERT INTO categories (name) VALUES ($1) RETURNING *",
      [name]
    );
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
      "SELECT 1 FROM categories WHERE LOWER(name) = LOWER($1) AND category_id != $2",
      [name, req.params.id]
    );
    if (exists.rows.length) {
      return res.status(400).json({ error: "Категория с таким названием уже существует" });
    }
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
    await pool.query("DELETE FROM categories WHERE category_id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/coupons", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.email AS user_email
       FROM coupons c
       LEFT JOIN users u ON c.user_id = u.user_id
       ORDER BY c.coupon_id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/coupons", authMiddleware, adminMiddleware, async (req, res) => {
  const { code, discount, user_id } = req.body;
  if (discount > 99) return res.status(400).json({ error: "Скидка не может быть больше 99%" });
  try {
    const result = await pool.query(
      "INSERT INTO coupons (code, discount, user_id) VALUES ($1,$2,$3) RETURNING *",
      [code, discount, user_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/coupons/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { code, discount, is_active } = req.body;
  if (discount > 99) return res.status(400).json({ error: "Скидка не может быть больше 99%" });
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
      SELECT u.user_id, u.email, u.name, u.role_id, u.coupon_id, c.code AS coupon_code
      FROM users u
      LEFT JOIN coupons c ON u.coupon_id = c.coupon_id
    `;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      sql += ` WHERE u.email ILIKE $1 OR u.name ILIKE $1`;
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

app.post("/api/orders", authMiddleware, async (req, res) => {
  const { items, total, address } = req.body;
  if (!address || !address.trim()) {
    return res.status(400).json({ error: "Укажите адрес доставки" });
  }
  try {
    const orderResult = await pool.query(
      "INSERT INTO orders (user_id, total, address) VALUES ($1,$2,$3) RETURNING order_id",
      [req.user.userId, total, address]
    );
    const orderId = orderResult.rows[0].order_id;
    for (const item of items) {
      await pool.query(
        "INSERT INTO order_items (order_id, service_id, quantity, price) VALUES ($1,$2,$3,$4)",
        [orderId, item.service_id, item.quantity, item.price]
      );
    }
    res.json({ order_id: orderId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/orders/my", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*,
              (SELECT json_agg(json_build_object(
                'title', s.title,
                'quantity', oi.quantity,
                'price', oi.price,
                'original_price', s.price
              ))
               FROM order_items oi
               JOIN services s ON oi.service_id = s.service_id
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

app.listen(PORT, () => {
  console.log(`Сервер магазина техники запущен на http://localhost:${PORT}`);
});