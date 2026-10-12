import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../api/products";
import { getCategories, createCategory, updateCategory, deleteCategory } from "../api/categories";
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from "../api/coupons";
import { getUsers, setUserCoupon } from "../api/users";
import { getAllOrders, updateOrderStatus, deleteOrder } from "../api/orders";
import { getAllReviews, deleteReview } from "../api/reviews";
import { getStatusLabel, getStatusColor } from "../utils/statuses";

const emptyProduct = {
  title: "", description: "", price: 0, discount: 0,
  category_id: "", image: "", stock: 100,
};

export default function Admin() {
  const [tab, setTab] = useState("products");
  const [msg, setMsg] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div>
      <h1>Админ-панель</h1>
      <div style={{ marginBottom: "16px" }}>
        <button onClick={() => setTab("products")}>Товары</button>
        <button onClick={() => setTab("categories")}>Категории</button>
        <button onClick={() => setTab("coupons")}>Скидки</button>
        <button onClick={() => setTab("orders")}>Заказы</button>
        <button onClick={() => setTab("reviews")}>Отзывы</button>
        <button onClick={() => setTab("users")}>Пользователи</button>
      </div>
      {msg && <p style={{ color: "green" }}>{msg}</p>}
      {tab === "products" && <ProductsTab setMsg={setMsg} refreshKey={refreshKey} onRefresh={refresh} />}
      {tab === "categories" && <CategoriesTab setMsg={setMsg} refreshKey={refreshKey} onRefresh={refresh} />}
      {tab === "coupons" && <CouponsTab setMsg={setMsg} refreshKey={refreshKey} onRefresh={refresh} />}
      {tab === "orders" && <OrdersTab setMsg={setMsg} refreshKey={refreshKey} onRefresh={refresh} />}
      {tab === "reviews" && <ReviewsTab setMsg={setMsg} refreshKey={refreshKey} onRefresh={refresh} />}
      {tab === "users" && <UsersTab setMsg={setMsg} refreshKey={refreshKey} onRefresh={refresh} />}
    </div>
  );
}

