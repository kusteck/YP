import { useState, useEffect } from "react";
import { useApi } from "../hooks/useApi";
import { getMyOrders } from "../api/orders";
import { updateProfile } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, refresh } = useAuth();
  const { data: orders, loading: oL, error: oE } = useApi(getMyOrders);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
  });
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        password: "",
      });
    }
  }, [user]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        address: form.address,
      };
      if (form.password) payload.password = form.password;
      await updateProfile(payload);
      await refresh();
      setForm({ ...form, password: "" });
      setMsg("Профиль обновлён");
    } catch (err) {
      setMsg("Ошибка: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return <p>Загрузка...</p>;

  return (
    <div>
      <h1>Личный кабинет</h1>

      <section style={{ marginBottom: "30px", maxWidth: "400px" }}>
        <h2>Личные данные</h2>
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: "8px" }}>
            <label>ФИО</label>
            <input value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              style={{ width: "100%", padding: "6px" }} />
          </div>
          <div style={{ marginBottom: "8px" }}>
            <label>Email</label>
            <input value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={{ width: "100%", padding: "6px" }} />
          </div>
          <div style={{ marginBottom: "8px" }}>
            <label>Телефон</label>
            <input value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              style={{ width: "100%", padding: "6px" }} />
          </div>
          <div style={{ marginBottom: "8px" }}>
            <label>Адрес по умолчанию</label>
            <input value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              style={{ width: "100%", padding: "6px" }} />
          </div>
          <div style={{ marginBottom: "8px" }}>
            <label>Новый пароль (пусто — не менять)</label>
            <input type="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{ width: "100%", padding: "6px" }} />
          </div>
          <button type="submit" disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
          {msg && <p style={{ color: "green" }}>{msg}</p>}
        </form>
      </section>

      <section>
        <h2>Мои заказы</h2>
        {oL ? (
          <p>Загрузка...</p>
        ) : oE ? (
          <p style={{ color: "red" }}>Ошибка: {oE}</p>
        ) : orders.length === 0 ? (
          <p>Заказов нет</p>
        ) : (
          orders.map((o) => (
            <div key={o.order_id} style={{ border: "1px solid #999", padding: "12px", marginBottom: "12px" }}>
              <h3>Заказ №{o.order_id}</h3>
              <p>Дата оформления: {new Date(o.created_at).toLocaleDateString()}</p>
              <p>Адрес доставки: {o.address}</p>
              <p>Дата доставки: {new Date(o.delivery_date).toLocaleDateString()}</p>
              <p>Статус: {o.status}</p>
              <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    <th>Товар</th><th>Кол-во</th><th>Цена</th><th>Сумма</th>
                  </tr>
                </thead>
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
              <p style={{ marginTop: "8px" }}>
                Итого: <b>{o.total} ₽</b>
              </p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}