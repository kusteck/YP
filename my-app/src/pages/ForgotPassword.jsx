import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword, resetPassword } from "../api/auth";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleRequest(e) {
    e.preventDefault();
    setErr(""); setMsg(""); setLoading(true);
    try {
      const r = await forgotPassword(email);
      setMsg(`Код отправлен. Демо-код: ${r.debug_code}`);
      setStep(2);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setErr(""); setMsg(""); setLoading(true);
    try {
      await resetPassword(email, code, newPassword);
      setMsg("Пароль изменён. Перенаправляем на вход...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "350px" }}>
      <h2>Сброс пароля</h2>
      {msg && <p style={{ color: "green" }}>{msg}</p>}
      {err && <p style={{ color: "red" }}>{err}</p>}

      {step === 1 && (
        <form onSubmit={handleRequest}>
          <input type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required
            style={{ width: "100%", padding: "6px", marginBottom: "10px" }} />
          <button type="submit" disabled={loading}>{loading ? "Отправка..." : "Отправить код"}</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleReset}>
          <input placeholder="Код из письма" value={code}
            onChange={(e) => setCode(e.target.value)} required
            style={{ width: "100%", padding: "6px", marginBottom: "10px" }} />
          <input type="password" placeholder="Новый пароль" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)} required
            style={{ width: "100%", padding: "6px", marginBottom: "10px" }} />
          <button type="submit" disabled={loading}>{loading ? "Меняем..." : "Сменить пароль"}</button>
        </form>
      )}

      <p style={{ marginTop: "10px" }}>
        <Link to="/login">Вернуться ко входу</Link>
      </p>
    </div>
  );
}