import { loadStripe } from '@stripe/stripe-js';

export default loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
