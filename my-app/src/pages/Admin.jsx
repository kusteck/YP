import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { getServices, createService, updateService, deleteService } from "../api/services";
import { getCategories, createCategory, updateCategory, deleteCategory } from "../api/categories";
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from "../api/coupons";
import { getUsers, setUserCoupon } from "../api/users";

const emptyService = {
  title: "",
  description: "",
  duration: 60,
  price: 0,
  discount: 0,
  category_id: "",
  image: "",
};

export default function Admin() {
  const [tab, setTab] = useState("services");
  const [msg, setMsg] = useState("");

  return (
    <div>
      <h1>Админ-панель магазина техники</h1>
      <div style={{ marginBottom: "16px" }}>
        <button onClick={() => setTab("services")}>Услуги</button>
        <button onClick={() => setTab("categories")}>Категории</button>
        <button onClick={() => setTab("coupons")}>Скидки</button>
        <button onClick={() => setTab("users")}>Пользователи</button>
      </div>
      {msg && <p style={{ color: "green" }}>{msg}</p>}
      {tab === "services" && <ServicesTab setMsg={setMsg} />}
      {tab === "categories" && <CategoriesTab setMsg={setMsg} />}
      {tab === "coupons" && <CouponsTab setMsg={setMsg} />}
      {tab === "users" && <UsersTab setMsg={setMsg} />}
    </div>
  );
}

