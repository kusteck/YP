import { NavLink, Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

function Menu() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const isAdmin = user?.role_id === 2;

  const linkStyle = (isActive) => ({
    color: isActive ? "red" : theme === "dark" ? "#fff" : "#000",
    fontWeight: isActive ? "bold" : "normal",
    marginRight: "10px",
  });

  const plainStyle = {
    color: theme === "dark" ? "#fff" : "#000",
    marginRight: "10px",
  };

  const buttonStyle = {
    marginRight: "10px",
    padding: "4px 10px",
    cursor: "pointer",
    borderRadius: "4px",
    border: theme === "dark" ? "1px solid #888" : "1px solid #999",
    backgroundColor: theme === "dark" ? "#444" : "#efefef",
    color: theme === "dark" ? "#fff" : "#000",
  };

  return (
    <nav style={{ marginBottom: "20px", paddingBottom: "10px", borderBottom: "1px solid #999" }}>
      <NavLink to="/" end style={({ isActive }) => linkStyle(isActive)}>
        Каталог
      </NavLink>

      {!isAdmin && (
        <>
          <Link to="/cart" style={plainStyle}>Корзина</Link>
          <Link to="/profile" style={plainStyle}>Профиль</Link>
        </>
      )}

      {isAdmin && <Link to="/admin" style={plainStyle}>Админ-панель</Link>}

      {!user && (
        <>
          <Link to="/login" style={plainStyle}>Войти</Link>
          <Link to="/register" style={plainStyle}>Регистрация</Link>
        </>
      )}

      {user && (
        <button onClick={logout} style={buttonStyle}>
          Выйти ({user.full_name || user.email})
        </button>
      )}

      <button onClick={toggleTheme} style={buttonStyle}>
        Тема ({theme})
      </button>
    </nav>
  );
}

export default Menu;