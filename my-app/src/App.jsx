import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { CartProvider } from "./context/CartContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useBackendStatus } from "./hooks/useBackendStatus";
import Maintenance from "./components/Maintenance";
import Menu from "./components/Menu";
import Catalog from "./pages/Catalog";
import ProductPage from "./pages/ProductPage";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";

function AccessDenied() {
  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1 style={{ color: "red" }}>Доступ запрещён</h1>
      <p>У вас нет прав для просмотра этой страницы.</p>
      <Link to="/">На главную</Link>
    </div>
  );
}

function ProtectedRoute({ children, adminOnly, userOnly }) {
  const { user, loading } = useAuth();
  if (loading) return <p>Загрузка...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role_id !== 2) return <AccessDenied />;
  if (userOnly && user.role_id === 2) return <AccessDenied />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Catalog />} />
      <Route path="/product/:id" element={<ProductPage />} />
      <Route path="/cart" element={<ProtectedRoute userOnly><Cart /></ProtectedRoute>} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/profile" element={<ProtectedRoute userOnly><Profile /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const { available, checking } = useBackendStatus();

  const appStyles = {
    backgroundColor: theme === "dark" ? "#222" : "#fff",
    color: theme === "dark" ? "#eee" : "#000",
    minHeight: "100vh",
    padding: "20px",
  };

  return (
    <div style={appStyles}>
      <BrowserRouter>
        <Menu />
        {checking ? (
          <p style={{ textAlign: "center", color: "#888" }}>Проверка соединения...</p>
        ) : available === false ? (
          <Maintenance />
        ) : (
          <AppRoutes />
        )}
      </BrowserRouter>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;