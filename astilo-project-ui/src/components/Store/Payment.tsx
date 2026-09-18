import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@heroui/react";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { AppInput, PageHeading } from "../shared";
import { AppRoute } from "../../app/AppRoute";
import { fetchOrder, payOrder, storeErrorMessage } from "../../lib/storeApi";

const formatCardNumber = (v: string) =>
  v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

const formatExpiry = (v: string) => {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

type CardBrand = "visa" | "mastercard" | "amex" | "discover" | null;

const detectBrand = (digits: string): CardBrand => {
  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^6(?:011|5)/.test(digits)) return "discover";
  return null;
};

const ChipIcon = () => (
  <div className="relative h-8 w-11 overflow-hidden rounded-md bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 shadow-inner">
    <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-px p-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-[2px] border border-yellow-700/40 bg-yellow-300/40" />
      ))}
    </div>
    <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-yellow-700/30" />
  </div>
);

const ContactlessIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" className="text-white/70">
    <path d="M8 5a10 10 0 0 1 0 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M5 8a6 6 0 0 1 0 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.75" />
    <path d="M11 2a14 14 0 0 1 0 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
  </svg>
);

const VisaMark = ({ className = "" }: { className?: string }) => (
  <span className={`font-display italic tracking-tight text-white ${className}`}>
    VISA<span className="text-[#f7b600]">.</span>
  </span>
);

const MastercardMark = ({ className = "" }: { className?: string }) => (
  <div className={`relative flex items-center ${className}`}>
    <div className="h-7 w-7 rounded-full bg-[#eb001b]" />
    <div className="-ml-3.5 h-7 w-7 rounded-full bg-[#f79e1b] mix-blend-screen" />
  </div>
);

const AmexMark = ({ className = "" }: { className?: string }) => (
  <div className={`rounded-[3px] bg-[#2557a7] px-2 py-1 ${className}`}>
    <span className="text-[11px] font-extrabold tracking-tight text-white">AMEX</span>
  </div>
);

