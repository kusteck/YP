import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { CartProvider } from "./context/CartContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Menu from "./components/Menu";
import Catalog from "./pages/Catalog";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";

function ProtectedRoute({ children, adminOnly, userOnly }) {
  const { user, loading } = useAuth();
  if (loading) return <p>Загрузка...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role_id !== 2) return <Navigate to="/" replace />;
  if (userOnly && user.role_id === 2) return <Navigate to="/admin" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Catalog />} />
      <Route path="/cart" element={
        <ProtectedRoute userOnly><Cart /></ProtectedRoute>
      } />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/profile" element={
        <ProtectedRoute userOnly><Profile /></ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute adminOnly><Admin /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Menu />
            <AppRoutes />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;