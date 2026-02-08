import { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    MessageSquare,
    Search,
    Send,
    Loader2,
    MessageCircle,
    Instagram,
    Facebook,
    Filter,
    ChevronLeft,
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    Image,
    ChevronDown,
    HelpCircle,
    AlertTriangle,
    X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CommentContact {
    id: string;
    name: string;
    username: string;
    avatar: string;
    platform: string;
    platformUserId: string;
    socialAccountId: string;
}

interface CommentPost {
    id: string | null;
    content: string | null;
    mediaUrl: string | null;
    thumbnailUrl: string | null;
    platformPostId: string | null;
}

interface Comment {
    id: string;
    content: string;
    externalId: string;
    postId: string;
    repliedAt: string | null;
    createdAt: string;
    contact: CommentContact;
}

interface CommentGroup {
    postId: string | null;
    commentCount: number;
    post: CommentPost | null;
    comments: Comment[];
}

interface Stats {
    totalComments: number;
    unreplied: number;
    repliedToday: number;
    commentsToday: number;
}

interface Account {
    id: string;
    platform: string;
    accountName: string;
    accountUsername: string;
    profilePictureUrl: string;
}

const PREVIEW_LIMIT = 5;

const CommentsPage = () => {
    const { t } = useTranslation();
    const [groups, setGroups] = useState<CommentGroup[]>([]);
    const [stats, setStats] = useState<Stats>({ totalComments: 0, unreplied: 0, repliedToday: 0, commentsToday: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [accounts, setAccounts] = useState<Account[]>([]);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'unreplied' | 'replied'>('all');
    const [platformFilter, setPlatformFilter] = useState('');
    const [accountFilter, setAccountFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Expanded groups (show all comments)
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Reply/DM state
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [dmToId, setDmToId] = useState<string | null>(null);
    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [dmErrorModal, setDmErrorModal] = useState<{ show: boolean; username?: string } | null>(null);

    const fetchComments = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: Record<string, string> = {
                page: String(page),
                limit: '10',
            };
            if (statusFilter !== 'all') params.status = statusFilter;
            if (search) params.search = search;
            if (accountFilter) params.accountId = accountFilter;
            if (platformFilter) params.platform = platformFilter;
            if (dateFrom) params.dateFrom = dateFrom;
            if (dateTo) params.dateTo = dateTo;

            const { data } = await api.get('/comments', { params });
            setGroups(data.groups || []);
            setTotalPages(data.pages || 1);
        } catch (err) {
            console.error('Erro ao buscar comentários', err);
        } finally {
            setIsLoading(false);
        }
    }, [page, statusFilter, search, accountFilter, platformFilter, dateFrom, dateTo]);

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await api.get('/comments/stats');
            setStats(data);
        } catch (err) {
            console.error('Erro ao buscar stats', err);
        }
    }, []);

    const fetchAccounts = useCallback(async () => {
        try {
            const { data } = await api.get('/social-accounts');
            setAccounts(data);
        } catch (err) {
            console.error('Erro ao buscar contas', err);
        }
    }, []);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [statusFilter, search, accountFilter, platformFilter, dateFrom, dateTo]);

    const handleReply = async (id: string) => {
        if (!messageText.trim()) return;
        setIsSending(true);
        try {
            await api.post(`/comments/${id}/reply`, { message: messageText });
            setMessageText('');
            setReplyingToId(null);
            fetchComments();
            fetchStats();
        } catch (err) {
            console.error('Erro ao responder', err);
        } finally {
            setIsSending(false);
        }
    };

    const handleDm = async (id: string, username?: string) => {
        if (!messageText.trim()) return;
        setIsSending(true);
        try {
            await api.post(`/comments/${id}/dm`, { message: messageText });
            setMessageText('');
            setDmToId(null);
        } catch (err) {
            console.error('Erro ao enviar DM', err);
            setDmToId(null);
            setMessageText('');
            setDmErrorModal({ show: true, username: username || '' });
        } finally {
            setIsSending(false);
        }
    };

    const toggleGroupExpand = (postId: string | null) => {
        const key = postId || '__no_post__';
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const PlatformIcon = ({ platform }: { platform: string }) => {
        if (platform === 'instagram') return <Instagram className="w-4 h-4 text-pink-500" />;
        if (platform === 'facebook') return <Facebook className="w-4 h-4 text-blue-600" />;
        return <MessageSquare className="w-4 h-4 text-gray-400" />;
    };

    const statCards = [
        { label: t('commentsPage.total'), value: stats.totalComments, icon: MessageSquare, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
        { label: t('commentsPage.unreplied'), value: stats.unreplied, icon: AlertCircle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
        { label: t('commentsPage.repliedToday'), value: stats.repliedToday, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30' },
        { label: t('commentsPage.commentsToday'), value: stats.commentsToday, icon: Clock, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
    ];

    const renderComment = (comment: Comment) => (
        <div key={comment.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start gap-3">
                {/* Avatar */}
                {comment.contact.avatar ? (
                    <img
                        src={comment.contact.avatar}
                        alt={comment.contact.name || comment.contact.username}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-300 text-xs font-medium flex-shrink-0">
                        {(comment.contact.name || comment.contact.username || '?')[0].toUpperCase()}
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    {/* Name + time + status */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-foreground">
                            {comment.contact.name || comment.contact.username || t('common.user')}
                        </span>
                        <PlatformIcon platform={comment.contact.platform} />
                        <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(comment.createdAt), {
                                addSuffix: true,
                                locale: ptBR,
                            })}
                        </span>
                        <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                comment.repliedAt
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            }`}
                        >
                            {comment.repliedAt ? t('commentsPage.replied') : t('commentsPage.unreplied')}
                        </span>
                    </div>

                    {/* Comment text */}
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                        "{comment.content}"
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-2">
                        <button
                            onClick={() => {
                                setReplyingToId(replyingToId === comment.id ? null : comment.id);
                                setDmToId(null);
                                setMessageText('');
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                replyingToId === comment.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            <MessageCircle className="w-3.5 h-3.5" />
                            {t('commentsPage.reply')}
                        </button>
                        <button
                            onClick={() => {
                                setDmToId(dmToId === comment.id ? null : comment.id);
                                setReplyingToId(null);
                                setMessageText('');
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                dmToId === comment.id
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            <Send className="w-3.5 h-3.5" />
                            DM
                        </button>
                    </div>

                    {/* Inline reply/DM input */}
                    {(replyingToId === comment.id || dmToId === comment.id) && (
                        <div className="flex gap-2 mt-2">
                            <input
                                type="text"
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (replyingToId === comment.id) handleReply(comment.id);
                                        else handleDm(comment.id, comment.contact.username);
                                    }
                                }}
                                placeholder={
                                    replyingToId === comment.id
                                        ? t('commentsPage.writeReply')
                                        : t('commentsPage.writeDm')
                                }
                                className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                            />
                            <button
                                onClick={() => {
                                    if (replyingToId === comment.id) handleReply(comment.id);
                                    else handleDm(comment.id, comment.contact.username);
                                }}
                                disabled={isSending || !messageText.trim()}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                                {isSending ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Send className="w-3.5 h-3.5" />
                                )}
                                {t('common.send')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderGroup = (group: CommentGroup) => {
        const groupKey = group.postId || '__no_post__';
        const isExpanded = expandedGroups.has(groupKey);
        const visibleComments = isExpanded ? group.comments : group.comments.slice(0, PREVIEW_LIMIT);
        const hasMore = group.comments.length > PREVIEW_LIMIT;

        return (
            <div
                key={groupKey}
                className="glass-card rounded-xl overflow-hidden"
            >
                {/* Post header */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    {group.post ? (
                        <>
                            {group.post.thumbnailUrl || group.post.mediaUrl ? (
                                <img
                                    src={group.post.thumbnailUrl || group.post.mediaUrl!}
                                    alt="Post"
                                    className="w-[60px] h-[60px] rounded-lg object-cover flex-shrink-0"
                                />
                            ) : (
                                <div className="w-[60px] h-[60px] rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                                    <Image className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                    {group.post.content || t('commentsPage.noCaption')}
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-[60px] h-[60px] rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                                <HelpCircle className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-muted-foreground italic">
                                    {t('commentsPage.unidentifiedPost')}
                                </p>
                            </div>
                        </>
                    )}
                    <div className="flex-shrink-0 text-right">
                        <span className="text-lg font-bold text-foreground">
                            {group.commentCount}
                        </span>
                        <p className="text-xs text-muted-foreground">
                            {group.commentCount === 1 ? t('commentsPage.comment') : t('commentsPage.commentsPlural')}
                        </p>
                    </div>
                </div>

                {/* Comments list */}
                <div className="p-4 divide-y divide-gray-100 dark:divide-gray-700">
                    {visibleComments.map(renderComment)}
                </div>

                {/* Expand button */}
                {hasMore && (
                    <div className="px-4 pb-3">
                        <button
                            onClick={() => toggleGroupExpand(group.postId)}
                            className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                        >
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            {isExpanded
                                ? t('commentsPage.showLess')
                                : t('commentsPage.seeAll', { count: group.comments.length })}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between page-header-accent animate-fade-in-up">
                <h1 className="text-2xl font-bold text-foreground">{t('commentsPage.title')}</h1>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCards.map((card) => (
                    <div key={card.label} className="glass-card p-4 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${card.bg}`}>
                                <card.icon className={`w-5 h-5 ${card.color}`} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">
                                    {card.value.toLocaleString('pt-BR')}
                                </p>
                                <p className="text-xs text-muted-foreground">{card.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="glass-card p-4 rounded-xl space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('commentsPage.searchPlaceholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Status tabs */}
                    <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                        {(['all', 'unreplied', 'replied'] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${
                                    statusFilter === s
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                }`}
                            >
                                {s === 'all' ? t('commentsPage.allStatus') : s === 'unreplied' ? t('commentsPage.unrepliedStatus') : t('commentsPage.repliedStatus')}
                            </button>
                        ))}
                    </div>

                    {/* Toggle filters */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        <Filter className="w-4 h-4" />
                        {t('common.filters')}
                    </button>
                </div>

                {/* Expanded filters */}
                {showFilters && (
                    <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <select
                            value={accountFilter}
                            onChange={(e) => setAccountFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground text-sm"
                        >
                            <option value="">{t('commentsPage.allAccounts')}</option>
                            {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.accountName || acc.accountUsername} ({acc.platform})
                                </option>
                            ))}
                        </select>

                        <select
                            value={platformFilter}
                            onChange={(e) => setPlatformFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground text-sm"
                        >
                            <option value="">{t('commentsPage.allPlatforms')}</option>
                            <option value="instagram">Instagram</option>
                            <option value="facebook">Facebook</option>
                        </select>

                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            placeholder="Data início"
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground text-sm"
                        />
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            placeholder="Data fim"
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground text-sm"
                        />
                    </div>
                )}
            </div>

            {/* Grouped Comments */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : groups.length === 0 ? (
                <div className="glass-card rounded-xl p-12 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-muted-foreground">{t('commentsPage.noComments')}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {groups.map(renderGroup)}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        {t('common.previous')}
                    </button>
                    <span className="text-sm text-muted-foreground">
                        {page}/{totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('common.next')}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* DM Error Modal - Meta 24h window */}
            {dmErrorModal?.show && (
                <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
                    <div className="glass-card-static rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b bg-gradient-to-r from-orange-500 to-red-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-8 h-8 text-white" />
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{t('commentsPage.metaLimitation')}</h3>
                                        <p className="text-white/80 text-sm">{t('commentsPage.window24hExpired')}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDmErrorModal(null)}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                {t('commentsPage.metaLimitationMsg')}
                            </p>
                            {dmErrorModal.username && (
                                <a
                                    href={`https://ig.me/m/${dmErrorModal.username}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium"
                                >
                                    <Instagram className="w-5 h-5" />
                                    {t('commentsPage.openDmWith')} @{dmErrorModal.username}
                                </a>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-end">
                            <button
                                onClick={() => setDmErrorModal(null)}
                                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            >
                                {t('common.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommentsPage;
