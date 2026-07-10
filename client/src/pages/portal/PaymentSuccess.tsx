import { Link } from "wouter";

export default function PaymentSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-green-400">Payment Successful</h1>
        <p className="text-zinc-400">Your payment has been received. Thank you.</p>
        <Link href="/" className="text-amber-500 hover:underline text-sm">
          Return to homepage
        </Link>
      </div>
    </div>
  );
}
