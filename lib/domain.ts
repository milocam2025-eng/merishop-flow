export type Client = { id: string; name: string };

export type InventorySummary = {
  id: string;
  product: string;
  quantity: number;
  minimum_stock: number | null;
  cost_usd: number | null;
  tax_usd: number | null;
  shipping_usd: number | null;
};

export type OrderItem = {
  inventory_id?: string;
  product: string;
  brand?: string | null;
  size?: string | null;
  color?: string | null;
  quantity: number;
  price: number;
  subtotal: number;
};

export type Order = {
  id: string;
  product: string;
  cost: number;
  tax: number;
  commission_percent: number;
  shipping: number;
  total: number;
  paid: number;
  status: string;
  client_id: string | null;
  inventory_id: string | null;
  order_number?: string | null;
  source?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  total_mxn?: number | null;
  created_at?: string | null;
  items?: OrderItem[] | null;
};

export type Payment = {
  id: string;
  order_id: string;
  amount: number;
  method: string;
  created_at: string;
};

export type PublishableInventoryProduct = {
  id: string;
  product: string;
  brand?: string | null;
  category?: string | null;
  size?: string | null;
  image_url?: string | null;
  store?: string | null;
  cost_usd?: number | null;
  tax_rate?: number | null;
  shipping_usd?: number | null;
  commission_percent?: number | null;
  exchange_rate?: number | null;
  sale_price_mxn?: number | null;
};
