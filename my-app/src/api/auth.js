import { apiRequest } from "./client";

export const login = (email, password) =>
  apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const register = (email, password, name, address) =>
  apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name, address }),
  });

export const getMe = () => apiRequest("/auth/me");

export const updateProfile = (data) =>
  apiRequest("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });