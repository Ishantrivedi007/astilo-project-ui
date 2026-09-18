import axios from "axios";
import { apiClient } from "./apiClient";

/** Friendly, status-based messages — CherryPy's default error pages aren't JSON. */
export const storeErrorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    switch (err.response?.status) {
      case 409:
        return "Not enough stock for one of these items.";
      case 402:
        return "Payment declined — please try again.";
      case 400:
        return "Please check the details you entered.";
      case 403:
        return "You don't have permission to do that.";
      case 404:
        return "Couldn't find that order or product.";
      case undefined:
        return "Can't reach the server. Is the backend running?";
    }
  }
  return fallback;
};

export interface SpecItem {
  label: string;
  value: string;
}

export interface SpecGroup {
  group: string;
  items: SpecItem[];
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: string | null;
  stock: number;
  specs?: SpecGroup[] | null;
}

export const fetchProducts = (category?: string) =>
  apiClient
    .get<Product[]>("/store/products", { params: category ? { category } : undefined })
    .then((r) => r.data);

export const fetchProduct = (id: number | string) =>
  apiClient.get<Product>(`/store/products/${id}`).then((r) => r.data);

export interface CheckoutItem {
  productId: number;
  quantity: number;
}

export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

export interface OrderItemDto {
  id: number;
  productId: number;
  productName: string | null;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: number;
  status: OrderStatus;
  total: number;
  createdAt: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: OrderItemDto[];
}

export const checkout = (items: CheckoutItem[]) =>
  apiClient.post<Order>("/store/orders", { items }).then((r) => r.data);

export interface CardDetails {
  cardNumber: string;
  expiry: string;
  cvv: string;
  name: string;
}

export const payOrder = (id: number | string, card: CardDetails) =>
  apiClient.put<Order>(`/store/orders/${id}`, { action: "pay", ...card }).then((r) => r.data);

export const cancelOrder = (id: number | string) =>
  apiClient.put<Order>(`/store/orders/${id}`, { action: "cancel" }).then((r) => r.data);

export const fetchMyOrders = () => apiClient.get<Order[]>("/store/orders").then((r) => r.data);

export const fetchOrder = (id: number | string) =>
  apiClient.get<Order>("/store/orders", { params: { order_id: id } }).then((r) => r.data);
