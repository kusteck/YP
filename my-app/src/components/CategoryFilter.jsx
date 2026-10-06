function CategoryFilter({ categories, selected, onChange }) {
  function toggle(id) {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id]
    );
  }

  return (
    <aside style={{ width: "220px", padding: "10px", border: "1px solid #999", height: "fit-content" }}>
      <h3>Категории</h3>
      {categories.map((c) => (
        <label key={c.category_id} style={{ display: "block", marginBottom: "6px" }}>
          <input
            type="checkbox"
            checked={selected.includes(c.category_id)}
            onChange={() => toggle(c.category_id)}
          />{" "}
          {c.name}
        </label>
      ))}
    </aside>
  );
}

export default CategoryFilter;