// frontend/src/lib/payments.ts
import { apiFetch } from "@/lib/api";

export interface PayForBookingInput {
  bookingId: string;
  description?: string;
  prefillEmail?: string;
}

export interface PayForBookingResult {
  verified: boolean;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function payForBooking(
  { bookingId, description, prefillEmail }: PayForBookingInput
): Promise<PayForBookingResult> {
  const loaded = await loadRazorpayScript();
  if (!loaded) throw new Error("Payment gateway failed to load");

  // Matches PaymentOrderRequest { booking_id } → PaymentOrderResponse
  const order = await apiFetch("/api/payments/order", {
    method: "POST",
    body: JSON.stringify({ booking_id: bookingId }),
  });

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.razorpay_key_id,
      amount: order.amount,          // already in paise
      currency: order.currency ?? "INR",
      name: "NurseConnect",
      description,
      order_id: order.razorpay_order_id,
      prefill: { email: prefillEmail },
      handler: async (response: any) => {
        try {
          // Matches PaymentVerifyRequest
          const verifyRes = await apiFetch("/api/payments/verify", {
            method: "POST",
            body: JSON.stringify({
              booking_id: bookingId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          resolve({ verified: !!verifyRes?.verified });
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
    });
    rzp.open();
  });
}