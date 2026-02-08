import { useEffect, useState } from 'react';
import { Activity, MessageSquare, ThumbsUp, Users, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';

const StatCard = ({ icon: Icon, label, value, trend, index }: any) => (
    <div
        className="glass-card p-6 rounded-xl animate-fade-in-up"
        style={{ animationDelay: `${index * 0.1}s` }}
    >
        <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg text-indigo-600 dark:text-indigo-400" style={{ background: 'var(--stat-icon-bg)' }}>
                <Icon className="w-6 h-6" />
            </div>
            {trend !== undefined && (
                <span className={`text-sm font-medium ${trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {trend > 0 ? '+' : ''}{trend}%
                </span>
            )}
        </div>
        <h3 className="text-muted-foreground text-sm font-medium">{label}</h3>
        <p className="text-2xl font-bold text-foreground mt-1">{value?.toLocaleString() || '0'}</p>
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
            <div className="page-header-accent animate-fade-in-up">
                <h1 className="text-2xl font-bold text-foreground">{t('dashboard.title')}</h1>
                <p className="text-muted-foreground">{t('dashboard.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {statItems.map((stat, i) => (
                    <StatCard key={i} {...stat} index={i} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <div className="glass-card p-6 rounded-xl animate-fade-in-up stagger-3">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-foreground">{t('dashboard.systemStatus')}</h2>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-xs rounded-full font-medium animate-pulse-glow">{t('dashboard.operational')}</span>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('dashboard.apiStatus')}</span>
                            <span className="font-medium text-green-600 dark:text-green-400">{t('dashboard.online')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('dashboard.webhooks')}</span>
                            <span className="font-medium text-green-600 dark:text-green-400">{t('dashboard.activeWebhooks')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('dashboard.automationSuccessRate')}</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">{stats?.successRate || 0}%</span>
                        </div>
                    </div>
                </div>

                <div className="glass-card gradient-border p-6 rounded-xl flex flex-col justify-center items-center text-center animate-fade-in-up stagger-4">
                    <h2 className="text-lg font-bold text-foreground mb-2">{t('dashboard.connectMore')}</h2>
                    <p className="text-muted-foreground text-sm mb-4">{t('dashboard.connectMoreSubtitle')}</p>
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
