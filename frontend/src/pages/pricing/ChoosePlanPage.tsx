import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
    Check,
    Star,
    LogOut,
    Sparkles,
    Zap,
    ArrowRight,
    Shield,
    Headphones,
    Crown,
    Rocket,
} from 'lucide-react';
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

const PLAN_ICONS: Record<string, typeof Sparkles> = {
    pro: Rocket,
    enterprise: Crown,
};

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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">

            {/* ─── Header ─── */}
            <header className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-2">
                    <img src="/logo-full.png" alt="Jolu.ai" className="h-20 object-contain dark:hidden" />
                    <img src="/logo-full-dark.png" alt="Jolu.ai" className="h-20 object-contain hidden dark:block" />
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('choosePlan.logout')}</span>
                </button>
            </header>

            {/* ─── Content ─── */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">

                {/* Hero */}
                <div className="text-center mb-12 max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-6">
                        <Sparkles className="w-3.5 h-3.5" />
                        {t('choosePlan.badge')}
                    </div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight leading-tight">
                        {t('choosePlan.title')}
                    </h1>
                    <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                        {t('choosePlan.subtitle')}
                    </p>
                </div>

                {/* Plans */}
                {isLoading ? (
                    <div className="flex justify-center items-center min-h-[300px]">
                        <div className="relative w-12 h-12">
                            <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-gray-800" />
                            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
                        </div>
                    </div>
                ) : (
                    <div className={`grid grid-cols-1 gap-6 w-full max-w-5xl mx-auto ${
                        plans.length === 2 ? 'md:grid-cols-2 max-w-3xl' : 'md:grid-cols-2 lg:grid-cols-3'
                    }`}>
                        {plans.map((plan, index) => {
                            const isPopular = index === popularIndex;
                            const PlanIcon = PLAN_ICONS[plan.slug] || Sparkles;

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 ${
                                        isPopular
                                            ? 'bg-white dark:bg-gray-900 border-indigo-500 dark:border-indigo-500 shadow-xl shadow-indigo-500/10 scale-[1.02] lg:scale-105'
                                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700'
                                    }`}
                                >
                                    {/* Popular badge */}
                                    {isPopular && (
                                        <div className="bg-indigo-600 text-white text-center py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                                            <Star className="w-3.5 h-3.5 fill-current" />
                                            {t('pricing.mostPopular')}
                                        </div>
                                    )}

                                    <div className="p-6 sm:p-8 flex-1 flex flex-col">
                                        {/* Plan header */}
                                        <div className="mb-6">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                    isPopular
                                                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25'
                                                        : 'bg-gray-100 dark:bg-gray-800'
                                                }`}>
                                                    <PlanIcon className={`w-5 h-5 ${isPopular ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                                                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                                                </div>
                                            </div>

                                            {/* Price */}
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xs text-muted-foreground">R$</span>
                                                <span className="text-5xl font-extrabold tracking-tight text-foreground">
                                                    {Number(plan.price).toFixed(0)}
                                                </span>
                                                <span className="text-muted-foreground text-sm ml-1">
                                                    /{t('pricing.perMonth')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* CTA Button */}
                                        <button
                                            onClick={() => handleSubscribe(plan.slug)}
                                            className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 group mb-8 ${
                                                isPopular
                                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30'
                                                    : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                                            }`}
                                        >
                                            {t('pricing.subscribe')}
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                        </button>

                                        {/* Features */}
                                        <div className="flex-1">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                                                {t('pricing.included')}
                                            </p>
                                            <ul className="space-y-3">
                                                {plan.modules.map((mod) => (
                                                    <li key={mod} className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                            isPopular
                                                                ? 'bg-indigo-100 dark:bg-indigo-950/60'
                                                                : 'bg-green-100 dark:bg-green-950/60'
                                                        }`}>
                                                            <Check className={`w-3 h-3 ${
                                                                isPopular
                                                                    ? 'text-indigo-600 dark:text-indigo-400'
                                                                    : 'text-green-600 dark:text-green-400'
                                                            }`} strokeWidth={3} />
                                                        </div>
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                                            {t(`modules.${mod}`)}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ─── Trust Section ─── */}
                <div className="mt-16 max-w-3xl mx-auto w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
                                <Zap className="w-4 h-4 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground">{t('choosePlan.trustInstant')}</p>
                                <p className="text-xs text-muted-foreground">{t('choosePlan.trustInstantDesc')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
                                <Shield className="w-4 h-4 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground">{t('choosePlan.trustCancel')}</p>
                                <p className="text-xs text-muted-foreground">{t('choosePlan.trustCancelDesc')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center flex-shrink-0">
                                <Headphones className="w-4 h-4 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground">{t('choosePlan.trustSupport')}</p>
                                <p className="text-xs text-muted-foreground">{t('choosePlan.trustSupportDesc')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="mt-10 text-xs text-center text-gray-400 dark:text-gray-600">
                    {t('choosePlan.footer')}
                </p>
            </div>
        </div>
    );
};

export default ChoosePlanPage;
