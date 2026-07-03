import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function stripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-06-24.dahlia' });
  }
  return _stripe;
}

export const PRESET_AMOUNTS = new Set([300, 500, 1000, 2500]);

export function isValidAmount(cents: number): boolean {
  return PRESET_AMOUNTS.has(cents) || cents >= 100;
}
