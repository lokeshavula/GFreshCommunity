export type PaymentMethodId =
  | 'razorpay'
  | 'upi'
  | 'card'
  | 'cod'
  | 'apple_pay'
  | 'google_pay';

export type PaymentMethod = {
  id: PaymentMethodId;
  title: string;
  subtitle: string;
  icon: string;
  platforms: Array<'ios' | 'android' | 'all'>;
  recommended?: boolean;
  badge?: string;
};

export type CheckoutDraft = {
  items: Array<{
    id: string;
    name: string;
    subtitle?: string;
    price: number;
    unit?: string;
    quantity: number;
    image?: string;
  }>;
  deliverySlot: string;
  deliveryTime: string;
  instructions: string;
  total: number;
};

export type PaymentResult = {
  success: boolean;
  method: PaymentMethodId;
  transactionId: string;
  message?: string;
};
