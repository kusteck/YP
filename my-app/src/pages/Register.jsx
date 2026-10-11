import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { register as registerApi } from "../api/auth";

export default function Register() {
  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function validate() {
    const e = {};
    const nameRe = /^[А-ЯЁA-Z][а-яёa-z\-]+(\s+[А-ЯЁA-Z][а-яёa-z\-]+){1,2}$/;
    if (!full_name.trim()) e.full_name = "Введите ФИО";
    else if (!nameRe.test(full_name.trim())) e.full_name = "Формат: Иванов Иван Иванович";

    if (!email.trim()) e.email = "Введите email";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Некорректный email";

    if (!phone.trim()) e.phone = "Введите телефон";
    else if (!/^\+?\d{10,11}$/.test(phone.replace(/[\s\-()]/g, "")))
      e.phone = "Формат: +7XXXXXXXXXX";

    if (!password) e.password = "Введите пароль";
    else if (password.length < 6) e.password = "Минимум 6 символов";
    if (password !== confirm) e.confirm = "Пароли не совпадают";
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await registerApi(full_name, email, password, phone);
      await login(email, password);
      navigate("/");
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setLoading(false);
    }
  }

  const labelStyle = { display: "block", fontSize: "12px", marginBottom: "2px" };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "320px" }}>
      <h2>Регистрация</h2>

      <div style={{ marginBottom: "10px" }}>
        <label style={labelStyle}>ФИО</label>
        <input placeholder="Иванов Иван Иванович" value={full_name}
          onChange={(e) => setFullName(e.target.value)}
          style={{ width: "100%", padding: "6px" }} />
        {errors.full_name && <p style={{ color: "red", margin: "4px 0" }}>{errors.full_name}</p>}
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label style={labelStyle}>Email</label>
        <input type="email" placeholder="example@mail.ru" value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "6px" }} />
        {errors.email && <p style={{ color: "red", margin: "4px 0" }}>{errors.email}</p>}
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label style={labelStyle}>Телефон</label>
        <input placeholder="+7XXXXXXXXXX" value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ width: "100%", padding: "6px" }} />
        {errors.phone && <p style={{ color: "red", margin: "4px 0" }}>{errors.phone}</p>}
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label style={labelStyle}>Пароль</label>
        <input type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "6px" }} />
        {errors.password && <p style={{ color: "red", margin: "4px 0" }}>{errors.password}</p>}
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label style={labelStyle}>Повторите пароль</label>
        <input type="password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          style={{ width: "100%", padding: "6px" }} />
        {errors.confirm && <p style={{ color: "red", margin: "4px 0" }}>{errors.confirm}</p>}
      </div>

      {errors.form && <p style={{ color: "red" }}>{errors.form}</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Регистрация..." : "Зарегистрироваться"}
      </button>
      <p style={{ marginTop: "10px" }}>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
    </form>
  );
}