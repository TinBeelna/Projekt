import { redirect } from 'next/navigation'
import { stripe } from '../../lib/stripe'
import { Stripe } from "stripe"
import { prisma } from "@/app/lib/prisma";

// --- IKONE (Zadržane tvoje) ---
const SuccessIcon = <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M15.4695 0.232963C15.8241 0.561287 15.8454 1.1149 15.5171 1.46949L6.14206 11.5945C5.97228 11.7778 5.73221 11.8799 5.48237 11.8748C5.23253 11.8698 4.99677 11.7582 4.83452 11.5681L0.459523 6.44311C0.145767 6.07557 0.18937 5.52327 0.556912 5.20951C0.924454 4.89575 1.47676 4.93936 1.79051 5.3069L5.52658 9.68343L14.233 0.280522C14.5613 -0.0740672 15.1149 -0.0953599 15.4695 0.232963Z" fill="white"/></svg>;
const ErrorIcon = <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M1.25628 1.25628C1.59799 0.914573 2.15201 0.914573 2.49372 1.25628L8 6.76256L13.5063 1.25628C13.848 0.914573 14.402 0.914573 14.7437 1.25628C15.0854 1.59799 15.0854 2.15201 14.7437 2.49372L9.23744 8L14.7437 13.5063C15.0854 13.848 15.0854 14.402 14.7437 14.7437C14.402 15.0854 13.848 15.0854 13.5063 14.7437L8 9.23744L2.49372 14.7437C2.15201 15.0854 1.59799 15.0854 1.25628 14.7437C0.914573 14.402 0.914573 13.848 1.25628 13.5063L6.76256 8L1.25628 2.49372C0.914573 2.15201 0.914573 1.59799 1.25628 1.25628Z" fill="white"/></svg>;
const InfoIcon = <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M10 1.5H4C2.61929 1.5 1.5 2.61929 1.5 4V10C1.5 11.3807 2.61929 12.5 4 12.5H10C11.3807 12.5 12.5 11.3807 12.5 10V4C12.5 2.61929 11.3807 1.5 10 1.5ZM4 0C1.79086 0 0 1.79086 0 4V10C0 12.2091 1.79086 14 4 14H10C12.2091 14 14 12.2091 14 10V4C14 1.79086 12.2091 0 10 0H4Z" fill="white"/><path fillRule="evenodd" clipRule="evenodd" d="M5.25 7C5.25 6.58579 5.58579 6.25 6 6.25H7.25C7.66421 6.25 8 6.58579 8 7V10.5C8 10.9142 7.66421 11.25 7.25 11.25C6.83579 11.25 6.5 10.9142 6.5 10.5V7.75H6C5.58579 7.75 5.25 7.41421 5.25 7Z" fill="white"/><path d="M5.75 4C5.75 3.31075 6.31075 2.75 7 2.75C7.68925 2.75 8.25 3.31075 8.25 4C8.25 4.68925 7.68925 5.25 7 5.25C6.31075 5.25 5.75 4.68925 5.75 4Z" fill="white"/></svg>;

type StatusKey = 'succeeded' | 'auth_succeeded' | 'auth_failed' | 'payment_failed' | 'processing' | 'requires_payment_method' | 'requires_capture' | 'subscription_succeeded' | 'subscription_failed' | 'cancel' | 'default';