function ServicesTab({ setMsg }) {
  const { data: services, loading: sL, error: sE } = useApi(getServices);
  const { data: categories, loading: cL } = useApi(getCategories);
  const [form, setForm] = useState(emptyService);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");

  if (sL || cL) return <p>Загрузка...</p>;
  if (sE) return <p style={{ color: "red" }}>Ошибка: {sE}</p>;

  const safeServices = services || [];
  const safeCategories = categories || [];

  function startEdit(s) {
    setEditId(s.service_id);
    setForm({
      title: s.title,
      description: s.description || "",
      duration: s.duration,
      price: s.price,
      discount: s.discount,
      category_id: s.category_id,
      image: s.image || "",
    });
  }

  function reset() {
    setEditId(null);
    setForm(emptyService);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editId) await updateService(editId, form);
      else await createService(form);
      setMsg(editId ? "Услуга обновлена" : "Услуга добавлена");
      reset();
    } catch (err) {
      setMsg("Ошибка: " + err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Удалить услугу?")) return;
    try {
      await deleteService(id);
      setMsg("Услуга удалена");
    } catch (err) {
      setMsg("Ошибка: " + err.message);
    }
  }

  const filtered = safeServices.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  const labelStyle = {
    display: "block",
    fontSize: "12px",
    fontWeight: "bold",
    marginBottom: "2px",
  };

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
        <h3>{editId ? "Редактировать услугу" : "Новая услуга"}</h3>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-end" }}>
          <div>
            <label style={labelStyle}>Название</label>
            <input
              placeholder="Например: Ремонт ноутбука"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label style={labelStyle}>Описание</label>
            <input
              placeholder="Краткое описание услуги"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <label style={labelStyle}>Длительность (мин)</label>
            <input
              type="number"
              placeholder="60"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: +e.target.value })}
            />
          </div>

          <div>
            <label style={labelStyle}>Цена (₽)</label>
            <input
              type="number"
              placeholder="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: +e.target.value })}
            />
          </div>

          <div>
            <label style={labelStyle}>Скидка (%)</label>
            <input
              type="number"
              placeholder="0"
              max="99"
              value={form.discount}
              onChange={(e) => setForm({ ...form, discount: +e.target.value })}
            />
          </div>

          <div>
            <label style={labelStyle}>Категория</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: +e.target.value })}
            >
              <option value="">— выберите —</option>
              {safeCategories.map((c) => (
                <option key={c.category_id} value={c.category_id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>URL картинки</label>
            <input
              placeholder="https://..."
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
            />
          </div>

          <div>
            <button type="submit">{editId ? "Сохранить" : "Добавить"}</button>
            {editId && (
              <button type="button" onClick={reset} style={{ marginLeft: "6px" }}>
                Отмена
              </button>
            )}
          </div>
        </div>
      </form>

      <input
        placeholder="Поиск по названию"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: "10px", padding: "6px", width: "300px" }}
      />

      {filtered.length === 0 ? (
        <p style={{ color: "#777" }}>Услуги не найдены</p>
      ) : (
        <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ID</th><th>Название</th><th>Цена</th><th>Скидка</th><th>Категория</th><th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.service_id}>
                <td>{s.service_id}</td>
                <td>{s.title}</td>
                <td>{s.price} ₽</td>
                <td>{s.discount}%</td>
                <td>{s.category_name}</td>
                <td>
                  <button onClick={() => startEdit(s)}>Ред.</button>
                  <button onClick={() => handleDelete(s.service_id)}>Удал.</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CategoriesTab({ setMsg }) {
  const { data: categories, loading, error } = useApi(getCategories);
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
    } catch (err) {
      setMsg("Ошибка: " + err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Удалить категорию?")) return;
    try {
      await deleteCategory(id);
      setMsg("Категория удалена");
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

      <input placeholder="Поиск" value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: "10px", padding: "6px" }} />

      {filtered.length === 0 ? (
        <p style={{ color: "#777" }}>Категории не найдены</p>
      ) : (
        <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th>ID</th><th>Название</th><th>Действия</th></tr></thead>
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

function CouponsTab({ setMsg }) {
  const { data: coupons, loading, error } = useApi(getCoupons);
  const { data: users } = useApi(getUsers);
  const [form, setForm] = useState({ code: "", discount: 0, user_id: "" });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: "red" }}>Ошибка: {error}</p>;

  const safeCoupons = coupons || [];
  const safeUsers = users || [];

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.discount > 99) {
      setMsg("Скидка не может быть больше 99%");
      return;
    }
    try {
      if (editId) {
        await updateCoupon(editId, { ...form, is_active: true });
        setMsg("Скидка обновлена");
      } else {
        await createCoupon({ ...form, user_id: form.user_id || null });
        setMsg("Скидка создана");
      }
      setForm({ code: "", discount: 0, user_id: "" });
      setEditId(null);
    } catch (err) {
      setMsg("Ошибка: " + err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Удалить скидку?")) return;
    try {
      await deleteCoupon(id);
      setMsg("Скидка удалена");
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
        <input placeholder="Название" value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <input type="number" placeholder="Скидка %" value={form.discount} max="99"
          onChange={(e) => setForm({ ...form, discount: +e.target.value })} />
        <select value={form.user_id}
          onChange={(e) => setForm({ ...form, user_id: e.target.value })}>
          <option value="">Без привязки</option>
          {safeUsers.map((u) => (
            <option key={u.user_id} value={u.user_id}>{u.email}</option>
          ))}
        </select>
        <button type="submit">{editId ? "Сохранить" : "Создать"}</button>
        {editId && <button type="button" onClick={() => { setEditId(null); setForm({ code: "", discount: 0, user_id: "" }); }}>Отмена</button>}
      </form>

      <input placeholder="Поиск по названию" value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: "10px", padding: "6px" }} />

      {filtered.length === 0 ? (
        <p style={{ color: "#777" }}>Скидки не найдены</p>
      ) : (
        <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ID</th><th>Название</th><th>Скидка %</th><th>Пользователь</th><th>Активна</th><th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.coupon_id}>
                <td>{c.coupon_id}</td>
                <td>{c.code}</td>
                <td>{c.discount}%</td>
                <td>{c.user_email || "—"}</td>
                <td>{c.is_active ? "да" : "нет"}</td>
                <td>
                  <button onClick={() => { setEditId(c.coupon_id); setForm({ code: c.code, discount: c.discount, user_id: c.user_id || "" }); }}>Ред.</button>
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

function UsersTab({ setMsg }) {
  const [search, setSearch] = useState("");
  const { data: users, loading, error } = useApi(() => getUsers(search), [search]);
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
      <input placeholder="Поиск по email или имени" value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: "10px", padding: "6px", width: "300px" }} />

      {safeUsers.length === 0 ? (
        <p style={{ color: "#777" }}>Пользователи не найдены</p>
      ) : (
        <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th>ID</th><th>Email</th><th>Имя</th><th>Роль</th><th>Скидка</th></tr></thead>
          <tbody>
            {safeUsers.map((u) => (
              <tr key={u.user_id}>
                <td>{u.user_id}</td>
                <td>{u.email}</td>
                <td>{u.name}</td>
                <td>{u.role_id === 2 ? "админ" : "пользователь"}</td>
                <td>
                  <select
                    value={u.coupon_id || ""}
                    onChange={(e) => handleCoupon(u.user_id, e.target.value)}
                  >
                    <option value="">— нет —</option>
                    {safeCoupons.map((c) => (
                      <option key={c.coupon_id} value={c.coupon_id}>
                        {c.code} (−{c.discount}%)
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}