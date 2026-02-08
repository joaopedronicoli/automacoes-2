import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import api from '../../services/api';
import { Loader2, Users, DollarSign, Receipt, TrendingDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts';

interface SubscriptionReport {
    totalSubscribers: number;
    mrr: number;
    averageTicket: number;
    churnRate: number;
    planDistribution: { planName: string; count: number; revenue: number }[];
    statusDistribution: { status: string; count: number }[];
    monthlyTrend: { month: string; revenue: number; subscribers: number }[];
    subscriptions: {
        userId: string;
        userName: string;
        userEmail: string;
        planName: string;
        planPrice: number;
        stripeStatus: string;
        stripeSubscriptionId: string | null;
        subscribedAt: string;
        updatedAt: string;
    }[];
}

const PLAN_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8'];
const STATUS_COLORS: Record<string, string> = {
    active: '#22c55e',
    past_due: '#f59e0b',
    canceled: '#ef4444',
    incomplete: '#6b7280',
    none: '#9ca3af',
};

const PAGE_SIZE = 10;

const SubscriptionsPage = () => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [report, setReport] = useState<SubscriptionReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser && currentUser.role !== 'admin') {
            navigate('/');
        }
    }, [currentUser, navigate]);

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        try {
            const { data } = await api.get('/admin/subscriptions/report');
            setReport(data);
        } catch {
            setError('Failed to load report');
        } finally {
            setIsLoading(false);
        }
    };

    const filtered = useMemo(() => {
        if (!report) return [];
        if (!search.trim()) return report.subscriptions;
        const q = search.toLowerCase();
        return report.subscriptions.filter(
            (s) => s.userName.toLowerCase().includes(q) || s.userEmail.toLowerCase().includes(q),
        );
    }, [report, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    useEffect(() => {
        setPage(1);
    }, [search]);

    const statusLabel = (status: string) => {
        const map: Record<string, string> = {
            active: t('adminSubs.statusActive'),
            past_due: t('adminSubs.statusPastDue'),
            canceled: t('adminSubs.statusCanceled'),
            incomplete: t('adminSubs.statusIncomplete'),
            none: t('adminSubs.statusNone'),
        };
        return map[status] || status;
    };

    const statusColor = (status: string) => {
        const map: Record<string, string> = {
            active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            past_due: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            canceled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            incomplete: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
            none: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
        };
        return map[status] || map.none;
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const formatMonth = (month: string) => {
        const [year, m] = month.split('-');
        const date = new Date(Number(year), Number(m) - 1);
        return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    };

    const chartTextColor = isDark ? '#9ca3af' : '#6b7280';
    const gridColor = isDark ? '#374151' : '#e5e7eb';

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                {error || 'No data'}
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {t('adminSubs.title')}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('adminSubs.subtitle')}
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    icon={Users}
                    iconColor="text-indigo-600 dark:text-indigo-400"
                    iconBg="bg-indigo-100 dark:bg-indigo-900/30"
                    label={t('adminSubs.totalSubscribers')}
                    value={report.totalSubscribers.toString()}
                />
                <KpiCard
                    icon={DollarSign}
                    iconColor="text-emerald-600 dark:text-emerald-400"
                    iconBg="bg-emerald-100 dark:bg-emerald-900/30"
                    label={t('adminSubs.mrr')}
                    value={formatCurrency(report.mrr)}
                    sub={t('adminSubs.perMonth')}
                />
                <KpiCard
                    icon={Receipt}
                    iconColor="text-amber-600 dark:text-amber-400"
                    iconBg="bg-amber-100 dark:bg-amber-900/30"
                    label={t('adminSubs.averageTicket')}
                    value={formatCurrency(report.averageTicket)}
                />
                <KpiCard
                    icon={TrendingDown}
                    iconColor="text-rose-600 dark:text-rose-400"
                    iconBg="bg-rose-100 dark:bg-rose-900/30"
                    label={t('adminSubs.churnRate')}
                    value={`${report.churnRate}%`}
                    sub={t('adminSubs.last30days')}
                />
            </div>

            {/* Monthly Revenue Chart */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {t('adminSubs.monthlyRevenue')}
                </h2>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={report.monthlyTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis
                                dataKey="month"
                                tickFormatter={formatMonth}
                                tick={{ fill: chartTextColor, fontSize: 12 }}
                            />
                            <YAxis tick={{ fill: chartTextColor, fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: isDark ? '#1f2937' : '#fff',
                                    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                                    borderRadius: '12px',
                                    color: isDark ? '#e5e7eb' : '#1f2937',
                                }}
                                formatter={(value: any) => [formatCurrency(Number(value)), t('adminSubs.monthlyRevenue')]}
                                labelFormatter={(label: any) => formatMonth(String(label))}
                            />
                            <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Pie Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Plan Distribution */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        {t('adminSubs.planDistribution')}
                    </h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={report.planDistribution}
                                    dataKey="count"
                                    nameKey="planName"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    label={({ name, value }: any) => `${name} (${value})`}
                                >
                                    {report.planDistribution.map((_, i) => (
                                        <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDark ? '#1f2937' : '#fff',
                                        border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                                        borderRadius: '12px',
                                        color: isDark ? '#e5e7eb' : '#1f2937',
                                    }}
                                />
                                <Legend
                                    formatter={(value) => (
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Distribution */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        {t('adminSubs.statusDistribution')}
                    </h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={report.statusDistribution}
                                    dataKey="count"
                                    nameKey="status"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    label={({ name, value }: any) => `${statusLabel(name)} (${value})`}
                                >
                                    {report.statusDistribution.map((entry) => (
                                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#9ca3af'} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDark ? '#1f2937' : '#fff',
                                        border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                                        borderRadius: '12px',
                                        color: isDark ? '#e5e7eb' : '#1f2937',
                                    }}
                                    formatter={(value: any, name: any) => [value, statusLabel(String(name))]}
                                />
                                <Legend
                                    formatter={(value) => (
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{statusLabel(value)}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Subscriptions Table */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {t('adminSubs.allSubscriptions')}
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('adminSubs.searchPlaceholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 w-full sm:w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-gray-500 dark:text-gray-400">
                                <th className="pb-3 font-medium">{t('adminSubs.name')}</th>
                                <th className="pb-3 font-medium">{t('adminSubs.email')}</th>
                                <th className="pb-3 font-medium">{t('adminSubs.plan')}</th>
                                <th className="pb-3 font-medium">{t('adminSubs.value')}</th>
                                <th className="pb-3 font-medium">{t('adminSubs.status')}</th>
                                <th className="pb-3 font-medium">{t('adminSubs.subscribedAt')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-gray-400 dark:text-gray-500">
                                        {t('adminSubs.noSubscriptions')}
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((sub) => (
                                    <tr key={sub.userId} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                        <td className="py-3 text-gray-900 dark:text-gray-100 font-medium">{sub.userName || '-'}</td>
                                        <td className="py-3 text-gray-600 dark:text-gray-400">{sub.userEmail}</td>
                                        <td className="py-3 text-gray-700 dark:text-gray-300">{sub.planName}</td>
                                        <td className="py-3 text-gray-700 dark:text-gray-300">{formatCurrency(sub.planPrice)}</td>
                                        <td className="py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(sub.stripeStatus)}`}>
                                                {statusLabel(sub.stripeStatus)}
                                            </span>
                                        </td>
                                        <td className="py-3 text-gray-500 dark:text-gray-400">
                                            {new Date(sub.subscribedAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                    {paginated.length === 0 ? (
                        <p className="py-12 text-center text-gray-400 dark:text-gray-500">
                            {t('adminSubs.noSubscriptions')}
                        </p>
                    ) : (
                        paginated.map((sub) => (
                            <div key={sub.userId} className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{sub.userName || '-'}</span>
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(sub.stripeStatus)}`}>
                                        {statusLabel(sub.stripeStatus)}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{sub.userEmail}</p>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">{sub.planName}</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(sub.planPrice)}</span>
                                </div>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {t('adminSubs.subscribedAt')}: {new Date(sub.subscribedAt).toLocaleDateString()}
                                </p>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {t('common.page')} {page} {t('common.of')} {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const KpiCard = ({ icon: Icon, iconColor, iconBg, label, value, sub }: {
    icon: any; iconColor: string; iconBg: string; label: string; value: string; sub?: string;
}) => (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {label}
            {sub && <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">{sub}</span>}
        </p>
    </div>
);

export default SubscriptionsPage;
