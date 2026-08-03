"use client";

import { useState } from "react";
import { Check, CreditCard, Loader2, Smartphone, Wallet, X } from "lucide-react";

type Method = "card" | "apple" | "google";

type Props = {
  open: boolean;
  filename: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function CheckoutModal({ open, filename, onClose, onConfirm }: Props) {
  const [method, setMethod] = useState<Method>("card");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate PDF");
      setBusy(false);
    }
  }

  const methods: { id: Method; label: string; hint: string; icon: typeof CreditCard }[] = [
    { id: "card", label: "Card", hint: "Visa, Mastercard…", icon: CreditCard },
    { id: "apple", label: "Apple Pay", hint: "Demo — no charge", icon: Smartphone },
    { id: "google", label: "Google Pay", hint: "Demo — no charge", icon: Wallet },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div
        role="dialog"
        aria-modal
        aria-labelledby="checkout-title"
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 id="checkout-title" className="text-lg font-semibold text-zinc-900">
              Finish & download
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Demo checkout — no real payment. Your edited PDF downloads next.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <p className="truncate text-xs text-zinc-400">{filename}</p>
          {methods.map((m) => {
            const Icon = m.icon;
            const active = method === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-rose-500 bg-rose-50 ring-1 ring-rose-500"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    active ? "bg-rose-600 text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-zinc-900">{m.label}</span>
                  <span className="block text-xs text-zinc-500">{m.hint}</span>
                </span>
                {active && <Check className="h-5 w-5 text-rose-600" />}
              </button>
            );
          })}
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={pay}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Pay & download
          </button>
        </div>
      </div>
    </div>
  );
}
