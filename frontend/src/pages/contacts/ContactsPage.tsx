import { useEffect, useState } from 'react';
import api from '../../services/api';
import {
    Users,
    Search,
    Filter,
    Instagram,
    Facebook,
    Flame,
    Sun,
    Snowflake,
    MessageCircle,
    Send,
    Tag,
    X,
    ChevronRight,
    Plus,
    CheckCircle,
    Crown,
    User,
    Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

type HeatLevel = 'hot' | 'warm' | 'cold';
type LifecycleStage = 'lead' | 'engaged' | 'customer' | 'vip';

interface Contact {
    id: string;
    platform: string;
    platformUserId: string;
    username: string;
    name: string;
    avatar: string;
    followerCount: number;
    isVerified: boolean;
    leadScore: number;
    heatLevel: HeatLevel;
    lifecycleStage: LifecycleStage;
    totalInteractions: number;
    totalComments: number;
    totalDmsReceived: number;
    totalDmsSent: number;
    firstInteractionAt: string;
    lastInteractionAt: string;
    tags: string[];
    notes: string;
}

interface ContactInteraction {
    id: string;
    type: string;
    content: string;
    createdAt: string;
    scoreAwarded: number;
}

interface ContactStats {
    total: number;
    byHeatLevel: Record<HeatLevel, number>;
    byLifecycleStage: Record<LifecycleStage, number>;
    byPlatform: Record<string, number>;
    recentlyActive: number;
    topEngaged: Contact[];
}

interface ContactTag {
    id: string;
    name: string;
    color: string;
}

const HEAT_ICONS = {
    hot: Flame,
    warm: Sun,
    cold: Snowflake,
};

const HEAT_COLORS = {
    hot: 'text-red-500 bg-red-50',
    warm: 'text-yellow-500 bg-yellow-50',
    cold: 'text-blue-500 bg-blue-50',
};

const LIFECYCLE_COLORS = {
    lead: 'text-gray-500 bg-gray-100',
    engaged: 'text-blue-500 bg-blue-50',
    customer: 'text-green-500 bg-green-50',
    vip: 'text-purple-500 bg-purple-50',
};

const LIFECYCLE_LABELS = {
    lead: 'Lead',
    engaged: 'Engajado',
    customer: 'Cliente',
    vip: 'VIP',
};

const ContactsPage = () => {
    const { t } = useTranslation();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [stats, setStats] = useState<ContactStats | null>(null);
    const [tags, setTags] = useState<ContactTag[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [interactions, setInteractions] = useState<ContactInteraction[]>([]);
    const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [platform, setPlatform] = useState('');
    const [heatLevel, setHeatLevel] = useState<HeatLevel | ''>('');
    const [lifecycleStage, setLifecycleStage] = useState<LifecycleStage | ''>('');
    const [showFilters, setShowFilters] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // DM Modal
    const [showDmModal, setShowDmModal] = useState(false);
    const [dmMessage, setDmMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Tag Modal
    const [showTagModal, setShowTagModal] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#6366f1');

    useEffect(() => {
        fetchContacts();
        fetchStats();
        fetchTags();
    }, [page, search, platform, heatLevel, lifecycleStage]);

    const fetchContacts = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
            });
            if (search) params.append('search', search);
            if (platform) params.append('platform', platform);
            if (heatLevel) params.append('heatLevel', heatLevel);
            if (lifecycleStage) params.append('lifecycleStage', lifecycleStage);

            const res = await api.get(`/contacts?${params}`);
            setContacts(res.data.contacts);
            setTotalPages(res.data.pages);
        } catch (error) {
            console.error('Erro ao carregar contatos:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/contacts/stats');
            setStats(res.data);
        } catch (error) {
            console.error('Erro ao carregar estatisticas:', error);
        }
    };

    const fetchTags = async () => {
        try {
            const res = await api.get('/contacts/tags');
            setTags(res.data);
        } catch (error) {
            console.error('Erro ao carregar tags:', error);
        }
    };

    const openContactDetails = async (contact: Contact) => {
        setSelectedContact(contact);
        setIsLoadingInteractions(true);
        try {
            const res = await api.get(`/contacts/${contact.id}/interactions`);
            setInteractions(res.data);
        } catch (error) {
            console.error('Erro ao carregar interacoes:', error);
        } finally {
            setIsLoadingInteractions(false);
        }
    };

    const closeContactDetails = () => {
        setSelectedContact(null);
        setInteractions([]);
    };

    const sendDm = async () => {
        if (!selectedContact || !dmMessage.trim()) return;
        setIsSending(true);
        try {
            await api.post(`/contacts/${selectedContact.id}/dm`, {
                message: dmMessage.trim(),
            });
            setDmMessage('');
            setShowDmModal(false);
            alert(t('contacts.messageSent'));
            // Refresh interactions
            const res = await api.get(`/contacts/${selectedContact.id}/interactions`);
            setInteractions(res.data);
        } catch (error) {
            console.error('Erro ao enviar DM:', error);
            alert(t('contacts.messageFailed'));
        } finally {
            setIsSending(false);
        }
    };

    const addTag = async (tag: string) => {
        if (!selectedContact) return;
        try {
            const res = await api.post(`/contacts/${selectedContact.id}/tags`, { tag });
            setSelectedContact(res.data);
            fetchContacts();
        } catch (error) {
            console.error('Erro ao adicionar tag:', error);
        }
    };

    const removeTag = async (tag: string) => {
        if (!selectedContact) return;
        try {
            const res = await api.delete(`/contacts/${selectedContact.id}/tags/${encodeURIComponent(tag)}`);
            setSelectedContact(res.data);
            fetchContacts();
        } catch (error) {
            console.error('Erro ao remover tag:', error);
        }
    };

    const createTag = async () => {
        if (!newTagName.trim()) return;
        try {
            await api.post('/contacts/tags', {
                name: newTagName.trim(),
                color: newTagColor,
            });
            setNewTagName('');
            setShowTagModal(false);
            fetchTags();
        } catch (error) {
            console.error('Erro ao criar tag:', error);
        }
    };

    const updateLifecycleStage = async (stage: LifecycleStage) => {
        if (!selectedContact) return;
        try {
            const res = await api.put(`/contacts/${selectedContact.id}`, {
                lifecycleStage: stage,
            });
            setSelectedContact(res.data);
            fetchContacts();
        } catch (error) {
            console.error('Erro ao atualizar stage:', error);
        }
    };

    const getInteractionIcon = (type: string) => {
        switch (type) {
            case 'comment':
            case 'comment_reply':
                return MessageCircle;
            case 'dm_received':
            case 'dm_sent':
                return Send;
            default:
                return MessageCircle;
        }
    };

    const getInteractionLabel = (type: string) => {
        switch (type) {
            case 'comment':
                return t('contacts.commented');
            case 'comment_reply':
                return t('contacts.repliedComment');
            case 'dm_received':
                return t('contacts.sentDm');
            case 'dm_sent':
                return t('contacts.receivedDm');
            case 'mention':
                return t('contacts.mentioned');
            case 'story_reply':
                return t('contacts.repliedStory');
            default:
                return type;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between page-header-accent animate-fade-in-up">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t('contacts.title')}</h1>
                    <p className="text-muted-foreground">{t('contacts.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowTagModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    {t('contacts.newTag')}
                </button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="glass-card p-4 rounded-xl">
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <Users className="w-4 h-4" />
                            {t('contacts.total')}
                        </div>
                        <p className="text-2xl font-bold mt-1">{stats.total}</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                        <div className="flex items-center gap-2 text-red-500 text-sm">
                            <Flame className="w-4 h-4" />
                            Hot
                        </div>
                        <p className="text-2xl font-bold mt-1">{stats.byHeatLevel.hot}</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                        <div className="flex items-center gap-2 text-yellow-500 text-sm">
                            <Sun className="w-4 h-4" />
                            Warm
                        </div>
                        <p className="text-2xl font-bold mt-1">{stats.byHeatLevel.warm}</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                        <div className="flex items-center gap-2 text-blue-500 text-sm">
                            <Snowflake className="w-4 h-4" />
                            Cold
                        </div>
                        <p className="text-2xl font-bold mt-1">{stats.byHeatLevel.cold}</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                        <div className="flex items-center gap-2 text-green-500 text-sm">
                            <Clock className="w-4 h-4" />
                            {t('contacts.active7d')}
                        </div>
                        <p className="text-2xl font-bold mt-1">{stats.recentlyActive}</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                        <div className="flex items-center gap-2 text-purple-500 text-sm">
                            <Crown className="w-4 h-4" />
                            VIPs
                        </div>
                        <p className="text-2xl font-bold mt-1">{stats.byLifecycleStage.vip}</p>
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            <div className="glass-card p-4 rounded-xl">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('contacts.searchPlaceholder')}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                            showFilters ? 'bg-purple-50 border-purple-200 text-purple-700' : 'hover:bg-gray-50'
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        {t('common.filters')}
                    </button>
                </div>

                {showFilters && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('common.platform')}
                            </label>
                            <select
                                value={platform}
                                onChange={(e) => {
                                    setPlatform(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">{t('contacts.allPlatforms')}</option>
                                <option value="instagram">Instagram</option>
                                <option value="facebook">Facebook</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('contacts.temperature')}
                            </label>
                            <select
                                value={heatLevel}
                                onChange={(e) => {
                                    setHeatLevel(e.target.value as HeatLevel | '');
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">{t('contacts.allTemperatures')}</option>
                                <option value="hot">Hot</option>
                                <option value="warm">Warm</option>
                                <option value="cold">Cold</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('contacts.stage')}
                            </label>
                            <select
                                value={lifecycleStage}
                                onChange={(e) => {
                                    setLifecycleStage(e.target.value as LifecycleStage | '');
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">{t('contacts.allStages')}</option>
                                <option value="lead">Lead</option>
                                <option value="engaged">{t('contacts.engaged')}</option>
                                <option value="customer">{t('contacts.customer')}</option>
                                <option value="vip">VIP</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Contacts List */}
            <div className="glass-card rounded-xl overflow-hidden">
                {isLoading ? (
                    <div className="text-center py-12 text-gray-500">
                        {t('contacts.loadingContacts')}
                    </div>
                ) : contacts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        {t('contacts.noContacts')}
                    </div>
                ) : (
                    <div className="divide-y">
                        {contacts.map((contact) => {
                            const HeatIcon = HEAT_ICONS[contact.heatLevel];

                            return (
                                <div
                                    key={contact.id}
                                    onClick={() => openContactDetails(contact)}
                                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="relative">
                                            {contact.avatar ? (
                                                <img
                                                    src={contact.avatar}
                                                    alt={contact.name}
                                                    className="w-12 h-12 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                                    <User className="w-6 h-6 text-gray-400" />
                                                </div>
                                            )}
                                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                                                contact.platform === 'instagram' ? 'bg-pink-500' : 'bg-blue-500'
                                            }`}>
                                                {contact.platform === 'instagram' ? (
                                                    <Instagram className="w-3 h-3 text-white" />
                                                ) : (
                                                    <Facebook className="w-3 h-3 text-white" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium truncate">
                                                    {contact.name || contact.username || t('common.user')}
                                                </p>
                                                {contact.isVerified && (
                                                    <CheckCircle className="w-4 h-4 text-blue-500" />
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 truncate">
                                                @{contact.username}
                                                {contact.followerCount > 0 && (
                                                    <span className="ml-2">
                                                        {contact.followerCount.toLocaleString()} {t('contacts.followers')}
                                                    </span>
                                                )}
                                            </p>
                                        </div>

                                        {/* Score & Heat */}
                                        <div className="flex items-center gap-3">
                                            <div className="text-center">
                                                <p className="text-lg font-bold text-purple-600">
                                                    {contact.leadScore}
                                                </p>
                                                <p className="text-xs text-gray-500">Score</p>
                                            </div>
                                            <div className={`p-2 rounded-full ${HEAT_COLORS[contact.heatLevel]}`}>
                                                <HeatIcon className="w-5 h-5" />
                                            </div>
                                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${LIFECYCLE_COLORS[contact.lifecycleStage]}`}>
                                                {LIFECYCLE_LABELS[contact.lifecycleStage]}
                                            </div>
                                        </div>

                                        {/* Tags */}
                                        {contact.tags.length > 0 && (
                                            <div className="hidden lg:flex items-center gap-1">
                                                {contact.tags.slice(0, 2).map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                                {contact.tags.length > 2 && (
                                                    <span className="text-xs text-gray-400">
                                                        +{contact.tags.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Last interaction */}
                                        <div className="hidden md:block text-right">
                                            <p className="text-xs text-gray-400">
                                                {contact.lastInteractionAt
                                                    ? format(new Date(contact.lastInteractionAt), 'dd/MM/yyyy')
                                                    : '-'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {contact.totalInteractions} {t('contacts.interactions')}
                                            </p>
                                        </div>

                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t flex items-center justify-center gap-2">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            {t('common.previous')}
                        </button>
                        <span className="text-sm text-gray-500">
                            {t('contacts.page')} {page} {t('common.of')} {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            {t('common.next')}
                        </button>
                    </div>
                )}
            </div>

            {/* Contact Details Modal */}
            {selectedContact && (
                <div
                    className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4"
                    onClick={closeContactDetails}
                >
                    <div
                        className="glass-card-static rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    {selectedContact.avatar ? (
                                        <img
                                            src={selectedContact.avatar}
                                            alt={selectedContact.name}
                                            className="w-16 h-16 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                                            <User className="w-8 h-8 text-gray-400" />
                                        </div>
                                    )}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-xl font-bold">
                                                {selectedContact.name || selectedContact.username}
                                            </h2>
                                            {selectedContact.isVerified && (
                                                <CheckCircle className="w-5 h-5 text-blue-500" />
                                            )}
                                        </div>
                                        <p className="text-gray-500">@{selectedContact.username}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {selectedContact.platform === 'instagram' ? (
                                                <Instagram className="w-4 h-4 text-pink-500" />
                                            ) : (
                                                <Facebook className="w-4 h-4 text-blue-500" />
                                            )}
                                            <span className="text-sm text-gray-500">
                                                {selectedContact.followerCount.toLocaleString()} {t('contacts.followers')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={closeContactDetails}
                                    className="p-2 hover:bg-gray-100 rounded-full"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Stats Row */}
                            <div className="flex items-center gap-6 mt-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-purple-600">
                                        {selectedContact.leadScore}
                                    </p>
                                    <p className="text-xs text-gray-500">Lead Score</p>
                                </div>
                                <div className={`p-3 rounded-full ${HEAT_COLORS[selectedContact.heatLevel]}`}>
                                    {(() => {
                                        const Icon = HEAT_ICONS[selectedContact.heatLevel];
                                        return <Icon className="w-6 h-6" />;
                                    })()}
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-medium">{selectedContact.totalInteractions}</p>
                                    <p className="text-xs text-gray-500">{t('contacts.interactionsLabel')}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-medium">{selectedContact.totalComments}</p>
                                    <p className="text-xs text-gray-500">{t('contacts.commentsLabel')}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-medium">{selectedContact.totalDmsReceived}</p>
                                    <p className="text-xs text-gray-500">{t('contacts.dmsReceived')}</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-4">
                                <button
                                    onClick={() => setShowDmModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                >
                                    <Send className="w-4 h-4" />
                                    {t('contacts.sendDm')}
                                </button>
                                <select
                                    value={selectedContact.lifecycleStage}
                                    onChange={(e) => updateLifecycleStage(e.target.value as LifecycleStage)}
                                    className="px-3 py-2 border rounded-lg"
                                >
                                    <option value="lead">Lead</option>
                                    <option value="engaged">{t('contacts.engaged')}</option>
                                    <option value="customer">{t('contacts.customer')}</option>
                                    <option value="vip">VIP</option>
                                </select>
                            </div>
                        </div>

                        {/* Tags Section */}
                        <div className="px-6 py-3 border-b bg-gray-50">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Tag className="w-4 h-4 text-gray-400" />
                                {selectedContact.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-white border rounded-full text-sm"
                                    >
                                        {tag}
                                        <button
                                            onClick={() => removeTag(tag)}
                                            className="hover:text-red-500"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                                <select
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            addTag(e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                    className="px-2 py-1 border rounded-lg text-sm bg-white"
                                >
                                    <option value="">{t('contacts.addTag')}</option>
                                    {tags
                                        .filter((tg) => !selectedContact.tags.includes(tg.name))
                                        .map((tag) => (
                                            <option key={tag.id} value={tag.name}>
                                                {tag.name}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-4">
                                {t('contacts.interactionHistory')}
                            </h3>
                            {isLoadingInteractions ? (
                                <div className="text-center py-8 text-gray-500">
                                    {t('common.loading')}
                                </div>
                            ) : interactions.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    {t('contacts.noInteractions')}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {interactions.map((interaction) => {
                                        const Icon = getInteractionIcon(interaction.type);
                                        return (
                                            <div
                                                key={interaction.id}
                                                className="flex items-start gap-3"
                                            >
                                                <div className="p-2 bg-gray-100 rounded-full">
                                                    <Icon className="w-4 h-4 text-gray-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm">
                                                            {getInteractionLabel(interaction.type)}
                                                        </span>
                                                        <span className="text-xs text-purple-600">
                                                            +{interaction.scoreAwarded} pts
                                                        </span>
                                                    </div>
                                                    {interaction.content && (
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {interaction.content}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {format(new Date(interaction.createdAt), 'dd/MM/yyyy HH:mm')}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* DM Modal */}
            {showDmModal && selectedContact && (
                <div
                    className="fixed inset-0 modal-backdrop flex items-center justify-center z-[60] p-4"
                    onClick={() => setShowDmModal(false)}
                >
                    <div
                        className="glass-card-static rounded-2xl w-full max-w-md p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold mb-4">
                            {t('contacts.sendDmTo')} @{selectedContact.username}
                        </h3>
                        <textarea
                            value={dmMessage}
                            onChange={(e) => setDmMessage(e.target.value)}
                            placeholder={t('contacts.typeMessage')}
                            rows={4}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setShowDmModal(false)}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={sendDm}
                                disabled={isSending || !dmMessage.trim()}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                            >
                                {isSending ? t('common.sending') : t('common.send')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Tag Modal */}
            {showTagModal && (
                <div
                    className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4"
                    onClick={() => setShowTagModal(false)}
                >
                    <div
                        className="glass-card-static rounded-2xl w-full max-w-sm p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold mb-4">{t('contacts.newTag')}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('contacts.tagName')}
                                </label>
                                <input
                                    type="text"
                                    value={newTagName}
                                    onChange={(e) => setNewTagName(e.target.value)}
                                    placeholder={t('contacts.tagPlaceholder')}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('common.color')}
                                </label>
                                <input
                                    type="color"
                                    value={newTagColor}
                                    onChange={(e) => setNewTagColor(e.target.value)}
                                    className="w-full h-10 rounded-lg cursor-pointer"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowTagModal(false)}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={createTag}
                                disabled={!newTagName.trim()}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                            >
                                {t('common.create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContactsPage;
