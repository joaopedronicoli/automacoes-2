import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Facebook, Instagram, MessageCircle, Share2, ThumbsUp, Calendar, RefreshCw, Zap, Play, X, Send, Reply, Mail } from 'lucide-react';
import { format } from 'date-fns';

interface Comment {
    id: string;
    text: string;
    from: {
        id: string;
        username?: string;
        name?: string;
    };
    timestamp?: string;
    like_count?: number;
}

const PostsPage = () => {
    const [posts, setPosts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    const [dmTo, setDmTo] = useState<Comment | null>(null);
    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchPosts();
    }, []);

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
        try {
            const res = await api.get('/posts');
            setPosts(res.data);
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
                userId: dmTo.from.id,
                message: messageText.trim(),
            });
            setDmTo(null);
            setMessageText('');
            alert('Mensagem enviada com sucesso!');
        } catch (error) {
            console.error('Erro ao enviar DM:', error);
            alert('Erro ao enviar mensagem');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Feed de Publicacoes</h1>
                    <p className="text-gray-500">Gerencie seu conteudo publicado</p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-12">Carregando publicacoes...</div>
            ) : posts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed text-gray-500">
                    Nenhuma publicacao encontrada. Sincronize suas contas para ver o conteudo.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map((post) => (
                        <div key={post.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="p-4 flex items-center gap-3 border-b">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${post.socialAccount?.platform === 'facebook' ? 'bg-[#1877F2]/10 text-[#1877F2]' : 'bg-pink-100 text-pink-600'
                                    }`}>
                                    {post.socialAccount?.platform === 'facebook' ? <Facebook className="w-4 h-4" /> : <Instagram className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{post.socialAccount?.accountName}</p>
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <Calendar className="w-3 h-3" />
                                        <span>{post.publishedAt ? format(new Date(post.publishedAt), 'dd/MM/yyyy') : 'Rascunho'}</span>
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
                                            alt="Conteudo da publicacao"
                                            className="w-full h-48 object-cover rounded-md mb-3"
                                        />
                                    )
                                )}
                                <p className="text-sm text-gray-800 line-clamp-3">{post.content}</p>
                            </div>

                            {/* Footer Stats */}
                            <div className="p-3 bg-gray-50 border-t flex items-center justify-between text-xs text-gray-500">
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
                                    Criar Automacao
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Comments Modal */}
            {selectedPost && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={closeComments}
                >
                    <div
                        className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-semibold">Comentarios</h2>
                            <button
                                onClick={closeComments}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition-colors"
                                title="Fechar"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Comments List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {isLoadingComments ? (
                                <div className="text-center py-8 text-gray-500">
                                    Carregando comentarios...
                                </div>
                            ) : comments.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Nenhum comentario encontrado
                                </div>
                            ) : (
                                comments.map((comment) => (
                                    <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">
                                                    {comment.from?.username || comment.from?.name || 'Usuario'}
                                                </p>
                                                <p className="text-gray-700 mt-1">{comment.text}</p>
                                                {comment.timestamp && (
                                                    <p className="text-xs text-gray-400 mt-2">
                                                        {format(new Date(comment.timestamp), 'dd/MM/yyyy HH:mm')}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setReplyingTo(comment);
                                                        setDmTo(null);
                                                        setMessageText('');
                                                    }}
                                                    className="p-2 hover:bg-blue-100 text-blue-600 rounded-full transition-colors"
                                                    title="Responder comentario"
                                                >
                                                    <Reply className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setDmTo(comment);
                                                        setReplyingTo(null);
                                                        setMessageText('');
                                                    }}
                                                    className="p-2 hover:bg-purple-100 text-purple-600 rounded-full transition-colors"
                                                    title="Enviar mensagem direta"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Reply/DM Input */}
                        {(replyingTo || dmTo) && (
                            <div className="border-t p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    {replyingTo && (
                                        <span className="text-sm text-blue-600">
                                            Respondendo a @{replyingTo.from?.username || replyingTo.from?.name}
                                        </span>
                                    )}
                                    {dmTo && (
                                        <span className="text-sm text-purple-600">
                                            Enviando DM para @{dmTo.from?.username || dmTo.from?.name}
                                        </span>
                                    )}
                                    <button
                                        onClick={() => {
                                            setReplyingTo(null);
                                            setDmTo(null);
                                            setMessageText('');
                                        }}
                                        className="ml-auto text-gray-400 hover:text-gray-600"
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
                                        placeholder={replyingTo ? 'Escreva sua resposta...' : 'Escreva sua mensagem...'}
                                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={isSending}
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
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostsPage;
