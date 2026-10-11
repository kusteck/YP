import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { getProducts } from "../api/products";
import { getCategories } from "../api/categories";
import { addToCart } from "../api/cart";
import CategoryFilter from "../components/CategoryFilter";
import ProductCard from "../components/ProductCard";
import { useAuth } from "../context/AuthContext";

function Catalog() {
  const [selectedCats, setSelectedCats] = useState([]);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: products, loading: pL, error: pE } = useApi(getProducts);
  const { data: categories, loading: cL } = useApi(getCategories);
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleAdd(product) {
    if (!user) { navigate("/login"); return; }
    try {
      await addToCart(product.product_id, 1);
      setMsg(`"${product.title}" добавлен в корзину`);
      setTimeout(() => setMsg(""), 2000);
    } catch (err) {
      setMsg("Ошибка: " + err.message);
    }
  }

  if (pL || cL) return <p>Загрузка...</p>;
  if (pE) return (
    <div style={{ padding: "20px", border: "2px solid red", color: "red" }}>
      <h2>⚠ Технические работы</h2>
      <p>Сервер недоступен. Попробуйте позже.</p>
    </div>
  );

  const safeProducts = products || [];
  const safeCategories = categories || [];

  const filtered = safeProducts
    .filter((p) => (selectedCats.length ? selectedCats.includes(p.category_id) : true))
    .filter((p) =>
      search
        ? p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.description?.toLowerCase().includes(search.toLowerCase())
        : true
    );

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Магазин зоотоваров</h1>

      {msg && <p style={{ color: "green" }}>{msg}</p>}

      <div style={{ position: "relative", marginBottom: "16px" }}>
        <input
          placeholder="Поиск товаров..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onFocus={() => setShowSuggestions(true)}
          style={{ width: "100%", padding: "10px", fontSize: "15px" }}
        />
        {search && showSuggestions && filtered.length > 0 && (
          <div style={{
            position: "absolute",
            top: "100%", left: 0, right: 0,
            background: "#fff", border: "1px solid #999",
            maxHeight: "300px", overflowY: "auto", zIndex: 10,
          }}>
            {filtered.slice(0, 6).map((p) => (
              <Link
                key={p.product_id}
                to={`/product/${p.product_id}`}
                style={{
                  display: "flex", gap: "10px", alignItems: "center",
                  padding: "6px 10px", textDecoration: "none", color: "#000",
                  borderBottom: "1px solid #eee",
                }}
              >
                <img src={p.image} alt="" style={{ width: "40px", height: "40px", objectFit: "cover" }} />
                <span>{p.title}</span>
                <span style={{ marginLeft: "auto", fontWeight: "bold" }}>{p.price} ₽</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {search && filtered.length === 0 && (
        <p style={{ color: "#777" }}>Ничего не найдено</p>
      )}

      <div style={{ display: "flex", gap: "20px" }}>
        <CategoryFilter
          categories={safeCategories}
          selected={selectedCats}
          onChange={setSelectedCats}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "16px",
            }}
          >
            {filtered.map((p) => (
              <ProductCard key={p.product_id} product={p} onAdd={handleAdd} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Catalog;