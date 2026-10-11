import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function validate() {
    const e = {};
    if (!email.trim()) e.email = "Введите email";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Некорректный email";
    if (!password) e.password = "Введите пароль";
    else if (password.length < 6) e.password = "Минимум 6 символов";
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "300px" }}>
      <h2>Вход</h2>
      <div style={{ marginBottom: "10px" }}>
        <input type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "6px" }} />
        {errors.email && <p style={{ color: "red", margin: "4px 0" }}>{errors.email}</p>}
      </div>
      <div style={{ marginBottom: "10px" }}>
        <input type="password" placeholder="Пароль" value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "6px" }} />
        {errors.password && <p style={{ color: "red", margin: "4px 0" }}>{errors.password}</p>}
      </div>
      {errors.form && <p style={{ color: "red" }}>{errors.form}</p>}
      <button type="submit" disabled={loading}>{loading ? "Вход..." : "Войти"}</button>
      <p style={{ marginTop: "10px" }}><Link to="/forgot-password">Забыли пароль?</Link></p>
      <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
    </form>
  );
}