const DiscoverMark = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-1 ${className}`}>
    <span className="font-display font-extrabold italic tracking-tight text-white">Discover</span>
    <span className="h-3 w-3 rounded-full bg-[#f68121]" />
  </div>
);

/** Faded row of accepted networks, shown while no brand has been detected yet. */
const AcceptedNetworks = () => (
  <div className="flex items-center gap-3 opacity-40">
    <VisaMark className="text-sm" />
    <MastercardMark className="scale-[0.55]" />
    <AmexMark className="scale-90" />
    <DiscoverMark className="text-xs" />
  </div>
);

const BrandLogo = ({ brand }: { brand: CardBrand }) => {
  if (brand === "visa") return <VisaMark className="text-2xl" />;
  if (brand === "mastercard") return <MastercardMark />;
  if (brand === "amex") return <AmexMark />;
  if (brand === "discover") return <DiscoverMark className="text-base" />;
  return <AcceptedNetworks />;
};

const STEPS = ["Cart", "Checkout", "Payment", "Confirmation"];

const CheckoutStepper = ({ activeIndex }: { activeIndex: number }) => (
  <div className="mb-8 flex items-center justify-center gap-2 text-xs font-semibold">
    {STEPS.map((step, i) => (
      <div key={step} className="flex items-center gap-2">
        <span
          className={`grid h-6 w-6 place-items-center rounded-full ${
            i <= activeIndex ? "bg-gradient-to-r from-accent to-accent-2 text-[#17131f]" : "bg-ink/10 text-ink/40"
          }`}
        >
          {i < activeIndex ? "✓" : i + 1}
        </span>
        <span className={i <= activeIndex ? "text-ink" : "text-ink/40"}>{step}</span>
        {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-hair/30" />}
      </div>
    ))}
  </div>
);

const Payment = () => {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const { data: order, isLoading: isOrderLoading } = useQuery({
    queryKey: ["store-order", orderId],
    queryFn: () => fetchOrder(orderId),
  });

  const pay = useMutation({
    mutationFn: async () => {
      await new Promise((r) => setTimeout(r, 1400)); // simulated gateway round-trip
      return payOrder(orderId, { name, cardNumber: cardNumber.replace(/\s/g, ""), expiry, cvv });
    },
    onSuccess: () => {
      toast.success("Payment successful — your order is confirmed!");
      navigate(`${AppRoute.storeOrders}/${orderId}/confirmed`);
    },
    onError: (err: unknown) => toast.error(storeErrorMessage(err, "Payment failed — please try again.")),
  });

  const digits = cardNumber.replace(/\s/g, "");
  const brand = detectBrand(digits);
  const isValid =
    name.trim().length > 0 &&
    digits.length >= 12 &&
    /^\d{2}\/\d{2}$/.test(expiry) &&
    cvv.length >= 3;

  if (isOrderLoading)
    return (
      <div className="flex justify-center py-32">
        <AppLoader label="loading order…" />
      </div>
    );

  if (!order)
    return (
      <div className="py-32 text-center">
        <p className="text-ink/60">Couldn't find this order.</p>
        <Link to={AppRoute.storeOrders} className="mt-3 inline-block text-accent-2 underline">
          ← My orders
        </Link>
      </div>
    );

  if (order.status !== "pending") return <Navigate to={`${AppRoute.storeOrders}/${orderId}/confirmed`} replace />;

  return (
    <section className="mx-auto max-w-4xl pb-16">
      <CheckoutStepper activeIndex={2} />
      <PageHeading eyebrow="✦ secure mock payment">
        Complete your <span className="gradient-text">payment</span>
      </PageHeading>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <form
          className="glass-card flex flex-col gap-4 p-6 lg:col-span-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isValid) {
              toast.error("Enter a valid card name, number, expiry (MM/YY), and CVV.");
              return;
            }
            pay.mutate();
          }}
        >
          {/* Card preview */}
          <div className="relative aspect-[2.1/1] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#251a38] via-[#2e2048] to-[#171223] p-5 text-white shadow-[0_20px_45px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/10 sm:p-6">
            {/* shine */}
            <div className="pointer-events-none absolute -inset-x-10 -top-24 h-40 rotate-[20deg] bg-gradient-to-b from-white/15 to-transparent blur-md" />
            {/* faint pattern */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.08),transparent_45%)]" />

            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <ChipIcon />
                <div className="flex items-center gap-2">
                  <ContactlessIcon />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                    Astilo Pay
                  </span>
                </div>
              </div>

              <p className="font-mono text-2xl tracking-[0.2em] [text-shadow:0_1px_1px_rgba(0,0,0,0.4)] sm:text-3xl">
                {cardNumber || "•••• •••• •••• ••••"}
              </p>

              <div className="flex items-end justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-white/40">
                    Card holder
                  </span>
                  <span className="max-w-[12rem] truncate text-sm font-semibold uppercase tracking-wide">
                    {name || "CARDHOLDER NAME"}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-white/40">
                    Expires
                  </span>
                  <span className="text-sm font-semibold tracking-wide">{expiry || "MM/YY"}</span>
                </div>
                <div className="flex items-center">
                  <BrandLogo brand={brand} />
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-ink/50">
            🔒 This is a simulated payment form — no real card is charged and no card data leaves your
            browser except to our own mock gateway. About 1 in 10 attempts is randomly declined to mimic
            a real processor.
          </p>

          <AppInput label="Name on card" value={name} onValueChange={setName} isRequired />
          <AppInput
            label="Card number"
            value={cardNumber}
            onValueChange={(v) => setCardNumber(formatCardNumber(v))}
            placeholder="1234 5678 9012 3456"
            inputMode="numeric"
            isRequired
          />
          <div className="grid grid-cols-2 gap-4">
            <AppInput
              label="Expiry"
              value={expiry}
              onValueChange={(v) => setExpiry(formatExpiry(v))}
              placeholder="MM/YY"
              inputMode="numeric"
              isRequired
            />
            <AppInput
              label="CVV"
              value={cvv}
              onValueChange={(v) => setCvv(v.replace(/\D/g, "").slice(0, 4))}
              placeholder="123"
              type="password"
              inputMode="numeric"
              isRequired
            />
          </div>

          <Button
            type="submit"
            radius="full"
            isDisabled={pay.isPending}
            className="mt-2 bg-gradient-to-r from-accent to-accent-2 font-bold text-[#17131f] shadow-glow"
          >
            {pay.isPending ? "Processing payment…" : `Pay $${order.total.toFixed(2)}`}
          </Button>
          <Link to={AppRoute.storeOrders} className="text-center text-xs text-ink/50 hover:text-ink">
            I'll pay later — go to my orders
          </Link>
        </form>

        <div className="glass-card h-fit p-5">
          <h2 className="mb-4 font-display text-lg font-bold text-ink">Order #{order.id}</h2>
          <ul className="flex flex-col gap-2 text-sm text-ink/70">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span className="line-clamp-1">
                  {i.productName} × {i.quantity}
                </span>
                <span>${(i.unitPrice * i.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-hair/20 pt-3 text-base font-bold text-ink">
            <span>Total due</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-ink/40">
            <span>🔒</span>
            <span>Secured by Astilo's mock payment gateway</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Payment;
