import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCart, updateCartItem, removeCartItem } from "../api/cart";
import { createOrder } from "../api/orders";
import { getDeliverySlots } from "../api/slots";
import { useAuth } from "../context/AuthContext";

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [address, setAddress] = useState(user?.address || "");
  const [customAddress, setCustomAddress] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [cartData, slotsData] = await Promise.all([getCart(), getDeliverySlots()]);
      setItems(cartData);
      setSlots(slotsData);
    } catch (e) {
      setError("Сервер недоступен. Ведутся технические работы.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const safeItems = items || [];
  const totalOriginal = safeItems.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  const totalFinal = safeItems.reduce((s, i) => {
    const p = Number(i.price);
    const f = i.discount > 0 ? p * (1 - i.discount / 100) : p;
    return s + f * i.quantity;
  }, 0);
  const totalDiscount = totalOriginal - totalFinal;
  const today = new Date().toISOString().split("T")[0];

  async function handleInc(item) {
    if (item.quantity >= 10) { alert("Максимум 10 штук"); return; }
    try { await updateCartItem(item.cart_id, item.quantity + 1); loadAll(); }
    catch (e) { setMsg("Ошибка: " + e.message); }
  }

  async function handleDec(item) {
    try { await updateCartItem(item.cart_id, item.quantity - 1); loadAll(); }
    catch (e) { setMsg("Ошибка: " + e.message); }
  }

  async function handleRemove(item) {
    if (!confirm(`Удалить "${item.title}"?`)) return;
    try { await removeCartItem(item.cart_id); loadAll(); }
    catch (e) { setMsg("Ошибка: " + e.message); }
  }

  async function handleCheckout() {
    if (!address.trim()) { alert("Укажите адрес"); return; }
    if (!deliveryDate) { alert("Укажите дату доставки"); return; }
    if (deliveryDate < today) { alert("Дата в прошлом"); return; }
    setSubmitting(true);
    try {
      await createOrder(address, deliveryDate);
      navigate("/profile");
    } catch (e) {
      alert("Ошибка оформления: " + e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Загрузка корзины...</p>;
  if (error) return (
    <div style={{ padding: "20px", border: "2px solid red", color: "red" }}>
      <h2>⚠ Технические работы</h2>
      <p>{error}</p>
      <button onClick={loadAll}>Повторить</button>
    </div>
  );
  if (safeItems.length === 0) return <h2>Корзина пуста</h2>;

  return (
    <div>
      <h2>Корзина</h2>
      {msg && <p style={{ color: "green" }}>{msg}</p>}

      <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
        <thead>
          <tr>
            <th>Фото</th><th>Товар</th><th>Цена без скидки</th>
            <th>Цена со скидкой</th><th>Кол-во</th><th>Сумма</th><th></th>
          </tr>
        </thead>
        <tbody>
          {safeItems.map((item) => {
            const price = Number(item.price);
            const final = item.discount > 0 ? price * (1 - item.discount / 100) : price;
            return (
              <tr key={item.cart_id}>
                <td><img src={item.image} alt="" style={{ width: "80px", height: "60px", objectFit: "cover" }} /></td>
                <td>{item.title}</td>
                <td>{item.discount > 0 ? <s>{price} ₽</s> : `${price} ₽`}</td>
                <td>{Math.round(final)} ₽ {item.discount > 0 && <span style={{ color: "green" }}>(−{item.discount}%)</span>}</td>
                <td>
                  <button onClick={() => handleDec(item)}>−</button>
                  <span style={{ margin: "0 8px" }}>{item.quantity}</span>
                  <button onClick={() => handleInc(item)} disabled={item.quantity >= 10}>+</button>
                </td>
                <td>{Math.round(final * item.quantity)} ₽</td>
                <td><button onClick={() => handleRemove(item)}>Удалить</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ border: "1px solid #999", padding: "16px", maxWidth: "500px", marginBottom: "20px" }}>
        <h3>Оформление заказа</h3>

        <div style={{ marginBottom: "10px" }}>
          <b>Адрес доставки</b>
          {!customAddress ? (
            <>
              <p>Основной: <b>{user?.address || "не указан"}</b></p>
              <button onClick={() => { setCustomAddress(true); setAddress(""); }}>Другой адрес</button>
            </>
          ) : (
            <>
              <input value={address} onChange={(e) => setAddress(e.target.value)}
                placeholder="Введите адрес" style={{ width: "100%", padding: "6px", marginBottom: "8px" }} />
              {user?.address && (
                <button onClick={() => { setCustomAddress(false); setAddress(user.address); }}>
                  Основной адрес
                </button>
              )}
            </>
          )}
        </div>

        <div style={{ marginBottom: "10px" }}>
          <b>Дата доставки</b>
          <select value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)}
            style={{ display: "block", padding: "6px", marginTop: "4px" }}>
            <option value="">— выберите дату —</option>
            {slots.map((s) => {
              const d = new Date(s.delivery_date).toISOString().split("T")[0];
              return (
                <option key={d} value={d} disabled={s.available <= 0}>
                  {d} (свободно: {s.available})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div style={{ border: "1px solid #999", padding: "16px", maxWidth: "500px" }}>
        <h3>Чек</h3>
        <p>Сумма без скидки: <b>{Math.round(totalOriginal)} ₽</b></p>
        <p>Скидка: <b style={{ color: "green" }}>−{Math.round(totalDiscount)} ₽</b></p>
        <p>Итого: <b>{Math.round(totalFinal)} ₽</b></p>
        <button onClick={handleCheckout} disabled={submitting}>
          {submitting ? "Оформление..." : "Оформить заказ"}
        </button>
      </div>
    </div>
  );
}