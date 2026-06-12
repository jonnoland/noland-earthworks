/**
 * Payment Cancel Page — shown when a customer cancels out of Stripe Checkout.
 */

import { XCircle } from "lucide-react";
import { Link } from "wouter";

export default function PaymentCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <XCircle className="w-14 h-14 text-muted-foreground mx-auto" />
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">Payment Cancelled</h1>
          <p className="text-sm text-muted-foreground">
            No charge was made. You can return to your payment portal to try again.
          </p>
        </div>
        <Link
          href="/portal"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors"
        >
          Back to Payment Portal
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
