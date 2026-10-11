import { Link } from "react-router-dom";

function ProductCard({ product, onAdd }) {
  const hasDiscount = product.discount > 0;
  const finalPrice = hasDiscount
    ? Math.round(product.price * (1 - product.discount / 100))
    : Number(product.price);

  return (
    <div style={{ padding: "12px", border: "1px solid #999", display: "flex", flexDirection: "column" }}>
      <Link to={`/product/${product.product_id}`}>
        <img
          src={product.image}
          alt={product.title}
          style={{ width: "100%", height: "140px", objectFit: "cover" }}
        />
      </Link>
      <h3 style={{ fontSize: "16px", margin: "8px 0" }}>
        <Link to={`/product/${product.product_id}`} style={{ color: "inherit" }}>
          {product.title}
        </Link>
      </h3>
      <p style={{ fontSize: "13px", flex: 1 }}>{product.description}</p>

      {hasDiscount ? (
        <p>
          <s>{product.price} ₽</s> <b>{finalPrice} ₽</b>{" "}
          <span style={{ color: "green" }}>-{product.discount}%</span>
        </p>
      ) : (
        <p>{product.price} ₽</p>
      )}

      <button onClick={() => onAdd(product)}>В корзину</button>
    </div>
  );
}

export default ProductCard;