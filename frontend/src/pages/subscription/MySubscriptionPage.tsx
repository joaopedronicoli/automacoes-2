import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Loader2, CreditCard, Check, ArrowRight, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Subscription {
    planId: string | null;
    planName: string | null;
    planSlug: string | null;
    planPrice: number;
    planModules: string[];
    activeModules: string[];
    extraModules: string[];
    disabledModules: string[];
}

const MySubscriptionPage = () => {
    const { t } = useTranslation();
    const [sub, setSub] = useState<Subscription | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/plans/my-subscription')
            .then(({ data }) => setSub(data))
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <CreditCard className="w-6 h-6 text-indigo-500" />
                    {t('subscription.title')}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {t('subscription.subtitle')}
                </p>
            </div>

            {/* Current Plan Card */}
            <div className="glass-card rounded-xl p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
                    {t('subscription.currentPlan')}
                </h2>
                {sub?.planId ? (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-foreground">{sub.planName}</h3>
                                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                                    R${Number(sub.planPrice).toFixed(2)}
                                    <span className="text-sm font-normal text-gray-400">/{t('pricing.perMonth')}</span>
                                </p>
                            </div>
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold">
                                {t('common.active')}
                            </span>
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                                {t('subscription.modules')}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {sub.activeModules.map((mod) => (
                                    <span
                                        key={mod}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        {t(`modules.${mod}`)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <CreditCard className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-muted-foreground">{t('subscription.noPlan')}</p>
                    </div>
                )}
            </div>

            {/* Payment Info (Placeholder) */}
            <div className="glass-card rounded-xl p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
                    {t('subscription.payment')}
                </h2>
                <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                        {t('subscription.nextBilling')}: —
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {t('checkout.comingSoon')}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={() => navigate('/pricing')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                    {t('subscription.changePlan')}
                    <ArrowRight className="w-4 h-4" />
                </button>
                {sub?.planId && (
                    <>
                        {showCancelConfirm ? (
                            <div className="flex-1 flex gap-2">
                                <button
                                    onClick={() => setShowCancelConfirm(false)}
                                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    {t('common.no')}
                                </button>
                                <button
                                    disabled
                                    className="flex-1 py-3 bg-red-600/50 text-white/70 rounded-xl text-sm font-semibold cursor-not-allowed"
                                >
                                    {t('common.confirm')}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowCancelConfirm(true)}
                                className="flex-1 flex items-center justify-center gap-2 py-3 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <XCircle className="w-4 h-4" />
                                {t('subscription.cancelSubscription')}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default MySubscriptionPage;
