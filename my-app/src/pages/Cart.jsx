import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { createOrder } from "../api/orders";

export default function Cart() {
  const { state, dispatch } = useContext(CartContext);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState(user?.address || "");
  const [customAddress, setCustomAddress] = useState(false);

  const totalOriginal = state.items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const totalFinal = state.items.reduce(
    (sum, item) => sum + item.finalPrice * item.quantity,
    0
  );

  const totalDiscount = totalOriginal - totalFinal;

  function handleOtherAddress() {
    setCustomAddress(true);
    setAddress("");
  }

  function handleUseMainAddress() {
    setCustomAddress(false);
    setAddress(user?.address || "");
  }

  async function handleCheckout() {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!address.trim()) {
      alert("Укажите адрес доставки");
      return;
    }
    setLoading(true);
    try {
      await createOrder(
        state.items.map((i) => ({
          service_id: i.service_id,
          quantity: i.quantity,
          price: i.finalPrice,
        })),
        totalFinal,
        address
      );
      dispatch({ type: "clear" });
      navigate("/profile");
    } catch (err) {
      alert("Ошибка оформления: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (state.items.length === 0) return <h2>Корзина пуста</h2>;

  return (
    <div>
      <h2>Корзина услуг</h2>

      <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
        <thead>
          <tr>
            <th>Фото</th>
            <th>Услуга</th>
            <th>Цена без скидки</th>
            <th>Цена со скидкой</th>
            <th>Кол-во</th>
            <th>Сумма</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {state.items.map((item, index) => (
            <tr key={index}>
              <td>
                <img src={item.image} alt={item.title}
                  style={{ width: "80px", height: "60px", objectFit: "cover" }} />
              </td>
              <td>{item.title}</td>
              <td>{item.discount > 0 ? <s>{item.price} ₽</s> : `${item.price} ₽`}</td>
              <td>
                {item.finalPrice} ₽
                {item.discount > 0 && (
                  <span style={{ color: "green", marginLeft: "6px" }}>(−{item.discount}%)</span>
                )}
              </td>
              <td>
                <button onClick={() => dispatch({ type: "dec", payload: index })}>−</button>
                <span style={{ margin: "0 8px" }}>{item.quantity}</span>
                <button onClick={() => dispatch({ type: "inc", payload: index })}>+</button>
              </td>
              <td>{item.finalPrice * item.quantity} ₽</td>
              <td>
                <button onClick={() => dispatch({ type: "remove", payload: index })}>Удалить</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ border: "1px solid #999", padding: "16px", maxWidth: "450px", marginBottom: "20px" }}>
        <h3>Адрес доставки</h3>

        {!customAddress ? (
          <>
            <p>
              Основной адрес: <b>{user?.address || "не указан"}</b>
            </p>
            <button onClick={handleOtherAddress}>Другой адрес</button>
          </>
        ) : (
          <>
            <input
              placeholder="Введите адрес"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{ width: "100%", padding: "6px", marginBottom: "8px" }}
            />
            {user?.address && (
              <button onClick={handleUseMainAddress}>
                Использовать основной адрес
              </button>
            )}
          </>
        )}
      </div>

      <div style={{ border: "1px solid #999", padding: "16px", maxWidth: "450px" }}>
        <h3>Чек</h3>
        <p>Сумма без скидки: <b>{totalOriginal} ₽</b></p>
        <p>Скидка: <b style={{ color: "green" }}>−{totalDiscount} ₽</b></p>
        <p>Итого к оплате: <b>{totalFinal} ₽</b></p>
        <button onClick={handleCheckout} disabled={loading}>
          {loading ? "Оформление..." : "Оформить заказ"}
        </button>
      </div>
    </div>
  );
}