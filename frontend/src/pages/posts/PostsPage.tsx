import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Facebook, Instagram, MessageCircle, Share2, ThumbsUp, Calendar, RefreshCw, Zap, Play } from 'lucide-react';
import { format } from 'date-fns';

const PostsPage = () => {
    const [posts, setPosts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
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
                                    <div className="flex items-center gap-1">
                                        <MessageCircle className="w-3 h-3" />
                                        <span>{post.commentsCount || 0}</span>
                                    </div>
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
        </div>
    );
};

export default PostsPage;
