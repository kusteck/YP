import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { getProduct } from "../api/products";
import { getReviews, createReview } from "../api/reviews";
import { addToCart } from "../api/cart";
import { useAuth } from "../context/AuthContext";

function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: product, loading: pL, error: pE } = useApi(() => getProduct(id), [id]);
  const { data: reviews, loading: rL, error: rE } = useApi(() => getReviews(id), [id]);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function handleAdd() {
    if (!user) { navigate("/login"); return; }
    try {
      await addToCart(product.product_id, 1);
      setMsg("Товар добавлен в корзину");
    } catch (e) { setMsg("Ошибка: " + e.message); }
  }

  async function handleReviewSubmit(e) {
    e.preventDefault();
    setMsg(""); setErr("");
    if (!comment.trim()) { setErr("Комментарий обязателен"); return; }
    try {
      await createReview({ product_id: Number(id), rating: Number(rating), comment: comment.trim() });
      window.location.reload();
    } catch (e) { setErr(e.message); }
  }

  if (pL) return <p>Загрузка...</p>;
  if (pE) return <p style={{ color: "red" }}>Ошибка: {pE}</p>;
  if (!product) return <p>Товар не найден</p>;

  const hasDiscount = product.discount > 0;
  const finalPrice = hasDiscount
    ? Math.round(product.price * (1 - product.discount / 100))
    : Number(product.price);

  const alreadyReviewed = user && (reviews || []).some(
    (r) => r.author === user.full_name && !r.is_deleted_by_admin
  );

  return (
    <div>
      <div style={{ display: "flex", gap: "30px", marginBottom: "30px" }}>
        <img src={product.image} alt={product.title}
          style={{ width: "400px", height: "300px", objectFit: "cover", border: "1px solid #999" }} />
        <div>
          <h1>{product.title}</h1>
          <p><b>Категория:</b> {product.category_name}</p>
          <p>{product.description}</p>
          <p>
            {hasDiscount ? (
              <><s>{product.price} ₽</s> <b>{finalPrice} ₽</b>{" "}
                <span style={{ color: "green" }}>-{product.discount}%</span></>
            ) : (<b>{product.price} ₽</b>)}
          </p>
          <button onClick={handleAdd}>В корзину</button>
          {msg && <p style={{ color: "green" }}>{msg}</p>}
        </div>
      </div>

      <h2>Отзывы</h2>

      {user ? (
        alreadyReviewed ? (
          <p style={{ color: "#777" }}>Вы уже оставили отзыв на этот товар.</p>
        ) : (
          <form onSubmit={handleReviewSubmit} style={{ marginBottom: "20px", border: "1px solid #999", padding: "12px" }}>
            <h3>Оставить отзыв</h3>
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value="5">5 ★</option><option value="4">4 ★</option>
              <option value="3">3 ★</option><option value="2">2 ★</option><option value="1">1 ★</option>
            </select>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="Комментарий" style={{ width: "100%", padding: "6px", minHeight: "60px", marginTop: "8px" }} />
            {err && <p style={{ color: "red" }}>{err}</p>}
            <button type="submit">Отправить</button>
          </form>
        )
      ) : (
        <p>Только авторизованные могут оставлять отзывы.</p>
      )}

      {rL ? <p>Загрузка отзывов...</p> : rE ? <p style={{ color: "red" }}>{rE}</p> :
        ((reviews || []).length === 0 ? <p>Отзывов пока нет</p> :
          (reviews || []).map((r) => (
            <div key={r.review_id} style={{ border: "1px solid #999", padding: "10px", marginBottom: "8px" }}>
              <p><b>{r.author}</b> — {r.rating} ★ <small>({new Date(r.created_at).toLocaleDateString()})</small></p>
              <p>{r.comment}</p>
            </div>
          ))
        )
      }
    </div>
  );
}

export default ProductPage;