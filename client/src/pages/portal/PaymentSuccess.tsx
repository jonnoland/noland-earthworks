/**
 * Payment Success Page — shown after a successful Stripe Checkout.
 * The webhook handles the actual DB update; this page just confirms to the customer.
 */

import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function PaymentSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto" />
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">Payment Received</h1>
          <p className="text-sm text-muted-foreground">
            Thank you. Your payment has been processed and Noland Earthworks has been notified.
          </p>
        </div>
        <Link
          href="/portal"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors"
        >
          View Payment History
        </Link>
        <p className="text-xs text-muted-foreground">
          Questions? Call{" "}
          <a href="tel:+16154004064" className="text-primary hover:underline">
            (615) 400-4064
          </a>
        </p>
      </div>
    </div>
  );
}
