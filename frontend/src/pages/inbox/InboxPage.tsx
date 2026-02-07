import { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    MessageCircle,
    Send,
    Loader2,
    CheckCircle,
    RefreshCcw,
    Instagram,
    ExternalLink,
    Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Conversation {
    id: string;
    participantId: string;
    participantName: string;
    participantUsername: string;
    participantAvatar: string;
    participantFollowers: number;
    participantVerified: boolean;
    status: 'open' | 'resolved' | 'pending';
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
    socialAccount?: {
        accountName: string;
        accountId: string;
    };
}

interface Message {
    id: string;
    direction: 'incoming' | 'outgoing';
    type: string;
    content: string;
    mediaUrl?: string;
    status: string;
    senderName?: string;
    createdAt: string;
}

const InboxPage = () => {
    const { t } = useTranslation();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const fetchConversations = async () => {
        try {
            const res = await api.get('/inbox/conversations');
            setConversations(res.data);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMessages = async (conversationId: string) => {
        setIsLoadingMessages(true);
        try {
            const res = await api.get(`/inbox/conversations/${conversationId}/messages`);
            setMessages(res.data);

            // Mark as read
            await api.put(`/inbox/conversations/${conversationId}/read`);

            // Update unread count in conversation list
            setConversations(prev =>
                prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
            );
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const handleSelectConversation = (conversation: Conversation) => {
        setSelectedConversation(conversation);
        fetchMessages(conversation.id);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation || isSending) return;

        setIsSending(true);
        const messageContent = newMessage;
        setNewMessage('');

        try {
            const res = await api.post(`/inbox/conversations/${selectedConversation.id}/messages`, {
                content: messageContent,
            });

            // Add message to list
            setMessages(prev => [...prev, res.data]);

            // Update conversation in list
            setConversations(prev =>
                prev.map(c =>
                    c.id === selectedConversation.id
                        ? { ...c, lastMessage: messageContent, lastMessageAt: new Date().toISOString() }
                        : c
                ).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
            );

            // Scroll to bottom
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (error: any) {
            console.error('Error sending message:', error);
            alert(error.response?.data?.message || t('inbox.sendError'));
            setNewMessage(messageContent); // Restore message
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleResolve = async () => {
        if (!selectedConversation) return;

        try {
            await api.put(`/inbox/conversations/${selectedConversation.id}/status`, {
                status: 'resolved',
            });

            setConversations(prev =>
                prev.map(c =>
                    c.id === selectedConversation.id ? { ...c, status: 'resolved' } : c
                )
            );
            setSelectedConversation(prev => prev ? { ...prev, status: 'resolved' } : null);
        } catch (error) {
            console.error('Error resolving conversation:', error);
        }
    };

    const handleReopen = async () => {
        if (!selectedConversation) return;

        try {
            await api.put(`/inbox/conversations/${selectedConversation.id}/status`, {
                status: 'open',
            });

            setConversations(prev =>
                prev.map(c =>
                    c.id === selectedConversation.id ? { ...c, status: 'open' } : c
                )
            );
            setSelectedConversation(prev => prev ? { ...prev, status: 'open' } : null);
        } catch (error) {
            console.error('Error reopening conversation:', error);
        }
    };

    useEffect(() => {
        fetchConversations();

        // Poll for new messages every 5 seconds
        const interval = setInterval(() => {
            fetchConversations();
            if (selectedConversation) {
                fetchMessages(selectedConversation.id);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Scroll to bottom when messages change
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return format(date, 'HH:mm');
        } else if (diffDays === 1) {
            return t('inbox.yesterday');
        } else if (diffDays < 7) {
            return format(date, 'EEEE', { locale: ptBR });
        } else {
            return format(date, 'dd/MM/yy');
        }
    };

    return (
        <div className="flex h-[calc(100vh-120px)] bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Conversations List */}
            <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Instagram className="w-5 h-5 text-pink-500" />
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Inbox</h2>
                    </div>
                    <button
                        onClick={fetchConversations}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title={t('common.refresh')}
                    >
                        <RefreshCcw className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400 text-sm">
                            <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
                            <p>{t('inbox.noConversations')}</p>
                        </div>
                    ) : (
                        conversations.map((conversation) => (
                            <div
                                key={conversation.id}
                                onClick={() => handleSelectConversation(conversation)}
                                className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                    selectedConversation?.id === conversation.id
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500'
                                        : ''
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="relative">
                                        {conversation.participantAvatar ? (
                                            <img
                                                src={conversation.participantAvatar}
                                                alt={conversation.participantName}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">
                                                {conversation.participantName?.charAt(0) || '?'}
                                            </div>
                                        )}
                                        {conversation.unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                                                {conversation.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className={`font-medium truncate ${conversation.unreadCount > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {conversation.participantName || t('common.user')}
                                                {conversation.participantVerified && (
                                                    <CheckCircle className="w-3 h-3 text-blue-500 inline ml-1" />
                                                )}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {formatTime(conversation.lastMessageAt)}
                                            </span>
                                        </div>
                                        {conversation.participantUsername && (
                                            <p className="text-xs text-gray-400 truncate">
                                                @{conversation.participantUsername}
                                            </p>
                                        )}
                                        <p className={`text-sm truncate mt-1 ${conversation.unreadCount > 0 ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {conversation.lastMessage}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
                            <div className="flex items-center gap-3">
                                {selectedConversation.participantAvatar ? (
                                    <img
                                        src={selectedConversation.participantAvatar}
                                        alt={selectedConversation.participantName}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">
                                        {selectedConversation.participantName?.charAt(0) || '?'}
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                                        {selectedConversation.participantName}
                                        {selectedConversation.participantVerified && (
                                            <CheckCircle className="w-4 h-4 text-blue-500" />
                                        )}
                                    </h3>
                                    {selectedConversation.participantUsername && (
                                        <a
                                            href={`https://instagram.com/${selectedConversation.participantUsername}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-gray-500 hover:text-pink-500 flex items-center gap-1"
                                        >
                                            @{selectedConversation.participantUsername}
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedConversation.participantFollowers > 0 && (
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        {selectedConversation.participantFollowers.toLocaleString()}
                                    </span>
                                )}
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                    selectedConversation.status === 'open'
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}>
                                    {selectedConversation.status === 'open' ? t('inbox.open') : t('inbox.resolved')}
                                </span>
                                {selectedConversation.status === 'open' ? (
                                    <button
                                        onClick={handleResolve}
                                        className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        {t('inbox.resolve')}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleReopen}
                                        className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                    >
                                        {t('inbox.reopen')}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                            {isLoadingMessages ? (
                                <div className="flex items-center justify-center h-32">
                                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex items-center justify-center h-32 text-gray-400">
                                    {t('inbox.noMessages')}
                                </div>
                            ) : (
                                messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                                message.direction === 'outgoing'
                                                    ? 'bg-blue-500 text-white rounded-br-md'
                                                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md shadow-sm'
                                            }`}
                                        >
                                            {message.mediaUrl && (
                                                <img
                                                    src={message.mediaUrl}
                                                    alt="Media"
                                                    className="max-w-full rounded-lg mb-2"
                                                />
                                            )}
                                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                            <p className={`text-xs mt-1 ${message.direction === 'outgoing' ? 'text-blue-100' : 'text-gray-400'}`}>
                                                {format(new Date(message.createdAt), 'HH:mm')}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <div className="flex items-end gap-2">
                                <textarea
                                    ref={inputRef}
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder={t('inbox.typeMessage')}
                                    rows={1}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    style={{ maxHeight: '120px' }}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim() || isSending}
                                    className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                {t('inbox.reminder24h')}
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg">{t('inbox.selectConversation')}</p>
                        <p className="text-sm">{t('inbox.toSeeMessages')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InboxPage;
