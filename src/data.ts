import type { Category, MenuItem, RestaurantSettings } from './types';

export const initialCategories: Category[] = [
  { id: '1', name: 'Pratos Principais' },
  { id: '2', name: 'Bebidas' },
  { id: '3', name: 'Sobremesas' },
  { id: '4', name: 'Porções' },
];

export const initialMenuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Feijoada Mineira',
    description: 'Feijoada completa com arroz, couve, farofa e laranja.',
    price: 45.90,
    category: '1',
    available: true,
  },
  {
    id: '2',
    name: 'Tutu à Mineira',
    description: 'Tutu de feijão, arroz, lombo, couve e ovo frito.',
    price: 39.90,
    category: '1',
    available: true,
  },
  {
    id: '3',
    name: 'Frango com Quiabo',
    description: 'Frango caipira, arroz, quiabo refogado e angu.',
    price: 42.00,
    category: '1',
    available: true,
  },
  {
    id: '4',
    name: 'Pão de Queijo Recheado',
    description: 'Porção com 6 unidades recheadas com requeijão ou linguiça.',
    price: 22.00,
    category: '4',
    available: true,
  },
];

export const initialSettings: RestaurantSettings = {
  name: 'Fogão a Lenha',
  logo: '',
  heroVideo: '',
  phone: '(42) 99141-7956',
  whatsapp: '(42) 99875-1800',
  address: 'Av. Atlanta, 830, Carambeí, PR 84145-000',
  openingHours: {
    'Segunda-Sexta': '11:00 às 22:00',
    'Sábado': '11:00 às 22:00',
    'Domingo': '11:00 às 18:00',
  },
  deliveryFee: 10.00,
  minOrder: 30.00,
  paymentMethods: ['Dinheiro', 'PIX', 'Cartão de Débito', 'Cartão de Crédito'],
};
