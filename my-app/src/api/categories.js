import { apiRequest } from "./client";

export const getCategories = () => apiRequest("/categories");
export const createCategory = (name) =>
  apiRequest("/categories", { method: "POST", body: JSON.stringify({ name }) });
export const updateCategory = (id, name) =>
  apiRequest(`/categories/${id}`, { method: "PUT", body: JSON.stringify({ name }) });
export const deleteCategory = (id) =>
  apiRequest(`/categories/${id}`, { method: "DELETE" });