import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Loader2, Check, Star, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { logout } from '../../store/authSlice';
import { clearToken } from '../../lib/auth';

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

const ChoosePlanPage = () => {
    const { t } = useTranslation();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        fetch(`${import.meta.env.VITE_API_URL || ''}/api/plans`)
            .then((res) => res.json())
            .then((data) => {
                setPlans(data.filter((p: Plan) => p.isActive));
            })
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, []);

    const handleSubscribe = (planSlug: string) => {
        navigate(`/checkout/${planSlug}`);
    };

    const handleLogout = () => {
        clearToken();
        dispatch(logout());
        navigate('/login');
    };

    const popularIndex = plans.length > 1 ? 1 : 0;

    return (
        <div className="min-h-screen bg-gradient-subtle flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">J</span>
                    </div>
                    <span className="font-semibold text-foreground text-lg">Jolu.ai</span>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    <LogOut className="w-4 h-4" />
                    {t('choosePlan.logout')}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="max-w-5xl w-full animate-fade-in-up">
                    <div className="text-center mb-12">
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                            {t('choosePlan.title')}
                        </h1>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            {t('choosePlan.subtitle')}
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center items-center min-h-[300px]">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                            {plans.map((plan, index) => {
                                const isPopular = index === popularIndex;
                                return (
                                    <div
                                        key={plan.id}
                                        className={`relative glass-card rounded-xl hover-lift p-6 flex flex-col ${
                                            isPopular
                                                ? 'animate-pulse-glow scale-[1.03] border-2 border-indigo-500'
                                                : ''
                                        }`}
                                    >
                                        {isPopular && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                                                <Star className="w-3 h-3" />
                                                {t('pricing.mostPopular')}
                                            </div>
                                        )}

                                        <div className="mb-6">
                                            <h3 className="text-xl font-bold text-foreground mb-2">
                                                {plan.name}
                                            </h3>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-bold text-foreground">
                                                    R${Number(plan.price).toFixed(0)}
                                                </span>
                                                <span className="text-muted-foreground text-sm">
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
                                                    : 'bg-gray-100 dark:bg-gray-700 text-foreground hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            {t('pricing.subscribe')}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChoosePlanPage;
