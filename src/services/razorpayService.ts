import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_CONFIG } from '../config/razorpay.config';
import { UserProfile } from '../types/user';

export type RazorpayPaymentResponse = {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  signature?: string;
  message?: string;
};

export type OpenRazorpayOptions = {
  amount: number; // in INR (e.g. 299)
  description?: string;
  user?: UserProfile | null;
  orderNotes?: Record<string, string>;
};

/**
 * Opens the native Razorpay Payment Gateway modal on iOS / Android.
 * Supports UPI (GPay, PhonePe, Paytm, CRED), Cards, NetBanking, Wallets.
 */
export async function openRazorpayCheckout(
  options: OpenRazorpayOptions,
): Promise<RazorpayPaymentResponse> {
  const { amount, description, user, orderNotes } = options;

  if (amount <= 0) {
    return {
      success: false,
      message: 'Invalid payment amount.',
    };
  }

  // Razorpay requires amount in paise (1 INR = 100 paise)
  const amountInPaise = Math.round(amount * 100);

  const checkoutOptions = {
    key: RAZORPAY_CONFIG.keyId,
    amount: amountInPaise.toString(),
    currency: RAZORPAY_CONFIG.currency,
    name: RAZORPAY_CONFIG.merchantName,
    description: description || RAZORPAY_CONFIG.description,
    image: RAZORPAY_CONFIG.logoUrl,
    theme: {
      color: RAZORPAY_CONFIG.themeColor,
    },
    prefill: {
      name: user?.fullName || 'Customer',
      contact: user?.mobileNumber || '',
      email: user?.email || '',
    },
    notes: {
      flatNo: user?.flatNo || '',
      blockNumber: user?.blockNumber || '',
      ...orderNotes,
    },
  };

  try {
    const data = await RazorpayCheckout.open(checkoutOptions);
    // data contains: razorpay_payment_id, razorpay_order_id, razorpay_signature
    return {
      success: true,
      paymentId: data.razorpay_payment_id || `PAY_${Date.now()}`,
      orderId: data.razorpay_order_id,
      signature: data.razorpay_signature,
      message: 'Payment completed successfully.',
    };
  } catch (error: any) {
    // Razorpay error object: { code, description, error_reason }
    // code: 0 or description: 'Payment Cancelled' when user closes modal
    const isCancelled =
      error?.code === 0 ||
      error?.description?.toLowerCase()?.includes('cancelled') ||
      error?.description?.toLowerCase()?.includes('dismissed');

    const errorMessage = isCancelled
      ? 'Payment was cancelled. You can retry or choose Cash on Delivery.'
      : error?.description || error?.message || 'Payment could not be processed.';

    return {
      success: false,
      message: errorMessage,
    };
  }
}
