import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
    Activity,
    MessageSquare,
    ThumbsUp,
    Users,
    TrendingUp,
    TrendingDown,
    Minus,
    Zap,
    ArrowRight,
    CheckCircle2,
    XCircle,
    Clock,
    Send,
    MessageCircle,
    BarChart3,
    Link2,
    Bot,
    Sparkles,
    CheckCircle,
    Wifi,
    Shield,
} from 'lucide-react';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';

interface DashboardStats {
    totalComments: number;
    totalLikes: number;
    automationsRun: number;
    successRate: number;
    reach: number;
    trends: {
        comments: number;
        likes: number;
        automations: number;
    };
}

interface LogEntry {
    id: string;
    actionType: string;
    status: string;
    userName?: string;
    userUsername?: string;
    content?: string;
    executedAt: string;
    automation?: { name: string };
}

const TrendBadge = ({ value }: { value: number | undefined }) => {
    if (value === undefined || value === null) return null;

    const isPositive = value > 0;
    const isZero = value === 0;
    const Icon = isZero ? Minus : isPositive ? TrendingUp : TrendingDown;

    return (
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
            isZero
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                : isPositive
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400'
        }`}>
            <Icon className="w-3 h-3" />
            {isPositive ? '+' : ''}{value}%
        </div>
    );
};

const ACTION_ICONS: Record<string, typeof MessageSquare> = {
    comment_reply: MessageCircle,
    dm_sent: Send,
    instagram_dm_received: MessageSquare,
    instagram_dm_forwarded: Send,
    chatwoot_message_sent: MessageSquare,
    skipped: Clock,
    error: XCircle,
};

const DashboardPage = () => {
    const { t } = useTranslation();
    const user = useSelector((state: any) => state.auth.user);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, logsRes] = await Promise.all([
                    api.get('/stats/dashboard'),
                    api.get('/logs?limit=6').catch(() => ({ data: [] })),
                ]);
                setStats(statsRes.data);
                setRecentLogs(logsRes.data);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('dashboard.goodMorning');
        if (hour < 18) return t('dashboard.goodAfternoon');
        return t('dashboard.goodEvening');
    };

    const firstName = user?.name?.split(' ')[0] || '';

    const formatTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return t('dashboard.justNow');
        if (mins < 60) return `${mins}min`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-gray-800" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
                </div>
            </div>
        );
    }

    const statCards = [
        {
            icon: MessageSquare,
            label: t('dashboard.totalComments'),
            value: stats?.totalComments || 0,
            trend: stats?.trends?.comments,
            color: 'violet',
            iconBg: 'bg-violet-100 dark:bg-violet-950/50',
            iconColor: 'text-violet-600 dark:text-violet-400',
        },
        {
            icon: ThumbsUp,
            label: t('dashboard.totalLikes'),
            value: stats?.totalLikes || 0,
            trend: stats?.trends?.likes,
            color: 'rose',
            iconBg: 'bg-rose-100 dark:bg-rose-950/50',
            iconColor: 'text-rose-600 dark:text-rose-400',
        },
        {
            icon: Zap,
            label: t('dashboard.automationsRun'),
            value: stats?.automationsRun || 0,
            trend: stats?.trends?.automations,
            color: 'amber',
            iconBg: 'bg-amber-100 dark:bg-amber-950/50',
            iconColor: 'text-amber-600 dark:text-amber-400',
        },
        {
            icon: Users,
            label: t('dashboard.potentialReach'),
            value: stats?.reach || 0,
            trend: undefined,
            color: 'cyan',
            iconBg: 'bg-cyan-100 dark:bg-cyan-950/50',
            iconColor: 'text-cyan-600 dark:text-cyan-400',
        },
    ];

    const quickActions = [
        {
            icon: Link2,
            label: t('dashboard.actionConnect'),
            desc: t('dashboard.actionConnectDesc'),
            href: '/accounts',
            color: 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
        },
        {
            icon: Bot,
            label: t('dashboard.actionAutomation'),
            desc: t('dashboard.actionAutomationDesc'),
            href: '/automations',
            color: 'bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400',
        },
        {
            icon: Send,
            label: t('dashboard.actionBroadcast'),
            desc: t('dashboard.actionBroadcastDesc'),
            href: '/broadcast',
            color: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
        },
    ];

    const successRate = stats?.successRate || 0;
    const circumference = 2 * Math.PI * 36;
    const strokeDashoffset = circumference - (successRate / 100) * circumference;

    return (
        <div className="space-y-6">
            {/* ─── Welcome Header ─── */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                        {getGreeting()}{firstName ? `, ${firstName}` : ''} <span className="inline-block animate-[wave_2s_ease-in-out_infinite] origin-[70%_70%]">👋</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.subtitle')}</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    {t('dashboard.allSystemsOperational')}
                </div>
            </div>

            {/* ─── Stat Cards ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={i}
                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.iconBg}`}>
                                    <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                                </div>
                                <TrendBadge value={stat.trend} />
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{stat.label}</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1 tracking-tight">
                                {stat.value.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('dashboard.last7days')}</p>
                        </div>
                    );
                })}
            </div>

            {/* ─── Middle Row: Success Rate + Quick Actions ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Success Rate Gauge */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('dashboard.automationSuccessRate')}</p>
                    <div className="relative w-24 h-24">
                        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="6"
                                className="text-gray-100 dark:text-gray-800" />
                            <circle cx="40" cy="40" r="36" fill="none" strokeWidth="6" strokeLinecap="round"
                                className="text-emerald-500"
                                style={{
                                    strokeDasharray: circumference,
                                    strokeDashoffset,
                                    transition: 'stroke-dashoffset 1s ease-out',
                                }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{successRate}%</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            {t('dashboard.success')}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700" />
                            {t('dashboard.errors')}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.quickActions')}</h2>
                        <Sparkles className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {quickActions.map((action, i) => {
                            const ActionIcon = action.icon;
                            return (
                                <Link
                                    key={i}
                                    to={action.href}
                                    className="group flex flex-col gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all duration-200"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${action.color}`}>
                                            <ActionIcon className="w-4.5 h-4.5" />
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{action.label}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{action.desc}</p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ─── Bottom Row: Recent Activity + System Status ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.recentActivity')}</h2>
                        <Link to="/logs" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                            {t('dashboard.viewAll')}
                        </Link>
                    </div>

                    {recentLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                                <Activity className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.noActivityYet')}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('dashboard.noActivityDesc')}</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {recentLogs.map((log) => {
                                const LogIcon = ACTION_ICONS[log.actionType] || Activity;
                                const isSuccess = log.status === 'success';

                                return (
                                    <div key={log.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                            isSuccess
                                                ? 'bg-emerald-50 dark:bg-emerald-950/40'
                                                : 'bg-red-50 dark:bg-red-950/40'
                                        }`}>
                                            <LogIcon className={`w-4 h-4 ${
                                                isSuccess
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-red-600 dark:text-red-400'
                                            }`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                                                {log.userUsername
                                                    ? <span className="font-medium">@{log.userUsername}</span>
                                                    : <span className="font-medium">{t(`dashboard.action_${log.actionType}`)}</span>
                                                }
                                                {log.userUsername && (
                                                    <span className="text-gray-500 dark:text-gray-400"> — {t(`dashboard.action_${log.actionType}`)}</span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {isSuccess ? (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                            ) : (
                                                <XCircle className="w-3.5 h-3.5 text-red-500" />
                                            )}
                                            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                                                {formatTimeAgo(log.executedAt)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* System Status */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.systemStatus')}</h2>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {t('dashboard.operational')}
                        </span>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                                <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('dashboard.apiStatus')}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">{t('dashboard.online')}</p>
                            </div>
                            <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('dashboard.webhooks')}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">{t('dashboard.activeWebhooks')}</p>
                            </div>
                            <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center">
                                <Shield className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('dashboard.security')}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">{t('dashboard.encryptedData')}</p>
                            </div>
                            <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                        </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="w-4 h-4 text-gray-400" />
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.uptime')}</p>
                                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">99.9%</p>
                                </div>
                                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '99.9%' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
