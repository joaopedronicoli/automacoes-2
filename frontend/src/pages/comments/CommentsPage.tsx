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
} from 'lucide-react';

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
    post: CommentPost | null;
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

const CommentsPage = () => {
    const [comments, setComments] = useState<Comment[]>([]);
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

    // Reply/DM state
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [dmToId, setDmToId] = useState<string | null>(null);
    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);

    const fetchComments = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: Record<string, string> = {
                page: String(page),
                limit: '20',
            };
            if (statusFilter !== 'all') params.status = statusFilter;
            if (search) params.search = search;
            if (accountFilter) params.accountId = accountFilter;
            if (platformFilter) params.platform = platformFilter;
            if (dateFrom) params.dateFrom = dateFrom;
            if (dateTo) params.dateTo = dateTo;

            const { data } = await api.get('/comments', { params });
            setComments(data.comments);
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

    const handleDm = async (id: string) => {
        if (!messageText.trim()) return;
        setIsSending(true);
        try {
            await api.post(`/comments/${id}/dm`, { message: messageText });
            setMessageText('');
            setDmToId(null);
        } catch (err) {
            console.error('Erro ao enviar DM', err);
        } finally {
            setIsSending(false);
        }
    };

    const PlatformIcon = ({ platform }: { platform: string }) => {
        if (platform === 'instagram') return <Instagram className="w-4 h-4 text-pink-500" />;
        if (platform === 'facebook') return <Facebook className="w-4 h-4 text-blue-600" />;
        return <MessageSquare className="w-4 h-4 text-gray-400" />;
    };

    const statCards = [
        { label: 'Total', value: stats.totalComments, icon: MessageSquare, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
        { label: 'Sem resposta', value: stats.unreplied, icon: AlertCircle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
        { label: 'Respondidos hoje', value: stats.repliedToday, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30' },
        { label: 'Comentários hoje', value: stats.commentsToday, icon: Clock, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Comentários</h1>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCards.map((card) => (
                    <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${card.bg}`}>
                                <card.icon className={`w-5 h-5 ${card.color}`} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {card.value.toLocaleString('pt-BR')}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por conteúdo, nome ou username..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                {s === 'all' ? 'Todos' : s === 'unreplied' ? 'Sem resposta' : 'Respondidos'}
                            </button>
                        ))}
                    </div>

                    {/* Toggle filters */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        <Filter className="w-4 h-4" />
                        Filtros
                    </button>
                </div>

                {/* Expanded filters */}
                {showFilters && (
                    <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <select
                            value={accountFilter}
                            onChange={(e) => setAccountFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        >
                            <option value="">Todas as contas</option>
                            {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.accountName || acc.accountUsername} ({acc.platform})
                                </option>
                            ))}
                        </select>

                        <select
                            value={platformFilter}
                            onChange={(e) => setPlatformFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        >
                            <option value="">Todas plataformas</option>
                            <option value="instagram">Instagram</option>
                            <option value="facebook">Facebook</option>
                        </select>

                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            placeholder="Data início"
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        />
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            placeholder="Data fim"
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        />
                    </div>
                )}
            </div>

            {/* Comments List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : comments.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">Nenhum comentário encontrado</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {comments.map((comment) => (
                        <div
                            key={comment.id}
                            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    {comment.contact.avatar ? (
                                        <img
                                            src={comment.contact.avatar}
                                            alt={comment.contact.name || comment.contact.username}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-300 font-medium">
                                            {(comment.contact.name || comment.contact.username || '?')[0].toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                                {comment.contact.name || comment.contact.username || 'Usuário'}
                                            </span>
                                            <PlatformIcon platform={comment.contact.platform} />
                                            <span className="text-xs text-gray-400">
                                                {formatDistanceToNow(new Date(comment.createdAt), {
                                                    addSuffix: true,
                                                    locale: ptBR,
                                                })}
                                            </span>
                                        </div>
                                        {comment.contact.username && comment.contact.name && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                @{comment.contact.username}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        comment.repliedAt
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                    }`}
                                >
                                    {comment.repliedAt ? 'Respondido' : 'Sem resposta'}
                                </span>
                            </div>

                            {/* Comment content */}
                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                                "{comment.content}"
                            </p>

                            {/* Post reference */}
                            {comment.post && (
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
                                    {comment.post.thumbnailUrl || comment.post.mediaUrl ? (
                                        <img
                                            src={comment.post.thumbnailUrl || comment.post.mediaUrl!}
                                            alt="Post"
                                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                                        />
                                    ) : (
                                        <Image className="w-4 h-4 flex-shrink-0" />
                                    )}
                                    <span className="truncate">
                                        Post: {comment.post.content ? comment.post.content.substring(0, 80) + (comment.post.content.length > 80 ? '...' : '') : 'Publicação'}
                                    </span>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setReplyingToId(replyingToId === comment.id ? null : comment.id);
                                        setDmToId(null);
                                        setMessageText('');
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                        replyingToId === comment.id
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    Responder
                                </button>
                                <button
                                    onClick={() => {
                                        setDmToId(dmToId === comment.id ? null : comment.id);
                                        setReplyingToId(null);
                                        setMessageText('');
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                        dmToId === comment.id
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    <Send className="w-4 h-4" />
                                    Enviar DM
                                </button>
                            </div>

                            {/* Inline reply input */}
                            {(replyingToId === comment.id || dmToId === comment.id) && (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                if (replyingToId === comment.id) handleReply(comment.id);
                                                else handleDm(comment.id);
                                            }
                                        }}
                                        placeholder={
                                            replyingToId === comment.id
                                                ? 'Escreva sua resposta ao comentário...'
                                                : 'Escreva sua mensagem direta...'
                                        }
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => {
                                            if (replyingToId === comment.id) handleReply(comment.id);
                                            else handleDm(comment.id);
                                        }}
                                        disabled={isSending || !messageText.trim()}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isSending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                        Enviar
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
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
                        Anterior
                    </button>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {page}/{totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Próximo
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default CommentsPage;
