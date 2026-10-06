import { apiRequest } from "./client";

export const getServices = (params = "") => apiRequest(`/services${params}`);
export const createService = (data) =>
  apiRequest("/services", { method: "POST", body: JSON.stringify(data) });
export const updateService = (id, data) =>
  apiRequest(`/services/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteService = (id) =>
  apiRequest(`/services/${id}`, { method: "DELETE" });