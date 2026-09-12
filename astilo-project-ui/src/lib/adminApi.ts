import { apiClient } from "./apiClient";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  createdAt: string | null;
}

export interface AdminProduct {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: string | null;
  stock: number;
}

export interface AdminOrder {
  id: number;
  status: string;
  total: number;
  createdAt: string | null;
  userId: number;
  userEmail: string | null;
  items: { id: number; productId: number; productName: string | null; quantity: number; unitPrice: number }[];
}

// --- users ---

export const fetchUsers = () => apiClient.get<AdminUser[]>("/users").then((r) => r.data);

export const updateUserRole = (id: number, role: "user" | "admin") =>
  apiClient.put<AdminUser>(`/users/${id}`, { role }).then((r) => r.data);

export const deleteUser = (id: number) => apiClient.delete(`/users/${id}`).then((r) => r.data);

// --- products (our own catalogue, separate from the public Platzi-backed store) ---

export interface ProductInput {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category?: string;
  stock?: number;
}

export const fetchAdminProducts = () => apiClient.get<AdminProduct[]>("/store/products").then((r) => r.data);

export const createProduct = (input: ProductInput) =>
  apiClient.post<AdminProduct>("/store/products", input).then((r) => r.data);

export const updateProduct = (id: number, input: Partial<ProductInput>) =>
  apiClient.put<AdminProduct>(`/store/products/${id}`, input).then((r) => r.data);

export const deleteProduct = (id: number) => apiClient.delete(`/store/products/${id}`).then((r) => r.data);

// --- orders (all users, admin view) ---

export const fetchAllOrders = () =>
  apiClient.get<AdminOrder[]>("/store/orders", { params: { show_all: 1 } }).then((r) => r.data);
