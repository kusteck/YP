import { useState, useContext } from "react";
import { useApi } from "../hooks/useApi";
import { getServices } from "../api/services";
import { getCategories } from "../api/categories";
import CategoryFilter from "../components/CategoryFilter";
import ServiceCard from "../components/ServiceCard";
import { CartContext } from "../context/CartContext";

function Catalog() {
  const [selectedCats, setSelectedCats] = useState([]);
  const [search, setSearch] = useState("");

  const { data: services, loading: sL, error: sE } = useApi(getServices);
  const { data: categories, loading: cL } = useApi(getCategories);

  const { dispatch } = useContext(CartContext);

  if (sL || cL) return <p>Загрузка услуг...</p>;
  if (sE) return <p style={{ color: "red" }}>Ошибка: {sE}</p>;

  const filtered = services
    .filter((s) => (selectedCats.length ? selectedCats.includes(s.category_id) : true))
    .filter((s) =>
      search
        ? s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.description?.toLowerCase().includes(search.toLowerCase())
        : true
    );

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Магазин техники — услуги ремонта</h1>
      <div style={{ display: "flex", gap: "20px" }}>
        <CategoryFilter
          categories={categories}
          selected={selectedCats}
          onChange={setSelectedCats}
        />
        <div style={{ flex: 1 }}>
          <input
            placeholder="Поиск по названию или описанию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "8px", marginBottom: "16px" }}
          />

          {filtered.length === 0 ? (
            <div style={{ padding: "20px", color: "#777" }}>
              <p>Ничего не найдено. Попробуйте изменить поиск или сбросить фильтры.</p>
              <button onClick={() => { setSearch(""); setSelectedCats([]); }}>
                Сбросить фильтры
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "16px",
              }}
            >
              {filtered.map((s) => (
                <ServiceCard
                  key={s.service_id}
                  service={s}
                  onAdd={(item) => dispatch({ type: "add", payload: item })}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Catalog;