function ProductsTab({ setMsg, refreshKey, onRefresh }) {
  const { data: products, loading: pL, error: pE } = useApi(getProducts, [refreshKey]);
  const { data: categories, loading: cL } = useApi(getCategories);
  const [form, setForm] = useState(emptyProduct);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");

  if (pL || cL) return <p>Загрузка...</p>;
  if (pE) return <p style={{ color: "red" }}>Ошибка: {pE}</p>;

  const safeProducts = products || [];
  const safeCategories = categories || [];
  const labelStyle = { display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "2px" };

  function startEdit(p) {
    setEditId(p.product_id);
    setForm({
      title: p.title, description: p.description || "",
      price: p.price, discount: p.discount,
      category_id: p.category_id || "", image: p.image || "", stock: p.stock,
    });
  }

  function reset() {
    setEditId(null);
    setForm(emptyProduct);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (Number(form.price) <= 0) {
      setMsg("Цена должна быть больше 0");
      return;
    }
    try {
      if (editId) await updateProduct(editId, form);
      else await createProduct(form);
      setMsg(editId ? "Товар обновлён" : "Товар добавлен");
      reset();
      onRefresh();
    } catch (err) {
      setMsg("Ошибка: " + err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Удалить товар?")) return;
    try {
      await deleteProduct(id);
      setMsg("Товар удалён");
      onRefresh();
    } catch (err) {
      setMsg("Ошибка: " + err.message);
    }
  }

  const filtered = safeProducts.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
        <h3>{editId ? "Редактировать товар" : "Новый товар"}</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-end" }}>
          <div>
            <label style={labelStyle}>Название</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Описание</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Цена (₽)</label>
            <input type="number" min="1" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Скидка (%)</label>
            <input type="number" min="0" max="99" value={form.discount} onChange={(e) => setForm({ ...form, discount: +e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Категория</label>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: +e.target.value })}>
              <option value="">без категории</option>
              {safeCategories.map((c) => (
                <option key={c.category_id} value={c.category_id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>URL картинки</label>
            <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Остаток</label>
            <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: +e.target.value })} />
          </div>
          <div>
            <button type="submit">{editId ? "Сохранить" : "Добавить"}</button>
            {editId && <button type="button" onClick={reset} style={{ marginLeft: "6px" }}>Отмена</button>}
          </div>
        </div>
      </form>

      <input placeholder="Поиск" value={search} onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: "10px", padding: "6px", width: "300px" }} />

      {filtered.length === 0 ? (
        <p style={{ color: "#777" }}>Товары не найдены</p>
      ) : (
        <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr><th>ID</th><th>Название</th><th>Цена</th><th>Скидка</th><th>Категория</th><th>Остаток</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.product_id}>
                <td>{p.product_id}</td>
                <td>{p.title}</td>
                <td>{p.price} ₽</td>
                <td>{p.discount}%</td>
                <td>{p.category_name}</td>
                <td>{p.stock}</td>
                <td>
                  <button onClick={() => startEdit(p)}>Ред.</button>
                  <button onClick={() => handleDelete(p.product_id)}>Удал.</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CategoriesTab({ setMsg, refreshKey, onRefresh }) {
  const { data: categories, loading, error } = useApi(getCategories, [refreshKey]);
  const [name, setName] = useState("");
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: "red" }}>Ошибка: {error}</p>;

  const safeCategories = categories || [];

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editId) await updateCategory(editId, name);
      else await createCategory(name);
      setMsg(editId ? "Категория обновлена" : "Категория добавлена");
      setName("");
      setEditId(null);
      onRefresh();
    } catch (err) {
      setMsg("Ошибка: " + err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Удалить категорию? Товары перейдут в 'Без категории'")) return;
    try {
      await deleteCategory(id);
      setMsg("Категория удалена");
      onRefresh();
    } catch (err) {
      setMsg("Ошибка: " + err.message);
    }
  }

  const filtered = safeCategories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
        <h3>{editId ? "Редактировать категорию" : "Новая категория"}</h3>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" />
        <button type="submit">{editId ? "Сохранить" : "Добавить"}</button>
        {editId && <button type="button" onClick={() => { setEditId(null); setName(""); }}>Отмена</button>}
      </form>

      <input placeholder="Поиск" value={search} onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: "10px", padding: "6px" }} />

      {filtered.length === 0 ? (
        <p style={{ color: "#777" }}>Категории не найдены</p>
      ) : (
        <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th>ID</th><th>Название</th><th></th></tr></thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.category_id}>
                <td>{c.category_id}</td>
                <td>{c.name}</td>
                <td>
                  <button onClick={() => { setEditId(c.category_id); setName(c.name); }}>Ред.</button>
                  <button onClick={() => handleDelete(c.category_id)}>Удал.</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CouponsTab({ setMsg, refreshKey, onRefresh }) {
  const { data: coupons, loading, error } = useApi(getCoupons, [refreshKey]);
  const [form, setForm] = useState({ code: "", discount: 0 });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: "red" }}>Ошибка: {error}</p>;

  const safeCoupons = coupons || [];

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.discount > 99) {
      setMsg("Скидка не больше 99%");
      return;
    }
    try {
      if (editId) await updateCoupon(editId, { ...form, is_active: true });
      else await createCoupon(form);
      setMsg("Скидка сохранена");
      setForm({ code: "", discount: 0 });
      setEditId(null);
      onRefresh();
    } catch (err) {
      setMsg("Ошибка: " + err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Удалить скидку?")) return;
    try {
      await deleteCoupon(id);
      setMsg("Скидка удалена");
      onRefresh();
    } catch (err) {
      setMsg("Ошибка: " + err.message);
    }
  }

  const filtered = safeCoupons.filter((c) =>
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
        <h3>{editId ? "Редактировать скидку" : "Новая скидка"}</h3>
        <input placeholder="Название" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <input type="number" max="99" placeholder="%" value={form.discount} onChange={(e) => setForm({ ...form, discount: +e.target.value })} />
        <button type="submit">{editId ? "Сохранить" : "Создать"}</button>
        {editId && <button type="button" onClick={() => { setEditId(null); setForm({ code: "", discount: 0 }); }}>Отмена</button>}
      </form>

      <input placeholder="Поиск" value={search} onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: "10px", padding: "6px" }} />

      {filtered.length === 0 ? (
        <p style={{ color: "#777" }}>Скидки не найдены</p>
      ) : (
        <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th>ID</th><th>Название</th><th>Скидка</th><th>Активна</th><th></th></tr></thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.coupon_id}>
                <td>{c.coupon_id}</td>
                <td>{c.code}</td>
                <td>{c.discount}%</td>
                <td>{c.is_active ? "да" : "нет"}</td>
                <td>
                  <button onClick={() => { setEditId(c.coupon_id); setForm({ code: c.code, discount: c.discount }); }}>Ред.</button>
                  <button onClick={() => handleDelete(c.coupon_id)}>Удал.</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function OrdersTab({ setMsg, refreshKey, onRefresh }) {
  const { data: orders, loading, error } = useApi(getAllOrders, [refreshKey]);

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: "red" }}>Ошибка: {error}</p>;

  const safeOrders = orders || [];

  async function handleStatus(id, currentStatus, newStatus) {
    if (currentStatus === "paid") {
      setMsg("Оплаченный заказ нельзя изменить");
      return;
    }
    if (newStatus === "pending_payment") {
      setMsg("Нельзя вернуть статус 'ожидает оплаты'");
      return;
    }
    try {
      await updateOrderStatus(id, newStatus);
      setMsg("Статус обновлён");
      onRefresh();
    } catch (err) {
      setMsg("Ошибка: " + err.message);
    }
  }

  async function handleDelete(id, status) {
    if (status === "paid") {
      setMsg("Оплаченный заказ нельзя удалить");
      return;
    }
    if (!confirm("Удалить заказ?")) return;
    try {
      await deleteOrder(id);
      setMsg("Заказ удалён");
      onRefresh();
    } catch (err) {
      setMsg("Ошибка: " + err.message);
    }
  }

  if (safeOrders.length === 0) return <p>Заказов нет</p>;

  return (
    <div>
      {safeOrders.map((o) => (
        <div key={o.order_id} style={{ border: "1px solid #999", padding: "12px", marginBottom: "12px" }}>
          <h3>Заказ №{o.order_id}</h3>
          <p>Пользователь: {o.user_name} ({o.user_email})</p>
          <p>Адрес: {o.address}</p>
          <p>Дата доставки: {new Date(o.delivery_date).toLocaleDateString()}</p>
          <p>Дата оформления: {new Date(o.created_at).toLocaleDateString()}</p>
          <p>
            Текущий статус:{" "}
            <b style={{ color: getStatusColor(o.status) }}>
              {getStatusLabel(o.status)}
            </b>
          </p>
          <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr><th>Товар</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead>
            <tbody>
              {o.items?.map((it, i) => (
                <tr key={i}>
                  <td>{it.title}</td>
                  <td>{it.quantity}</td>
                  <td>{it.price} ₽</td>
                  <td>{it.price * it.quantity} ₽</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: "8px" }}>Итого: <b>{o.total} ₽</b></p>

          <div style={{ marginTop: "8px" }}>
            <label>Изменить статус: </label>
            <select value={o.status} onChange={(e) => handleStatus(o.order_id, o.status, e.target.value)}
              disabled={o.status === "paid"}>
              <option value="pending_payment">Ожидает оплаты</option>
              <option value="paid">Оплачен</option>
              <option value="cancelled">Отменён</option>
            </select>
            <button onClick={() => handleDelete(o.order_id, o.status)} style={{ marginLeft: "10px" }}
              disabled={o.status === "paid"}>Удалить</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewsTab({ setMsg, refreshKey, onRefresh }) {
  const [search, setSearch] = useState("");
  const { data: reviews, loading, error } = useApi(() => getAllReviews(search), [search, refreshKey]);

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: "red" }}>Ошибка: {error}</p>;

  const safeReviews = reviews || [];

  async function handleDelete(id) {
    if (!confirm("Удалить отзыв? Пользователи увидят пометку 'Удалено администратором'")) return;
    try {
      await deleteReview(id);
      setMsg("Отзыв удалён");
      onRefresh();
    } catch (err) {
      setMsg("Ошибка: " + err.message);
    }
  }

  return (
    <div>
      <input
        placeholder="Поиск по тексту, автору или товару"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: "10px", padding: "6px", width: "400px" }}
      />

      {safeReviews.length === 0 ? (
        <p style={{ color: "#777" }}>Отзывы не найдены</p>
      ) : (
        <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Товар</th>
              <th>Автор</th>
              <th>Оценка</th>
              <th>Комментарий</th>
              <th>Дата</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {safeReviews.map((r) => (
              <tr key={r.review_id}>
                <td>{r.review_id}</td>
                <td>{r.product_title}</td>
                <td>{r.author}<br /><small>{r.author_email}</small></td>
                <td>{r.rating} ★</td>
                <td style={{ maxWidth: "300px" }}>{r.comment}</td>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
                <td>
                  {r.is_deleted_by_admin ? (
                    <span style={{ color: "red" }}>удалён</span>
                  ) : (
                    <span style={{ color: "green" }}>активен</span>
                  )}
                </td>
                <td>
                  {!r.is_deleted_by_admin && (
                    <button onClick={() => handleDelete(r.review_id)}>Удалить</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function UsersTab({ setMsg, refreshKey }) {
  const [search, setSearch] = useState("");
  const { data: users, loading, error } = useApi(() => getUsers(search), [search, refreshKey]);
  const { data: coupons } = useApi(getCoupons);

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: "red" }}>Ошибка: {error}</p>;

  const safeUsers = users || [];
  const safeCoupons = coupons || [];

  async function handleCoupon(userId, couponId) {
    try {
      await setUserCoupon(userId, couponId || null);
      setMsg("Скидка пользователя обновлена");
    } catch (err) {
      setMsg("Ошибка: " + err.message);
    }
  }

  return (
    <div>
      <input placeholder="Поиск по email или ФИО" value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: "10px", padding: "6px", width: "300px" }} />

      {safeUsers.length === 0 ? (
        <p style={{ color: "#777" }}>Пользователи не найдены</p>
      ) : (
        <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr><th>ID</th><th>ФИО</th><th>Email</th><th>Телефон</th><th>Роль</th><th>Скидка</th></tr>
          </thead>
          <tbody>
            {safeUsers.map((u) => (
              <tr key={u.user_id}>
                <td>{u.user_id}</td>
                <td>{u.full_name}</td>
                <td>{u.email}</td>
                <td>{u.phone || "—"}</td>
                <td>{u.role_id === 2 ? "админ" : "пользователь"}</td>
                <td>
                  {u.role_id === 2 ? "—" : (
                    <select
                      value={u.coupon_code
                        ? safeCoupons.find((c) => c.code === u.coupon_code)?.coupon_id || ""
                        : ""}
                      onChange={(e) => handleCoupon(u.user_id, e.target.value)}>
                      <option value="">нет</option>
                      {safeCoupons.map((c) => (
                        <option key={c.coupon_id} value={c.coupon_id}>
                          {c.code} (−{c.discount}%)
                        </option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}