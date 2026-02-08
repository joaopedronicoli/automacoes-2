import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
    Loader2,
    Check,
    Lock,
    ArrowLeft,
    Shield,
    ShieldCheck,
    Sparkles,
    Zap,
    CheckCircle2,
    CreditCard,
    ArrowRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { setUser } from '../../store/authSlice';
import stripePromise from '../../lib/stripe';
import api from '../../services/api';

interface Plan {
    id: string;
    name: string;
    slug: string;
    price: number;
    modules: string[];
}

/* ───────────── animated background orbs ───────────── */
const BackgroundOrbs = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
        <div className="absolute -bottom-20 right-1/3 w-72 h-72 bg-blue-500/8 rounded-full blur-3xl animate-pulse [animation-delay:4s]" />
    </div>
);

/* ───────────── stepper ───────────── */
const Stepper = ({ step }: { step: number }) => {
    const { t } = useTranslation();
    const steps = [
        t('checkout.stepReview'),
        t('checkout.stepPayment'),
        t('checkout.stepDone'),
    ];

    return (
        <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((label, i) => {
                const num = i + 1;
                const isActive = num === step;
                const isDone = num < step;
                return (
                    <div key={i} className="flex items-center gap-2">
                        {i > 0 && (
                            <div
                                className={`w-8 h-px transition-colors duration-500 ${
                                    isDone ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-700'
                                }`}
                            />
                        )}
                        <div className="flex items-center gap-1.5">
                            <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                                    isDone
                                        ? 'bg-indigo-500 text-white scale-90'
                                        : isActive
                                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20 scale-110'
                                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                                }`}
                            >
                                {isDone ? <Check className="w-3.5 h-3.5" /> : num}
                            </div>
                            <span
                                className={`text-xs font-medium hidden sm:inline transition-colors ${
                                    isActive
                                        ? 'text-foreground'
                                        : isDone
                                          ? 'text-indigo-500'
                                          : 'text-gray-400'
                                }`}
                            >
                                {label}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

/* ───────────── success screen ───────────── */
const SuccessScreen = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        let attempts = 0;
        const poll = async () => {
            try {
                const { data } = await api.get('/subscriptions/status');
                if (data.status === 'active') {
                    // Refresh user data in Redux before navigating
                    try {
                        const { data: userData } = await api.get('/auth/me');
                        dispatch(setUser(userData));
                    } catch {}
                    navigate('/dashboard');
                    return;
                }
            } catch {}
            attempts++;
            if (attempts < 20) {
                setTimeout(poll, 2000);
            } else {
                // Refresh user data even on timeout
                try {
                    const { data: userData } = await api.get('/auth/me');
                    dispatch(setUser(userData));
                } catch {}
                navigate('/dashboard');
            }
        };
        poll();
    }, [navigate, dispatch]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <BackgroundOrbs />
            <div className="text-center animate-fade-in-up">
                {/* animated check circle */}
                <div className="relative mx-auto w-24 h-24 mb-8">
                    <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-green-500/30">
                        <CheckCircle2 className="w-12 h-12 text-white" />
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-foreground mb-3">
                    {t('checkout.paymentSuccess')}
                </h1>
                <p className="text-muted-foreground text-lg mb-6">
                    {t('checkout.activating')}{dots}
                </p>

                <div className="flex items-center justify-center gap-2 text-sm text-indigo-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('checkout.settingUp')}
                </div>
            </div>
        </div>
    );
};

/* ───────────── checkout form (inside Elements) ───────────── */
const CheckoutForm = ({ plan, onSuccess }: { plan: Plan; onSuccess: () => void }) => {
    const { t } = useTranslation();
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setIsProcessing(true);
        setError(null);

        const { error: confirmError } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.origin + '/dashboard',
            },
            redirect: 'if_required',
        });

        if (confirmError) {
            setError(confirmError.message || t('checkout.paymentFailed'));
            setIsProcessing(false);
            return;
        }

        onSuccess();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Stripe Payment Element */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700/50 p-4 bg-white/50 dark:bg-white/5 backdrop-blur-sm">
                <PaymentElement
                    options={{
                        layout: 'tabs',
                    }}
                />
            </div>

            {/* Error */}
            {error && (
                <div className="p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">!</div>
                    {error}
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="group relative w-full py-4 rounded-xl text-sm font-bold text-white overflow-hidden transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {/* gradient bg */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] group-hover:animate-[shimmer_2s_linear_infinite] transition-all" />
                {/* glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-indigo-600/50 via-purple-600/50 to-indigo-600/50 blur-xl" />
                <span className="relative flex items-center justify-center gap-2.5">
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('checkout.processing')}
                        </>
                    ) : (
                        <>
                            <Lock className="w-4 h-4" />
                            {t('checkout.payNow')} — R${Number(plan.price).toFixed(2)}
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </>
                    )}
                </span>
            </button>

            {/* Trust signals */}
            <div className="flex items-center justify-center gap-4 pt-1">
                <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <Lock className="w-3 h-3" />
                    <span>SSL</span>
                </div>
                <div className="w-px h-3 bg-gray-300 dark:bg-gray-700" />
                <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <Shield className="w-3 h-3" />
                    <span>PCI DSS</span>
                </div>
                <div className="w-px h-3 bg-gray-300 dark:bg-gray-700" />
                <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <CreditCard className="w-3 h-3" />
                    <span>Stripe</span>
                </div>
            </div>
        </form>
    );
};

/* ───────────── main page ───────────── */
const CheckoutPage = () => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { planSlug } = useParams<{ planSlug: string }>();
    const [plan, setPlan] = useState<Plan | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [customerSessionSecret, setCustomerSessionSecret] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [subError, setSubError] = useState<string | null>(null);
    const [step, setStep] = useState(2); // starts at payment step
    const navigate = useNavigate();

    useEffect(() => {
        const init = async () => {
            try {
                const plansRes = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/plans`);
                const plans: Plan[] = await plansRes.json();
                const found = plans.find((p) => p.slug === planSlug);
                if (!found) {
                    setPlan(null);
                    setIsLoading(false);
                    return;
                }
                setPlan(found);

                const { data } = await api.post('/subscriptions/create', { planSlug });

                // Upgrade — no payment needed, go straight to success
                if (data.upgraded) {
                    setStep(3);
                    return;
                }

                if (!data.clientSecret) {
                    setSubError(t('checkout.subscriptionError'));
                    return;
                }
                setClientSecret(data.clientSecret);
                if (data.customerSessionClientSecret) {
                    setCustomerSessionSecret(data.customerSessionClientSecret);
                }
            } catch (err: any) {
                setSubError(err.response?.data?.message || t('checkout.subscriptionError'));
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [planSlug]);

    const handlePaymentSuccess = useCallback(() => {
        setStep(3);
    }, []);

    // Step 3 — success
    if (step === 3) {
        return <SuccessScreen />;
    }

    // Loading
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <BackgroundOrbs />
                <div className="text-center animate-fade-in-up">
                    <div className="relative mx-auto w-16 h-16 mb-6">
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-200 dark:border-indigo-900" />
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
                        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-sm" />
                    </div>
                    <p className="text-muted-foreground text-sm font-medium">{t('checkout.preparing')}</p>
                </div>
            </div>
        );
    }

    // Plan not found
    if (!plan) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <BackgroundOrbs />
                <div className="text-center animate-fade-in-up">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <CreditCard className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-muted-foreground mb-4">{t('checkout.planNotFound')}</p>
                    <button
                        onClick={() => navigate('/pricing')}
                        className="text-indigo-500 hover:text-indigo-400 text-sm font-medium hover:underline"
                    >
                        {t('common.back')}
                    </button>
                </div>
            </div>
        );
    }

    const isDark = theme === 'dark';

    const appearance = {
        theme: (isDark ? 'night' : 'stripe') as 'night' | 'stripe',
        variables: {
            colorPrimary: '#6366f1',
            borderRadius: '10px',
        },
    };

    return (
        <div className="min-h-screen bg-gradient-subtle">
            <BackgroundOrbs />

            {/* Top bar */}
            <div className="sticky top-0 z-20 backdrop-blur-xl bg-white/70 dark:bg-gray-950/70 border-b border-gray-200/50 dark:border-gray-800/50">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('common.back')}
                    </button>
                    <div className="flex items-center gap-2">
                        <img src="/logo-full.png" alt="Jolu.ai" className="h-7 object-contain dark:hidden" />
                        <img src="/logo-full-dark.png" alt="Jolu.ai" className="h-7 object-contain hidden dark:block" />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                        <ShieldCheck className="w-4 h-4" />
                        {t('checkout.encrypted')}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                <Stepper step={step} />

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    {/* ─── Left: Order Summary (2 cols) ─── */}
                    <div className="lg:col-span-2 space-y-5 order-2 lg:order-1">
                        {/* Plan card */}
                        <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-700/40 bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl p-6">
                            {/* decorative gradient */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground text-lg">{plan.name}</h3>
                                    <p className="text-xs text-muted-foreground">{t('checkout.monthlyBilling')}</p>
                                </div>
                            </div>

                            {/* Modules */}
                            <div className="space-y-2.5 mb-6">
                                {plan.modules.map((mod) => (
                                    <div key={mod} className="flex items-center gap-2.5">
                                        <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                                            <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                                        </div>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {t(`modules.${mod}`)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Price */}
                            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-muted-foreground">{t('checkout.subtotal')}</span>
                                    <span className="text-sm text-foreground">R${Number(plan.price).toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                                    <span className="font-semibold text-foreground">{t('checkout.total')}</span>
                                    <div className="text-right">
                                        <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                            R${Number(plan.price).toFixed(2)}
                                        </span>
                                        <span className="text-xs text-muted-foreground ml-1">/{t('pricing.perMonth')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Guarantee */}
                        <div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/40 bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl p-5">
                            <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-foreground text-sm mb-1">{t('checkout.guarantee')}</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {t('checkout.guaranteeDesc')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Features highlight */}
                        <div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/40 bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl p-5 space-y-3">
                            <div className="flex items-center gap-3">
                                <Zap className="w-4 h-4 text-amber-500" />
                                <span className="text-xs text-muted-foreground">{t('checkout.instantAccess')}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Shield className="w-4 h-4 text-blue-500" />
                                <span className="text-xs text-muted-foreground">{t('checkout.cancelAnytime')}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-4 h-4 text-purple-500" />
                                <span className="text-xs text-muted-foreground">{t('checkout.premiumSupport')}</span>
                            </div>
                        </div>
                    </div>

                    {/* ─── Right: Payment (3 cols) ─── */}
                    <div className="lg:col-span-3 order-1 lg:order-2">
                        <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-700/40 bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl p-6 lg:p-8">
                            {/* decorative gradient */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                            <div className="flex items-center gap-2.5 mb-6">
                                <CreditCard className="w-5 h-5 text-indigo-500" />
                                <h2 className="font-bold text-foreground text-lg">{t('checkout.paymentMethod')}</h2>
                            </div>

                            {subError ? (
                                <div className="text-center py-12">
                                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                                        <CreditCard className="w-6 h-6 text-red-500" />
                                    </div>
                                    <p className="text-red-500 text-sm mb-4">{subError}</p>
                                    <button
                                        onClick={() => navigate('/pricing')}
                                        className="text-indigo-500 text-sm font-medium hover:underline"
                                    >
                                        {t('common.back')}
                                    </button>
                                </div>
                            ) : clientSecret ? (
                                <Elements
                                    stripe={stripePromise}
                                    options={{
                                        clientSecret,
                                        ...(customerSessionSecret && { customerSessionClientSecret: customerSessionSecret }),
                                        appearance,
                                    }}
                                >
                                    <CheckoutForm plan={plan} onSuccess={handlePaymentSuccess} />
                                </Elements>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <div className="relative w-10 h-10">
                                        <div className="absolute inset-0 rounded-full border-2 border-indigo-200 dark:border-indigo-900" />
                                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">{t('checkout.preparing')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* shimmer animation */}
            <style>{`
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    );
};

export default CheckoutPage;
