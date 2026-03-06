export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
}

export interface Category {
  id: string;
  name: string;
}

export interface RestaurantSettings {
  name: string;
  logo?: string;
  logoSize?: 'small' | 'medium' | 'large' | 'custom';
  logoSizePx?: number; // Custom size in pixels
  heroVideo?: string;
  heroImage?: string;
  aboutImage1?: string;
  aboutImage2?: string;
  phone: string;
  whatsapp: string;
  address: string;
  openingHours: {
    [key: string]: string;
  };
  deliveryFee: number;
  minOrder: number;
  paymentMethods: string[];
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  items: { item: MenuItem; quantity: number }[];
  total: number;
  status: 'pending' | 'preparing' | 'delivered' | 'cancelled';
  createdAt: string;
  paymentMethod: string;
}
