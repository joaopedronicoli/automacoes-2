import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, CreditCard, Check, Lock, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import stripePromise from '../../lib/stripe';
import api from '../../services/api';

interface Plan {
    id: string;
    name: string;
    slug: string;
    price: number;
    modules: string[];
}

const CheckoutForm = () => {
    const { t } = useTranslation();
    const stripe = useStripe();
    const elements = useElements();
    const navigate = useNavigate();
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

        // Poll for subscription activation
        let attempts = 0;
        const poll = async () => {
            try {
                const { data } = await api.get('/subscriptions/status');
                if (data.status === 'active') {
                    navigate('/dashboard');
                    return;
                }
            } catch {}
            attempts++;
            if (attempts < 15) {
                setTimeout(poll, 2000);
            } else {
                navigate('/dashboard');
            }
        };
        poll();
    };

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement />
            {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}
            <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="mt-6 w-full py-3 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('checkout.processing')}
                    </>
                ) : (
                    t('checkout.confirmSubscription')
                )}
            </button>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-400">
                <Lock className="w-3 h-3" />
                {t('checkout.securePayment')}
            </div>
        </form>
    );
};

const CheckoutPage = () => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { planSlug } = useParams<{ planSlug: string }>();
    const [plan, setPlan] = useState<Plan | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [subError, setSubError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const init = async () => {
            try {
                // Fetch plan
                const plansRes = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/plans`);
                const plans: Plan[] = await plansRes.json();
                const found = plans.find((p) => p.slug === planSlug);
                if (!found) {
                    setPlan(null);
                    setIsLoading(false);
                    return;
                }
                setPlan(found);

                // Create subscription
                const { data } = await api.post('/subscriptions/create', { planSlug });
                setClientSecret(data.clientSecret);
            } catch (err: any) {
                setSubError(err.response?.data?.message || t('checkout.subscriptionError'));
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [planSlug]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="max-w-xl mx-auto py-16 text-center">
                <p className="text-muted-foreground">{t('checkout.planNotFound')}</p>
                <button
                    onClick={() => navigate('/pricing')}
                    className="mt-4 text-indigo-600 dark:text-indigo-400 text-sm hover:underline"
                >
                    {t('common.back')}
                </button>
            </div>
        );
    }

    const isDark = theme === 'dark';

    const appearance = {
        theme: (isDark ? 'night' : 'stripe') as 'night' | 'stripe',
        variables: {
            colorPrimary: '#6366f1',
            borderRadius: '8px',
        },
    };

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <button
                onClick={() => navigate('/pricing')}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                {t('common.back')}
            </button>

            <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-indigo-500" />
                {t('checkout.title')}
            </h1>

            {/* Plan Summary */}
            <div className="glass-card rounded-xl p-6 mb-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
                    {t('checkout.summary')}
                </h2>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-semibold text-foreground text-lg">{plan.name}</h3>
                        <ul className="mt-2 space-y-1.5">
                            {plan.modules.map((mod) => (
                                <li key={mod} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Check className="w-3.5 h-3.5 text-green-500" />
                                    {t(`modules.${mod}`)}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="text-right">
                        <span className="text-3xl font-bold text-foreground">
                            R${Number(plan.price).toFixed(2)}
                        </span>
                        <p className="text-xs text-gray-400">/{t('pricing.perMonth')}</p>
                    </div>
                </div>
                <div className="border-t border-gray-100 dark:border-gray-700 pt-4 flex items-center justify-between">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{t('checkout.total')}</span>
                    <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                        R${Number(plan.price).toFixed(2)}/{t('pricing.perMonth')}
                    </span>
                </div>
            </div>

            {/* Payment Section */}
            <div className="glass-card rounded-xl p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
                    {t('checkout.paymentMethod')}
                </h2>

                {subError ? (
                    <div className="text-center py-6">
                        <p className="text-red-500 text-sm">{subError}</p>
                        <button
                            onClick={() => navigate('/pricing')}
                            className="mt-4 text-indigo-600 dark:text-indigo-400 text-sm hover:underline"
                        >
                            {t('common.back')}
                        </button>
                    </div>
                ) : clientSecret ? (
                    <Elements
                        stripe={stripePromise}
                        options={{ clientSecret, appearance }}
                    >
                        <CheckoutForm />
                    </Elements>
                ) : (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckoutPage;
