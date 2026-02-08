import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CreditCard, Check, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Plan {
    id: string;
    name: string;
    slug: string;
    price: number;
    modules: string[];
}

const CheckoutPage = () => {
    const { t } = useTranslation();
    const { planSlug } = useParams<{ planSlug: string }>();
    const [plan, setPlan] = useState<Plan | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetch(`${import.meta.env.VITE_API_URL || ''}/api/plans`)
            .then((res) => res.json())
            .then((data: Plan[]) => {
                const found = data.find((p) => p.slug === planSlug);
                setPlan(found || null);
            })
            .catch(() => {})
            .finally(() => setIsLoading(false));
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

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
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
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4">
                        <Lock className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">
                        {t('checkout.stripeIntegration')}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        {t('checkout.comingSoon')}
                    </p>
                </div>

                <button
                    disabled
                    className="w-full py-3 rounded-xl text-sm font-semibold bg-indigo-600/50 text-white/70 cursor-not-allowed"
                >
                    {t('checkout.confirmSubscription')}
                </button>
            </div>
        </div>
    );
};

export default CheckoutPage;