const STATUS_CONTENT_MAP: Record<StatusKey, any> = {
  auth_succeeded: { text: "Authentication Successful. Payment succeeded", iconColor: "#30B130", icon: SuccessIcon },
  auth_failed: { text: "Authentication Failed. Please try again.", iconColor: "#DF1B41", icon: ErrorIcon },
  succeeded: { text: "Payment succeeded", iconColor: "#30B130", icon: SuccessIcon },
  processing: { text: "Your payment is processing.", iconColor: "#6D6E78", icon: InfoIcon },
  requires_payment_method: { text: "Your payment was not successful, please try again.", iconColor: "#DF1B41", icon: ErrorIcon },
  payment_failed: { text: 'PAYMENT FAILED!!!', iconColor: "#DF1B41", icon: ErrorIcon },
  requires_capture: { text: "Authentication Successful. Awaiting admin capture", iconColor: "#30B130", icon: SuccessIcon },
  subscription_succeeded: { text: "Subscription Successful!", iconColor: "#30B130", icon: SuccessIcon },
  subscription_failed: { text: "Subscription failed. Please try again", iconColor: "#DF1B41", icon: ErrorIcon },
  cancel: { text: "Payment canceled. Your card was not charged.", iconColor: "#6D6E78", icon: InfoIcon },
  default: { text: "Something went wrong, please try again.", iconColor: "#DF1B41", icon: ErrorIcon },
};

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const params = await searchParams;
  const paymentIntentId = params.payment_intent;
  const sessionId = params.session_id;
  const statusParam = params.status;

  let displayKey: StatusKey = "default";
  let displayStatus = "";
  let orderDetails: any = null;

  // 1. CASE: Korisnik je otkazao (Cancel)
  if (statusParam === "cancel") {
    displayKey = "cancel";
  } 
  
  // 2. CASE: SUBSCRIPTION (Checkout Session)
  else if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'subscription.latest_invoice.payment_intent'],
      });
      const subscription = session.subscription as Stripe.Subscription;
      displayStatus = subscription?.status || "unknown";
      displayKey = subscription?.status === "active" || subscription?.status === "trialing" ? "subscription_succeeded" : "subscription_failed";
    } catch (e) {
      displayKey = "default";
    }
  } 
  
  // 3. CASE: OBIČNO PLAĆANJE (Payment Intent)
  else if (paymentIntentId) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
    displayStatus = paymentIntent.status;
    
    // Dohvat iz tvoje Prisme
    const orderId = paymentIntent.metadata?.orderId;
    if (orderId) {
        orderDetails = await prisma.paymentIntents.findUnique({ where: { id: Number(orderId) } });
    }

    const charge = paymentIntent.latest_charge as Stripe.Charge | null;
    const is3DS = charge?.payment_method_details?.card?.three_d_secure?.result === "authenticated";

    if (displayStatus === "succeeded") {
      displayKey = is3DS ? "auth_succeeded" : "succeeded";
    } else if (paymentIntent.last_payment_error?.code === "payment_intent_authentication_failure") {
      displayKey = "auth_failed";
    } else if (displayStatus === "processing") {
      displayKey = "processing";
    } else if (displayStatus === "requires_payment_method") {
      displayKey = "requires_payment_method";
    } else if (displayStatus === 'requires_capture') {
      displayKey = 'requires_capture';
    }
  } 
  else {
    redirect('/');
  }

  const content = STATUS_CONTENT_MAP[displayKey] || STATUS_CONTENT_MAP.default;

  return (
    <div id="payment-status" className="flex flex-col items-center justify-center min-h-screen p-6">
      <div id="status-icon" style={{ backgroundColor: content.iconColor, padding: '15px', borderRadius: '50%', marginBottom: '20px' }}>
        {content.icon}
      </div>
      <h2 id="status-text" className="text-2xl font-bold mb-6">{content.text}</h2>
      
      <div id="details-table" className="w-full max-w-md bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="p-4 font-semibold text-gray-500">Status</td>
              <td className="p-4 text-gray-900 capitalize">{displayStatus || "N/A"}</td>
            </tr>
            {orderDetails && (
              <>
                <tr>
                  <td className="p-4 font-semibold text-gray-500">Proizvod</td>
                  <td className="p-4 text-gray-900">{orderDetails.items || "Usluga"}</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-gray-500">Datum</td>
                  <td className="p-4 text-gray-900">{new Date(orderDetails.createdAt).toLocaleDateString('hr-HR')}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
      
      <a id="retry-button" href="/" className="mt-8 bg-blue-600 text-white px-8 py-3 rounded-full hover:bg-blue-700 transition">
        Vrati se na početnu
      </a>
    </div>
  );
}
