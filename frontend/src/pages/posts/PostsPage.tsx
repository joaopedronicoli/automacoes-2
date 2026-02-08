import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Facebook, Instagram, MessageCircle, Share2, ThumbsUp, Calendar, RefreshCw, Zap, Play, X, Send, Reply, Mail, Filter, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface SocialAccount {
    id: string;
    platform: string;
    accountName: string;
    accountId: string;
}

interface CommentReply {
    id: string;
    text?: string;
    message?: string;
    from: {
        id: string;
        username?: string;
        name?: string;
    };
    timestamp?: string;
    created_time?: string;
}

interface Comment {
    id: string;
    text?: string;
    message?: string;
    from: {
        id: string;
        username?: string;
        name?: string;
    };
    timestamp?: string;
    created_time?: string;
    like_count?: number;
    replies?: { data: CommentReply[] };
    comments?: { data: CommentReply[] };
}

const PostsPage = () => {
    const { t } = useTranslation();
    const [posts, setPosts] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<SocialAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string; username?: string; name?: string } | null>(null);
    const [dmTo, setDmTo] = useState<{ id: string; fromId: string; username?: string; name?: string } | null>(null);
    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [dmErrorModal, setDmErrorModal] = useState<{ show: boolean; username?: string } | null>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [platformFilter, setPlatformFilter] = useState<string>('');
    const [accountFilter, setAccountFilter] = useState<string>('');
    const [showFilters, setShowFilters] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        fetchAccounts();
    }, []);

    useEffect(() => {
        fetchPosts();
    }, [page]);

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/social-accounts');
            setAccounts(res.data);
        } catch (error) {
            console.error('Erro ao carregar contas:', error);
        }
    };

    // Filter posts based on selected filters (client-side since backend already paginates)
    const filteredPosts = useMemo(() => {
        return posts.filter((post) => {
            if (platformFilter && post.socialAccount?.platform !== platformFilter) {
                return false;
            }
            if (accountFilter && post.socialAccount?.id !== accountFilter) {
                return false;
            }
            return true;
        });
    }, [posts, platformFilter, accountFilter]);

    // Get unique platforms from accounts
    const platforms = useMemo(() => {
        const uniquePlatforms = [...new Set(accounts.map(a => a.platform))];
        return uniquePlatforms;
    }, [accounts]);

    // Filter accounts by selected platform
    const filteredAccounts = useMemo(() => {
        if (!platformFilter) return accounts;
        return accounts.filter(a => a.platform === platformFilter);
    }, [accounts, platformFilter]);

    const handleCreateAutomation = (post: any) => {
        navigate('/automations/new', {
            state: {
                post: {
                    id: post.id,
                    content: post.content,
                    mediaUrl: post.mediaUrl,
                    mediaType: post.mediaType,
                    thumbnailUrl: post.thumbnailUrl,
                    platform: post.socialAccount?.platform,
                    accountName: post.socialAccount?.accountName,
                    accountId: post.socialAccount?.id,
                    publishedAt: post.publishedAt,
                    likesCount: post.likesCount,
                    commentsCount: post.commentsCount,
                }
            }
        });
    };

    const fetchPosts = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/posts', { params: { page, limit: 18 } });
            setPosts(res.data.posts || []);
            setTotalPages(res.data.pages || 1);
            setTotal(res.data.total || 0);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await api.post('/posts/sync-all');
            setPage(1);
            await fetchPosts();
        } catch (error) {
            console.error('Erro ao sincronizar:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const openComments = async (post: any) => {
        setSelectedPost(post);
        setIsLoadingComments(true);
        setComments([]);
        try {
            const res = await api.get(`/posts/${post.id}/comments`);
            setComments(res.data || []);
        } catch (error) {
            console.error('Erro ao carregar comentários:', error);
        } finally {
            setIsLoadingComments(false);
        }
    };

    const closeComments = () => {
        setSelectedPost(null);
        setComments([]);
        setReplyingTo(null);
        setDmTo(null);
        setMessageText('');
    };

    const handleReply = async () => {
        if (!replyingTo || !messageText.trim() || !selectedPost) return;
        setIsSending(true);
        try {
            await api.post(`/posts/${selectedPost.id}/comments/${replyingTo.id}/reply`, {
                message: messageText.trim(),
            });
            setReplyingTo(null);
            setMessageText('');
            // Refresh comments
            const res = await api.get(`/posts/${selectedPost.id}/comments`);
            setComments(res.data || []);
        } catch (error) {
            console.error('Erro ao responder:', error);
            alert('Erro ao enviar resposta');
        } finally {
            setIsSending(false);
        }
    };

    const handleSendDm = async () => {
        if (!dmTo || !messageText.trim() || !selectedPost) return;
        setIsSending(true);
        try {
            await api.post(`/posts/${selectedPost.id}/dm`, {
                userId: dmTo.fromId,
                message: messageText.trim(),
            });
            setDmTo(null);
            setMessageText('');
            alert(t('contacts.messageSent'));
        } catch (error: any) {
            console.error('Erro ao enviar DM:', error);
            const username = dmTo?.username || dmTo?.name || '';
            setDmTo(null);
            setMessageText('');
            setDmErrorModal({ show: true, username });
        } finally {
            setIsSending(false);
        }
    };

    const startReply = (commentOrReply: { id: string; from: { username?: string; name?: string } }) => {
        setReplyingTo({ id: commentOrReply.id, username: commentOrReply.from?.username, name: commentOrReply.from?.name });
        setDmTo(null);
        setMessageText('');
    };

    const startDm = (commentOrReply: { from: { id: string; username?: string; name?: string } }) => {
        setDmTo({ id: commentOrReply.from.id, fromId: commentOrReply.from.id, username: commentOrReply.from?.username, name: commentOrReply.from?.name });
        setReplyingTo(null);
        setMessageText('');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between page-header-accent animate-fade-in-up">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t('posts.title')}</h1>
                    <p className="text-muted-foreground">{t('posts.subtitle')}</p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? t('posts.syncing') : t('posts.sync')}
                </button>
            </div>

            {/* Filters */}
            <div className="glass-card rounded-xl p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                            showFilters || platformFilter || accountFilter
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        {t('common.filters')}
                        {(platformFilter || accountFilter) && (
                            <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                                {[platformFilter, accountFilter].filter(Boolean).length}
                            </span>
                        )}
                    </button>

                    {(platformFilter || accountFilter) && (
                        <button
                            onClick={() => {
                                setPlatformFilter('');
                                setAccountFilter('');
                            }}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            {t('common.clearFilters')}
                        </button>
                    )}

                    <div className="ml-auto text-sm text-muted-foreground">
                        {filteredPosts.length} de {total} {t('posts.publications')}
                    </div>
                </div>

                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('common.platform')}
                            </label>
                            <select
                                value={platformFilter}
                                onChange={(e) => {
                                    setPlatformFilter(e.target.value);
                                    setAccountFilter('');
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">{t('posts.allPlatforms')}</option>
                                {platforms.map((platform) => (
                                    <option key={platform} value={platform}>
                                        {platform === 'instagram' ? 'Instagram' : 'Facebook'}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('common.account')}
                            </label>
                            <select
                                value={accountFilter}
                                onChange={(e) => setAccountFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">{t('posts.allAccounts')}</option>
                                {filteredAccounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.platform === 'instagram' ? '📸' : '📘'} {account.accountName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : filteredPosts.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-muted-foreground">
                    {posts.length === 0
                        ? t('posts.noPublications')
                        : t('posts.noPublicationsFiltered')}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPosts.map((post) => (
                            <div key={post.id} className="glass-card rounded-xl overflow-hidden flex flex-col">
                                {/* Header */}
                                <div className="p-4 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${post.socialAccount?.platform === 'facebook' ? 'bg-[#1877F2]/10 text-[#1877F2]' : 'bg-pink-100 text-pink-600'
                                        }`}>
                                        {post.socialAccount?.platform === 'facebook' ? <Facebook className="w-4 h-4" /> : <Instagram className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate text-foreground">{post.socialAccount?.accountName}</p>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Calendar className="w-3 h-3" />
                                            <span>{post.publishedAt ? format(new Date(post.publishedAt), 'dd/MM/yyyy') : t('posts.draft')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 p-4">
                                    {post.mediaUrl && (
                                        post.mediaType === 'video' ? (
                                            <div className="relative w-full h-48 rounded-md mb-3 overflow-hidden bg-black">
                                                <video
                                                    src={post.mediaUrl}
                                                    poster={post.thumbnailUrl}
                                                    controls
                                                    className="w-full h-full object-contain"
                                                    preload="metadata"
                                                />
                                                {!post.thumbnailUrl && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 pointer-events-none">
                                                        <Play className="w-12 h-12 text-white/80" />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <img
                                                src={post.mediaUrl}
                                                alt={t('posts.postContent')}
                                                className="w-full h-48 object-cover rounded-md mb-3"
                                            />
                                        )
                                    )}
                                    <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-3">{post.content}</p>
                                </div>

                                {/* Footer Stats */}
                                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-muted-foreground">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1">
                                            <ThumbsUp className="w-3 h-3" />
                                            <span>{post.likesCount || 0}</span>
                                        </div>
                                        <button
                                            onClick={() => openComments(post)}
                                            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                        >
                                            <MessageCircle className="w-3 h-3" />
                                            <span>{post.commentsCount || 0}</span>
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <Share2 className="w-3 h-3" />
                                            <span>{post.sharesCount || 0}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleCreateAutomation(post)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-medium rounded-full hover:from-purple-700 hover:to-blue-700 transition-all shadow-sm"
                                    >
                                        <Zap className="w-3 h-3" />
                                        {t('posts.createAutomation')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

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
                </>
            )}

            {/* Comments Modal */}
            {selectedPost && (
                <div
                    className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4"
                    onClick={closeComments}
                >
                    <div
                        className="glass-card-static rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-foreground">{t('posts.comments')}</h2>
                            <button
                                onClick={closeComments}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                title={t('common.close')}
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Comments List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {isLoadingComments ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                </div>
                            ) : comments.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    {t('posts.noComments')}
                                </div>
                            ) : (
                                comments.map((comment) => {
                                    const commentText = comment.text || comment.message || '';
                                    const commentTime = comment.timestamp || comment.created_time;
                                    const replies = comment.replies?.data || comment.comments?.data || [];

                                    return (
                                        <div key={comment.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm text-foreground">
                                                        {comment.from?.username || comment.from?.name || t('common.user')}
                                                    </p>
                                                    <p className="text-gray-700 dark:text-gray-300 mt-1">{commentText}</p>
                                                    {commentTime && (
                                                        <p className="text-xs text-gray-400 mt-2">
                                                            {format(new Date(commentTime), 'dd/MM/yyyy HH:mm')}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => startReply(comment)}
                                                        className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 rounded-full transition-colors"
                                                        title={t('posts.replyComment')}
                                                    >
                                                        <Reply className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => startDm(comment)}
                                                        className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 rounded-full transition-colors"
                                                        title={t('posts.sendDm')}
                                                    >
                                                        <Mail className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Replies */}
                                            {replies.length > 0 && (
                                                <div className="mt-3 ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600 space-y-3">
                                                    {replies.map((reply) => {
                                                        const replyText = reply.text || reply.message || '';
                                                        const replyTime = reply.timestamp || reply.created_time;

                                                        return (
                                                            <div key={reply.id} className="bg-white dark:bg-gray-800 rounded-lg p-3">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="flex-1">
                                                                        <p className="font-medium text-sm text-gray-600 dark:text-gray-300">
                                                                            {reply.from?.username || reply.from?.name || t('common.user')}
                                                                        </p>
                                                                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{replyText}</p>
                                                                        {replyTime && (
                                                                            <p className="text-xs text-gray-400 mt-1">
                                                                                {format(new Date(replyTime), 'dd/MM/yyyy HH:mm')}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            onClick={() => startReply({ id: reply.id, from: reply.from })}
                                                                            className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 rounded-full transition-colors"
                                                                            title={t('posts.replyComment')}
                                                                        >
                                                                            <Reply className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => startDm({ from: reply.from })}
                                                                            className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 rounded-full transition-colors"
                                                                            title={t('posts.sendDm')}
                                                                        >
                                                                            <Mail className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Reply/DM Input */}
                        {(replyingTo || dmTo) && (
                            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    {replyingTo && (
                                        <span className="text-sm text-blue-600">
                                            {t('posts.replyingTo')} @{replyingTo.username || replyingTo.name}
                                        </span>
                                    )}
                                    {dmTo && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-purple-600">
                                                {t('posts.sendingDmTo')} @{dmTo.username || dmTo.name}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                                                <AlertTriangle className="w-3 h-3" />
                                                {t('posts.window24h')}
                                            </span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => {
                                            setReplyingTo(null);
                                            setDmTo(null);
                                            setMessageText('');
                                        }}
                                        className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                if (replyingTo) handleReply();
                                                if (dmTo) handleSendDm();
                                            }
                                        }}
                                        placeholder={replyingTo ? t('posts.writeReply') : t('posts.writeMessage')}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={isSending}
                                        autoFocus
                                    />
                                    <button
                                        onClick={replyingTo ? handleReply : handleSendDm}
                                        disabled={isSending || !messageText.trim()}
                                        className={`p-2 rounded-lg text-white transition-colors ${
                                            replyingTo
                                                ? 'bg-blue-600 hover:bg-blue-700'
                                                : 'bg-purple-600 hover:bg-purple-700'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {isSending ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Send className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
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
                                        <h3 className="text-lg font-bold text-white">{t('posts.metaLimitation')}</h3>
                                        <p className="text-white/80 text-sm">{t('posts.window24hExpired')}</p>
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
                                {t('posts.metaLimitationMsg')}
                            </p>
                            {dmErrorModal.username && (
                                <a
                                    href={`https://ig.me/m/${dmErrorModal.username}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium"
                                >
                                    <Instagram className="w-5 h-5" />
                                    {t('posts.openDmWith')} @{dmErrorModal.username}
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

export default PostsPage;
