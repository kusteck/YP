function Maintenance() {
  return (
    <div
      style={{
        padding: "60px 20px",
        textAlign: "center",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "64px", margin: "0 0 10px" }}>⚠</h1>
      <h2 style={{ margin: "0 0 16px" }}>Ведутся технические работы</h2>
      <p style={{ color: "#888", marginBottom: "30px" }}>
        Сервер временно недоступен. Пожалуйста, попробуйте позже.
      </p>
    </div>
  );
}

export default Maintenance;