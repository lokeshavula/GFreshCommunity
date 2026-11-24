import { Platform } from 'react-native';

import { PaymentMethod, PaymentMethodId, PaymentResult } from '../types/payment';
import { UserProfile } from '../types/user';
import { openRazorpayCheckout } from './razorpayService';

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'razorpay',
    title: 'Razorpay / Instant Pay',
    subtitle: 'GPay, PhonePe, Paytm, Cards & NetBanking',
    icon: 'flash-outline',
    platforms: ['all'],
    recommended: true,
    badge: 'FAST & SECURE',
  },
  {
    id: 'upi',
    title: 'UPI Apps',
    subtitle: 'Google Pay, PhonePe, Paytm, CRED, BHIM',
    icon: 'phone-portrait-outline',
    platforms: ['all'],
  },
  {
    id: 'card',
    title: 'Credit / Debit Cards',
    subtitle: 'Visa, Mastercard, RuPay, Amex',
    icon: 'card-outline',
    platforms: ['all'],
  },
  {
    id: 'cod',
    title: 'Cash on Delivery',
    subtitle: 'Pay cash when your groceries arrive at flat',
    icon: 'cash-outline',
    platforms: ['all'],
  },
];

export function getAvailablePaymentMethods(): PaymentMethod[] {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  return PAYMENT_METHODS.filter(
    method => method.platforms.includes('all') || method.platforms.includes(platform),
  );
}

export function getDefaultPaymentMethodId(): PaymentMethodId {
  const methods = getAvailablePaymentMethods();
  return methods.find(method => method.recommended)?.id ?? methods[0]?.id ?? 'razorpay';
}

function createCodTransactionId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  return `GFM-COD-${stamp}`;
}

/**
 * Real-time payment processor.
 * - Online (Razorpay / UPI / Cards): launches native Razorpay checkout modal.
 * - Offline (COD): confirms instantly without payment gateway.
 */
export async function processPayment(
  method: PaymentMethodId,
  amount: number,
  user?: UserProfile | null,
): Promise<PaymentResult> {
  if (amount <= 0) {
    return {
      success: false,
      method,
      transactionId: '',
      message: 'Invalid payment amount.',
    };
  }

  // 1. Cash on Delivery
  if (method === 'cod') {
    return {
      success: true,
      method: 'cod',
      transactionId: createCodTransactionId(),
      message: 'Order confirmed. Pay cash on delivery.',
    };
  }

  // 2. Real-time Razorpay Payment (UPI, Cards, NetBanking, Wallets)
  try {
    const razorpayRes = await openRazorpayCheckout({
      amount,
      user,
      description: `Order Payment for ${user?.flatNo ? `Flat ${user.flatNo}` : 'Community'}`,
    });

    if (!razorpayRes.success) {
      return {
        success: false,
        method,
        transactionId: '',
        message: razorpayRes.message || 'Payment was not completed.',
      };
    }

    return {
      success: true,
      method,
      transactionId: razorpayRes.paymentId || `PAY_${Date.now()}`,
      message: 'Payment authorized successfully.',
    };
  } catch (error: any) {
    return {
      success: false,
      method,
      transactionId: '',
      message: error?.message || 'Payment processing failed. Please try again.',
    };
  }
}

export function getPaymentMethodLabel(method: PaymentMethodId): string {
  return PAYMENT_METHODS.find(item => item.id === method)?.title ?? method;
}
