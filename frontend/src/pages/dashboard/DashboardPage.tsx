import { useEffect, useState } from 'react';
import { Activity, MessageSquare, ThumbsUp, Users, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';

const StatCard = ({ icon: Icon, label, value, trend }: any) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary/10 dark:bg-blue-500/20 rounded-lg text-primary dark:text-blue-400">
                <Icon className="w-6 h-6" />
            </div>
            {trend !== undefined && (
                <span className={`text-sm font-medium ${trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {trend > 0 ? '+' : ''}{trend}%
                </span>
            )}
        </div>
        <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{label}</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value?.toLocaleString() || '0'}</p>
    </div>
);

const DashboardPage = () => {
    const { t } = useTranslation();
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/stats/dashboard');
                setStats(res.data);
            } catch (error) {
                console.error('Failed to fetch dashboard stats', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-blue-400" />
            </div>
        );
    }

    const statItems = [
        { icon: MessageSquare, label: t('dashboard.totalComments'), value: stats?.totalComments, trend: stats?.trends?.comments },
        { icon: ThumbsUp, label: t('dashboard.totalLikes'), value: stats?.totalLikes, trend: stats?.trends?.likes },
        { icon: Activity, label: t('dashboard.automationsRun'), value: stats?.automationsRun, trend: stats?.trends?.automations },
        { icon: Users, label: t('dashboard.potentialReach'), value: stats?.reach, trend: 0 },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('dashboard.title')}</h1>
                <p className="text-gray-500 dark:text-gray-400">{t('dashboard.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {statItems.map((stat, i) => (
                    <StatCard key={i} {...stat} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('dashboard.systemStatus')}</h2>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-xs rounded-full font-medium">{t('dashboard.operational')}</span>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">{t('dashboard.apiStatus')}</span>
                            <span className="font-medium text-green-600 dark:text-green-400">{t('dashboard.online')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">{t('dashboard.webhooks')}</span>
                            <span className="font-medium text-green-600 dark:text-green-400">{t('dashboard.activeWebhooks')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">{t('dashboard.automationSuccessRate')}</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">{stats?.successRate || 0}%</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center items-center text-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{t('dashboard.connectMore')}</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{t('dashboard.connectMoreSubtitle')}</p>
                    <a
                        href="/accounts"
                        className="text-primary dark:text-blue-400 font-medium hover:underline text-sm"
                    >
                        {t('dashboard.manageAccounts')} →
                    </a>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
