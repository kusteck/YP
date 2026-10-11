import { apiRequest } from "./client";

export const login = (email, password) =>
  apiRequest("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const register = (full_name, email, password, phone) =>
  apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ full_name, email, password, phone }),
  });

export const getMe = () => apiRequest("/auth/me");

export const updateProfile = (data) =>
  apiRequest("/auth/profile", { method: "PUT", body: JSON.stringify(data) });

export const forgotPassword = (email) =>
  apiRequest("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });

export const resetPassword = (email, code, new_password) =>
  apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, code, new_password }),
  });