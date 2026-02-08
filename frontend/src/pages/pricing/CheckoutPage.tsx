import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import {
    Loader2,
    Check,
    ArrowLeft,
    Shield,
    ShieldCheck,
    Sparkles,
    Zap,
    CheckCircle2,
    CreditCard,
    Lock,
    RefreshCw,
    Headphones,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
            <div className="text-center">
                {/* Animated rings */}
                <div className="relative mx-auto w-28 h-28 mb-10">
                    <div className="absolute inset-0 rounded-full border-4 border-green-500/20 animate-[ping_2s_ease-in-out_infinite]" />
                    <div className="absolute inset-2 rounded-full border-2 border-green-500/10 animate-[ping_2s_ease-in-out_infinite_0.5s]" />
                    <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-green-500/30">
                        <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={1.5} />
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
                    {t('checkout.paymentSuccess')}
                </h1>
                <p className="text-muted-foreground text-lg mb-8 max-w-sm mx-auto">
                    {t('checkout.activating')}{dots}
                </p>

                <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-sm font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('checkout.settingUp')}
                </div>
            </div>
        </div>
    );
};

/* ───────────── main page ───────────── */
const CheckoutPage = () => {
    const { t } = useTranslation();
    const { planSlug } = useParams<{ planSlug: string }>();
    const [searchParams] = useSearchParams();
    const [plan, setPlan] = useState<Plan | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [subError, setSubError] = useState<string | null>(null);
    const [isCompleted, setIsCompleted] = useState(searchParams.has('completed'));
    const navigate = useNavigate();

    useEffect(() => {
        if (isCompleted) return;

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

                const returnUrl = `${window.location.origin}/checkout/${planSlug}?completed=true&session_id={CHECKOUT_SESSION_ID}`;
                const { data } = await api.post('/subscriptions/create', { planSlug, returnUrl });

                if (data.upgraded) {
                    setIsCompleted(true);
                    return;
                }

                if (!data.clientSecret) {
                    setSubError(t('checkout.subscriptionError'));
                    return;
                }
                setClientSecret(data.clientSecret);
            } catch (err: any) {
                setSubError(err.response?.data?.message || t('checkout.subscriptionError'));
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [planSlug, isCompleted]);

    if (isCompleted) {
        return <SuccessScreen />;
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="text-center">
                    <div className="relative mx-auto w-12 h-12 mb-5">
                        <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-gray-800" />
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
                    </div>
                    <p className="text-muted-foreground text-sm">{t('checkout.preparing')}</p>
                </div>
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="text-center">
                    <CreditCard className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">{t('checkout.planNotFound')}</p>
                    <button
                        onClick={() => navigate('/pricing')}
                        className="text-indigo-500 text-sm font-medium hover:underline"
                    >
                        {t('common.back')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

            {/* ─── Header ─── */}
            <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        <span className="hidden sm:inline">{t('common.back')}</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <img src="/logo-full.png" alt="Jolu.ai" className="h-7 object-contain dark:hidden" />
                        <img src="/logo-full-dark.png" alt="Jolu.ai" className="h-7 object-contain hidden dark:block" />
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-500">
                        <Lock className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t('checkout.securePayment')}</span>
                    </div>
                </div>
            </header>

            {/* ─── Content ─── */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

                    {/* ─── Left: Order Summary ─── */}
                    <div className="lg:col-span-5 xl:col-span-4 order-2 lg:order-1 space-y-6">

                        {/* Plan Summary Card */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                            {/* Plan header */}
                            <div className="px-6 pt-6 pb-4">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                                            <Sparkles className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-foreground">{t('checkout.yourPlan')}</h2>
                                            <p className="text-xs text-muted-foreground">{t('checkout.monthlyBilling')}</p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                                        {plan.name}
                                    </span>
                                </div>

                                {/* Features */}
                                <div className="space-y-2">
                                    {plan.modules.map((mod) => (
                                        <div key={mod} className="flex items-center gap-2.5 py-1">
                                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" strokeWidth={2.5} />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {t(`modules.${mod}`)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Price breakdown */}
                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">{t('checkout.subtotal')}</span>
                                    <span className="text-sm text-foreground">R$ {Number(plan.price).toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <span className="text-sm font-semibold text-foreground">{t('checkout.total')}</span>
                                    <div className="text-right">
                                        <span className="text-xl font-bold text-foreground">
                                            R$ {Number(plan.price).toFixed(2)}
                                        </span>
                                        <span className="text-xs text-muted-foreground">/{t('pricing.perMonth')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Benefits */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
                                        <Zap className="w-4 h-4 text-amber-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{t('checkout.instantAccess')}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{t('checkout.instantAccessDesc')}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
                                        <RefreshCw className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{t('checkout.cancelAnytime')}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{t('checkout.cancelAnytimeDesc')}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center flex-shrink-0">
                                        <Headphones className="w-4 h-4 text-purple-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{t('checkout.premiumSupport')}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{t('checkout.premiumSupportDesc')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Guarantee */}
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 p-5">
                            <div className="flex items-start gap-3">
                                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">{t('checkout.guarantee')}</p>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-400/80 mt-1 leading-relaxed">
                                        {t('checkout.guaranteeDesc')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Trust badges */}
                        <div className="flex items-center justify-center gap-6 py-2">
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <Lock className="w-3.5 h-3.5" />
                                <span>SSL 256-bit</span>
                            </div>
                            <div className="w-px h-3 bg-gray-200 dark:bg-gray-800" />
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <Shield className="w-3.5 h-3.5" />
                                <span>PCI DSS</span>
                            </div>
                            <div className="w-px h-3 bg-gray-200 dark:bg-gray-800" />
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Stripe</span>
                            </div>
                        </div>
                    </div>

                    {/* ─── Right: Stripe Embedded Checkout ─── */}
                    <div className="lg:col-span-7 xl:col-span-8 order-1 lg:order-2">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">

                            {subError ? (
                                <div className="text-center py-16 px-6">
                                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                                        <CreditCard className="w-6 h-6 text-red-500" />
                                    </div>
                                    <p className="text-red-600 dark:text-red-400 text-sm font-medium mb-1">
                                        {t('checkout.paymentFailed')}
                                    </p>
                                    <p className="text-muted-foreground text-xs mb-6">{subError}</p>
                                    <button
                                        onClick={() => navigate('/pricing')}
                                        className="inline-flex items-center gap-1.5 text-indigo-500 text-sm font-medium hover:underline"
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5" />
                                        {t('checkout.backToPlans')}
                                    </button>
                                </div>
                            ) : clientSecret ? (
                                <EmbeddedCheckoutProvider
                                    stripe={stripePromise}
                                    options={{ clientSecret }}
                                >
                                    <EmbeddedCheckout />
                                </EmbeddedCheckoutProvider>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <div className="relative w-10 h-10">
                                        <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-gray-800" />
                                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">{t('checkout.preparing')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CheckoutPage;
