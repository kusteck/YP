function ServiceCard({ service, onAdd }) {
  const hasDiscount = service.discount > 0;
  const finalPrice = hasDiscount
    ? Math.round(service.price * (1 - service.discount / 100))
    : Number(service.price);

  return (
    <div style={{ padding: "12px", border: "1px solid #999", display: "flex", flexDirection: "column" }}>
      <img
        src={service.image}
        alt={service.title}
        style={{ width: "100%", height: "140px", objectFit: "cover" }}
      />
      <h3 style={{ fontSize: "16px", margin: "8px 0" }}>{service.title}</h3>
      <p style={{ fontSize: "13px", flex: 1 }}>{service.description}</p>
      <p style={{ fontSize: "13px" }}>Длительность: {service.duration} мин</p>
      {hasDiscount ? (
        <p>
          <s>{service.price} ₽</s> <b>{finalPrice} ₽</b>{" "}
          <span style={{ color: "green" }}>-{service.discount}%</span>
        </p>
      ) : (
        <p>{service.price} ₽</p>
      )}
      <button onClick={() => onAdd({ ...service, finalPrice })}>В корзину</button>
    </div>
  );
}

export default ServiceCard;