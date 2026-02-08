import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { Loader2, Check, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Plan {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    modules: string[];
    isActive: boolean;
    sortOrder: number;
}

const PricingPage = () => {
    const { t } = useTranslation();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const user = useSelector((state: RootState) => state.auth.user);

    useEffect(() => {
        fetch(`${import.meta.env.VITE_API_URL || ''}/api/plans`)
            .then((res) => res.json())
            .then((data) => {
                setPlans(data);
            })
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, []);

    const handleSubscribe = (planSlug: string) => {
        if (user) {
            navigate(`/checkout/${planSlug}`);
        } else {
            navigate(`/login?redirect=/checkout/${planSlug}`);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[600px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    const popularIndex = plans.length > 1 ? 1 : 0;

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            <div className="text-center mb-12">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                    {t('pricing.title')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
                    {t('pricing.subtitle')}
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {plans.map((plan, index) => {
                    const isPopular = index === popularIndex;
                    return (
                        <div
                            key={plan.id}
                            className={`relative bg-white dark:bg-gray-800 rounded-2xl border-2 p-6 flex flex-col ${
                                isPopular
                                    ? 'border-indigo-500 shadow-xl shadow-indigo-500/10 scale-[1.02]'
                                    : 'border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            {isPopular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                                    <Star className="w-3 h-3" />
                                    {t('pricing.mostPopular')}
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                                    {plan.name}
                                </h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                                        R${Number(plan.price).toFixed(0)}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                                        /{t('pricing.perMonth')}
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1">
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                                    {t('pricing.included')}
                                </p>
                                <ul className="space-y-2.5">
                                    {plan.modules.map((mod) => (
                                        <li key={mod} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            {t(`modules.${mod}`)}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button
                                onClick={() => handleSubscribe(plan.slug)}
                                className={`mt-6 w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                                    isPopular
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/25'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                {t('pricing.subscribe')}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PricingPage;
