import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../store/store';
import api from '../../services/api';
import { Facebook, Instagram, Youtube, Music, Loader2, Trash2, ShoppingCart, X, Check, ExternalLink, MessageCircle, Copy, Link, Key, Pencil, Brain, Eye, EyeOff, MapPin, Lock, Globe } from 'lucide-react';

interface Integration {
    id: string;
    type: string;
    name: string;
    storeUrl: string;
    consumerKey?: string;
    status: string;
    createdAt: string;
    metadata?: {
        accountId?: number;
        inboxId?: number;
        instagramInboxId?: number;
        instagramAccountId?: string;
    };
}

const AccountsPage = () => {
    const { t } = useTranslation();
    const [accounts, setAccounts] = useState<any[]>([]);
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showWooCommerceModal, setShowWooCommerceModal] = useState(false);
    const [editingWooId, setEditingWooId] = useState<string | null>(null);
    const [wooForm, setWooForm] = useState({ storeUrl: '', consumerKey: '', consumerSecret: '', name: '' });
    const [savingWoo, setSavingWoo] = useState(false);
    const [testingWoo, setTestingWoo] = useState(false);
    const [wooTestResult, setWooTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showChatwootModal, setShowChatwootModal] = useState(false);
    const [editingChatwootId, setEditingChatwootId] = useState<string | null>(null);
    const [chatwootForm, setChatwootForm] = useState({ chatwootUrl: '', accessToken: '', name: '', inboxId: '', accountId: '', instagramInboxId: '', instagramAccountId: '' });
    const [webhookCopied, setWebhookCopied] = useState(false);
    const [savingChatwoot, setSavingChatwoot] = useState(false);
    const [testingChatwoot, setTestingChatwoot] = useState(false);
    const [chatwootTestResult, setChatwootTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showTokenModal, setShowTokenModal] = useState(false);
    const [tokenForm, setTokenForm] = useState({ accountId: '', accountName: '', accessToken: '' });
    const [savingToken, setSavingToken] = useState(false);
    const [showOpenAIModal, setShowOpenAIModal] = useState(false);
    const [openAIKey, setOpenAIKey] = useState('');
    const [openAIInfo, setOpenAIInfo] = useState<{ id: string; hasKey: boolean; keyPreview: string | null } | null>(null);
    const [savingOpenAI, setSavingOpenAI] = useState(false);
    const [testingOpenAI, setTestingOpenAI] = useState(false);
    const [openAITestResult, setOpenAITestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showOpenAIKey, setShowOpenAIKey] = useState(false);
    const [googleSheetsConnected, setGoogleSheetsConnected] = useState(false);
    const [googleSheetsEmail, setGoogleSheetsEmail] = useState('');
    const { user } = useSelector((state: RootState) => state.auth);

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/social-accounts');
            setAccounts(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchIntegrations = async () => {
        try {
            const res = await api.get('/integrations');
            setIntegrations(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchOpenAI = async () => {
        try {
            const res = await api.get('/integrations/openai');
            if (res.data) setOpenAIInfo(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const checkGoogleSheetsStatus = async () => {
        try {
            const res = await api.get('/integrations/google-sheets/status');
            setGoogleSheetsConnected(res.data.connected);
            setGoogleSheetsEmail(res.data.email || '');
        } catch (error) {
            console.error('Erro ao verificar Google Sheets:', error);
        }
    };

    const handleConnectGoogleSheets = async () => {
        const { getToken } = await import('../../lib/auth');
        const token = getToken();
        if (!token) return;
        window.location.href = `/api/auth/google-sheets?access_token=${token}`;
    };

    const handleDisconnectGoogleSheets = async () => {
        if (!confirm(t('accounts.confirmDisconnectSheets'))) return;
        try {
            await api.delete('/integrations/google-sheets');
            setGoogleSheetsConnected(false);
            setGoogleSheetsEmail('');
        } catch (error) {
            console.error('Erro ao desconectar Google Sheets:', error);
            alert(t('accounts.connectionFailed'));
        }
    };

    useEffect(() => {
        Promise.all([fetchAccounts(), fetchIntegrations(), fetchOpenAI(), checkGoogleSheetsStatus()]).finally(() => setIsLoading(false));
    }, []);

    const handleDelete = async (accountId: string, accountName: string) => {
        if (!confirm(t('accounts.confirmDisconnect', { name: accountName }))) {
            return;
        }

        setDeletingId(accountId);
        try {
            await api.delete(`/social-accounts/${accountId}`);
            setAccounts(accounts.filter(acc => acc.id !== accountId));
        } catch (error) {
            console.error('Erro ao desconectar conta:', error);
            alert(t('accounts.connectionFailed'));
        } finally {
            setDeletingId(null);
        }
    };

    const handleDeleteIntegration = async (integrationId: string, name: string) => {
        if (!confirm(t('accounts.confirmRemoveIntegration', { name }))) {
            return;
        }

        setDeletingId(integrationId);
        try {
            await api.delete(`/integrations/${integrationId}`);
            setIntegrations(integrations.filter(i => i.id !== integrationId));
        } catch (error) {
            console.error('Erro ao remover integracao:', error);
            alert(t('accounts.connectionFailed'));
        } finally {
            setDeletingId(null);
        }
    };

    const handleConnect = async (platform: string) => {
        const { getToken } = await import('../../lib/auth');
        const token = getToken();

        if (!token) {
            console.error('No auth token available');
            return;
        }

        switch (platform) {
            case 'facebook':
                window.location.href = `/api/auth/facebook?access_token=${token}`;
                break;
            case 'youtube':
                window.location.href = `/api/auth/google?state=${user?.id}&access_token=${token}`;
                break;
            case 'tiktok':
                window.location.href = `/api/auth/tiktok?userId=${user?.id}&access_token=${token}`;
                break;
        }
    };

    const handleTestWooCommerce = async () => {
        if (!wooForm.storeUrl || !wooForm.consumerKey || !wooForm.consumerSecret) {
            setWooTestResult({ success: false, message: t('accounts.fillAllFields') });
            return;
        }

        setTestingWoo(true);
        setWooTestResult(null);

        try {
            const res = await api.post('/integrations/woocommerce/test', {
                storeUrl: wooForm.storeUrl.replace(/\/$/, ''),
                consumerKey: wooForm.consumerKey,
                consumerSecret: wooForm.consumerSecret
            });

            setWooTestResult({ success: true, message: t('accounts.connectionSuccess', { count: res.data.productCount }) });
        } catch (error: any) {
            setWooTestResult({ success: false, message: error.response?.data?.message || t('accounts.connectionFailed') });
        } finally {
            setTestingWoo(false);
        }
    };

    const handleSaveWooCommerce = async () => {
        if (!wooForm.storeUrl || !wooForm.consumerKey || !wooForm.consumerSecret) {
            alert(t('accounts.fillAllFields'));
            return;
        }

        setSavingWoo(true);

        try {
            const payload = {
                name: wooForm.name || 'Minha Loja WooCommerce',
                storeUrl: wooForm.storeUrl.replace(/\/$/, ''),
                consumerKey: wooForm.consumerKey,
                consumerSecret: wooForm.consumerSecret
            };

            if (editingWooId) {
                const res = await api.put(`/integrations/woocommerce/${editingWooId}`, payload);
                setIntegrations(integrations.map(i => i.id === editingWooId ? res.data : i));
            } else {
                const res = await api.post('/integrations/woocommerce', payload);
                setIntegrations([...integrations, res.data]);
            }

            setShowWooCommerceModal(false);
            setEditingWooId(null);
            setWooForm({ storeUrl: '', consumerKey: '', consumerSecret: '', name: '' });
            setWooTestResult(null);
        } catch (error: any) {
            alert(error.response?.data?.message || t('accounts.connectionFailed'));
        } finally {
            setSavingWoo(false);
        }
    };

    const handleEditWooCommerce = (integration: Integration) => {
        setWooForm({
            storeUrl: integration.storeUrl,
            consumerKey: integration.consumerKey || '',
            consumerSecret: '',
            name: integration.name,
        });
        setEditingWooId(integration.id);
        setWooTestResult(null);
        setShowWooCommerceModal(true);
    };

    const handleTestChatwoot = async () => {
        if (!chatwootForm.chatwootUrl || !chatwootForm.accessToken) {
            setChatwootTestResult({ success: false, message: t('accounts.fillAllFields') });
            return;
        }

        setTestingChatwoot(true);
        setChatwootTestResult(null);

        try {
            await api.post('/integrations/chatwoot/test', {
                chatwootUrl: chatwootForm.chatwootUrl.replace(/\/$/, ''),
                accessToken: chatwootForm.accessToken
            });

            setChatwootTestResult({ success: true, message: t('accounts.connectionSuccess') });
        } catch (error: any) {
            setChatwootTestResult({ success: false, message: error.response?.data?.message || t('accounts.connectionFailed') });
        } finally {
            setTestingChatwoot(false);
        }
    };

    const handleSaveChatwoot = async () => {
        if (!chatwootForm.chatwootUrl || !chatwootForm.accessToken || !chatwootForm.inboxId || !chatwootForm.accountId) {
            alert(t('accounts.fillAllFields'));
            return;
        }

        setSavingChatwoot(true);

        try {
            const payload = {
                name: chatwootForm.name || 'Chatwoot',
                chatwootUrl: chatwootForm.chatwootUrl.replace(/\/$/, ''),
                accessToken: chatwootForm.accessToken,
                inboxId: parseInt(chatwootForm.inboxId),
                accountId: parseInt(chatwootForm.accountId),
                instagramInboxId: chatwootForm.instagramInboxId ? parseInt(chatwootForm.instagramInboxId) : undefined,
                instagramAccountId: chatwootForm.instagramAccountId || undefined,
            };

            if (editingChatwootId) {
                // Update existing
                const res = await api.put(`/integrations/chatwoot/${editingChatwootId}`, payload);
                setIntegrations(integrations.map(i => i.id === editingChatwootId ? res.data : i));
            } else {
                // Create new
                const res = await api.post('/integrations/chatwoot', payload);
                setIntegrations([...integrations, res.data]);
            }

            setShowChatwootModal(false);
            setEditingChatwootId(null);
            setChatwootForm({ chatwootUrl: '', accessToken: '', name: '', inboxId: '', accountId: '', instagramInboxId: '', instagramAccountId: '' });
            setChatwootTestResult(null);
        } catch (error: any) {
            alert(error.response?.data?.message || t('accounts.connectionFailed'));
        } finally {
            setSavingChatwoot(false);
        }
    };

    const handleEditChatwoot = (integration: Integration) => {
        setChatwootForm({
            chatwootUrl: integration.storeUrl,
            accessToken: integration.consumerKey || '',
            name: integration.name,
            inboxId: integration.metadata?.inboxId?.toString() || '',
            accountId: integration.metadata?.accountId?.toString() || '',
            instagramInboxId: integration.metadata?.instagramInboxId?.toString() || '',
            instagramAccountId: integration.metadata?.instagramAccountId || '',
        });
        setEditingChatwootId(integration.id);
        setChatwootTestResult(null);
        setShowChatwootModal(true);
    };

    const handleOpenTokenModal = (account: any) => {
        setTokenForm({
            accountId: account.id,
            accountName: account.accountName,
            accessToken: '',
        });
        setShowTokenModal(true);
    };

    const handleSaveToken = async () => {
        if (!tokenForm.accessToken) {
            alert(t('accounts.insertToken'));
            return;
        }

        setSavingToken(true);

        try {
            await api.patch(`/social-accounts/${tokenForm.accountId}/token`, {
                accessToken: tokenForm.accessToken,
            });

            setShowTokenModal(false);
            setTokenForm({ accountId: '', accountName: '', accessToken: '' });
            alert(t('accounts.tokenUpdated'));
        } catch (error: any) {
            alert(error.response?.data?.message || t('accounts.connectionFailed'));
        } finally {
            setSavingToken(false);
        }
    };

    const handleTestOpenAI = async () => {
        if (!openAIKey) {
            setOpenAITestResult({ success: false, message: t('accounts.insertApiKey') });
            return;
        }
        setTestingOpenAI(true);
        setOpenAITestResult(null);
        try {
            await api.post('/integrations/openai/test', { apiKey: openAIKey });
            setOpenAITestResult({ success: true, message: t('accounts.connectionSuccess') });
        } catch (error: any) {
            setOpenAITestResult({ success: false, message: error.response?.data?.message || t('accounts.connectionFailed') });
        } finally {
            setTestingOpenAI(false);
        }
    };

    const handleSaveOpenAI = async () => {
        if (!openAIKey) return;
        setSavingOpenAI(true);
        try {
            await api.post('/integrations/openai', { apiKey: openAIKey });
            setShowOpenAIModal(false);
            setOpenAIKey('');
            setOpenAITestResult(null);
            setShowOpenAIKey(false);
            await fetchOpenAI();
        } catch (error: any) {
            alert(error.response?.data?.message || t('accounts.connectionFailed'));
        } finally {
            setSavingOpenAI(false);
        }
    };

    const handleDeleteOpenAI = async () => {
        if (!openAIInfo?.id) return;
        if (!confirm(t('accounts.confirmRemoveOpenai'))) return;
        try {
            await api.delete(`/integrations/${openAIInfo.id}`);
            setOpenAIInfo(null);
        } catch (error) {
            console.error(error);
            alert(t('accounts.connectionFailed'));
        }
    };

    const wooCommerceIntegration = integrations.find(i => i.type === 'woocommerce');

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('accounts.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t('accounts.subtitle')}</p>
                </div>
            </div>

            {/* Social Media Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t('accounts.socialMedia')}</h2>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={() => handleConnect('facebook')}
                        className="flex items-center gap-2 bg-[#1877F2] text-white px-4 py-2 rounded-md hover:bg-[#1877F2]/90 transition-colors"
                    >
                        <Facebook className="w-5 h-5" />
                        {t('accounts.connectFacebook')}
                    </button>
                    <button
                        onClick={() => handleConnect('youtube')}
                        className="flex items-center gap-2 bg-[#FF0000] text-white px-4 py-2 rounded-md hover:bg-[#FF0000]/90 transition-colors"
                    >
                        <Youtube className="w-5 h-5" />
                        {t('accounts.connectYoutube')}
                    </button>
                    <button
                        onClick={() => handleConnect('tiktok')}
                        className="flex items-center gap-2 bg-[#000000] text-white px-4 py-2 rounded-md hover:bg-[#333333]/90 transition-colors"
                    >
                        <Music className="w-5 h-5" />
                        {t('accounts.connectTiktok')}
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {accounts.map((account) => (
                            <div key={account.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${account.platform === 'facebook' ? 'bg-[#1877F2]/10 text-[#1877F2]' :
                                            account.platform === 'instagram' ? 'bg-pink-100 text-pink-600' :
                                                account.platform === 'youtube' ? 'bg-[#FF0000]/10 text-[#FF0000]' :
                                                    account.platform === 'tiktok' ? 'bg-black/10 text-black' :
                                                        'bg-gray-100 text-gray-500 dark:text-gray-400'
                                            }`}>
                                            {account.platform === 'facebook' && <Facebook className="w-5 h-5" />}
                                            {account.platform === 'instagram' && <Instagram className="w-5 h-5" />}
                                            {account.platform === 'youtube' && <Youtube className="w-5 h-5" />}
                                            {account.platform === 'tiktok' && <Music className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{account.accountName}</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{account.platform}</p>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${account.status === 'active' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
                                        }`}>
                                        {account.status === 'active' ? t('common.connected') : t('common.disconnected')}
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t flex justify-between">
                                    {account.platform === 'instagram' && (
                                        <button
                                            onClick={() => handleOpenTokenModal(account)}
                                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                                        >
                                            <Key className="w-4 h-4" />
                                            {t('accounts.editToken')}
                                        </button>
                                    )}
                                    {account.platform !== 'instagram' && <div />}
                                    <button
                                        onClick={() => handleDelete(account.id, account.accountName)}
                                        disabled={deletingId === account.id}
                                        className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {deletingId === account.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                        {t('common.disconnect')}
                                    </button>
                                </div>
                            </div>
                        ))}

                        {accounts.length === 0 && (
                            <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                                {t('accounts.noAccounts')}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Customer Support Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t('accounts.customerSupport')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('accounts.customerSupportDesc')}</p>

                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={() => setShowChatwootModal(true)}
                        className="flex items-center gap-2 bg-[#1f93ff] text-white px-4 py-2 rounded-md hover:bg-[#1f93ff]/90 transition-colors"
                    >
                        <MessageCircle className="w-5 h-5" />
                        {t('accounts.addChatwoot')}
                    </button>
                </div>

                {/* Connected Support Integrations */}
                {integrations.filter(i => i.type === 'chatwoot').length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {integrations.filter(i => i.type === 'chatwoot').map((integration) => (
                            <div key={integration.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1f93ff]/10 text-[#1f93ff]">
                                            <MessageCircle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{integration.name}</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Chatwoot</p>
                                        </div>
                                    </div>
                                    <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400">
                                        {t('common.connected')}
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <a
                                        href={integration.storeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        {integration.storeUrl}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                                <div className="mt-4 pt-4 border-t flex justify-between">
                                    <button
                                        onClick={() => handleEditChatwoot(integration)}
                                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                                    >
                                        <Pencil className="w-4 h-4" />
                                        {t('common.edit')}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteIntegration(integration.id, integration.name)}
                                        disabled={deletingId === integration.id}
                                        className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {deletingId === integration.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                        {t('common.remove')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* E-commerce Integrations Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t('accounts.ecommerce')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('accounts.ecommerceDesc')}</p>

                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={() => setShowWooCommerceModal(true)}
                        disabled={!!wooCommerceIntegration}
                        className="flex items-center gap-2 bg-[#96588A] text-white px-4 py-2 rounded-md hover:bg-[#96588A]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ShoppingCart className="w-5 h-5" />
                        {wooCommerceIntegration ? t('accounts.wooConnected') : t('accounts.connectWoo')}
                    </button>
                </div>

                {/* Connected WooCommerce Integrations */}
                {integrations.filter(i => i.type === 'woocommerce').length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {integrations.filter(i => i.type === 'woocommerce').map((integration) => (
                            <div key={integration.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#96588A]/10 text-[#96588A]">
                                            <ShoppingCart className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{integration.name}</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">WooCommerce</p>
                                        </div>
                                    </div>
                                    <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400">
                                        {t('common.connected')}
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <a
                                        href={integration.storeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        {integration.storeUrl}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                                <div className="mt-4 pt-4 border-t flex justify-between">
                                    <button
                                        onClick={() => handleEditWooCommerce(integration)}
                                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                                    >
                                        <Pencil className="w-4 h-4" />
                                        {t('common.edit')}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteIntegration(integration.id, integration.name)}
                                        disabled={deletingId === integration.id}
                                        className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {deletingId === integration.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                        {t('common.remove')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* AI Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t('accounts.ai')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('accounts.aiDesc')}</p>

                {openAIInfo?.hasKey ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                        <Brain className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">OpenAI</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{openAIInfo.keyPreview}</p>
                                    </div>
                                </div>
                                <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400">
                                    {t('common.connected')}
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t flex justify-between">
                                <button
                                    onClick={() => {
                                        setOpenAIKey('');
                                        setOpenAITestResult(null);
                                        setShowOpenAIKey(false);
                                        setShowOpenAIModal(true);
                                    }}
                                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    <Pencil className="w-4 h-4" />
                                    {t('common.edit')}
                                </button>
                                <button
                                    onClick={handleDeleteOpenAI}
                                    className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {t('common.remove')}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={() => {
                                setOpenAIKey('');
                                setOpenAITestResult(null);
                                setShowOpenAIKey(false);
                                setShowOpenAIModal(true);
                            }}
                            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors"
                        >
                            <Brain className="w-5 h-5" />
                            {t('accounts.connectOpenai')}
                        </button>
                    </div>
                )}
            </div>

            {/* Google Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t('accounts.google')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('accounts.googleDesc')}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Google Card */}
                    {googleSheetsConnected ? (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                        <Globe className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Google</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{googleSheetsEmail}</p>
                                    </div>
                                </div>
                                <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400">
                                    {t('common.connected')}
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t flex justify-end">
                                <button
                                    onClick={handleDisconnectGoogleSheets}
                                    className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {t('common.disconnect')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-center gap-3">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                <Globe className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Google</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('accounts.googleConnectDesc')}</p>
                            </div>
                            <button
                                onClick={handleConnectGoogleSheets}
                                className="flex items-center gap-2 bg-[#34A853] text-white px-4 py-2 rounded-md hover:bg-[#2d9249] transition-colors text-sm"
                            >
                                <Globe className="w-4 h-4" />
                                {t('accounts.connectGoogle')}
                            </button>
                        </div>
                    )}

                    {/* Google Meu Negocio - Coming Soon */}
                    <div className="relative bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed">
                        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            <Lock className="w-3 h-3" />
                            {t('common.comingSoon')}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                <MapPin className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('accounts.googleMyBusiness')}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('accounts.googleMyBusinessDesc')}</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                            {t('accounts.googleMyBusinessLong')}
                        </p>
                    </div>
                </div>
            </div>

            {/* OpenAI Modal */}
            {showOpenAIModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b bg-gradient-to-r from-emerald-600 to-teal-600">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Brain className="w-8 h-8 text-white" />
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{openAIInfo?.hasKey ? t('accounts.updateOpenaiKey') : t('accounts.connectOpenai')}</h3>
                                        <p className="text-white/80 text-sm">{t('accounts.openaiApiKey')}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowOpenAIModal(false);
                                        setOpenAIKey('');
                                        setOpenAITestResult(null);
                                    }}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('accounts.openaiApiKey')} *</label>
                                <div className="relative">
                                    <input
                                        type={showOpenAIKey ? 'text' : 'password'}
                                        placeholder="sk-..."
                                        value={openAIKey}
                                        onChange={(e) => setOpenAIKey(e.target.value)}
                                        className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showOpenAIKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    <strong>{t('accounts.openaiInstructions')}</strong><br />
                                    1. {t('accounts.openaiStep1')} <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">platform.openai.com/api-keys</a><br />
                                    2. {t('accounts.openaiStep2')}<br />
                                    3. {t('accounts.openaiStep3')}
                                </p>
                            </div>

                            {openAITestResult && (
                                <div className={`p-4 rounded-lg flex items-center gap-2 ${openAITestResult.success ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    }`}>
                                    {openAITestResult.success ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                    <span className="text-sm">{openAITestResult.message}</span>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex justify-between">
                            <button
                                onClick={handleTestOpenAI}
                                disabled={testingOpenAI || !openAIKey}
                                className="px-4 py-2 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {testingOpenAI ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {t('common.testConnection')}
                            </button>
                            <button
                                onClick={handleSaveOpenAI}
                                disabled={savingOpenAI || !openAITestResult?.success}
                                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {savingOpenAI ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {t('common.saveKey')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* WooCommerce Modal */}
            {showWooCommerceModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b bg-gradient-to-r from-[#96588A] to-[#7f4276]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ShoppingCart className="w-8 h-8 text-white" />
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{editingWooId ? t('accounts.editWoo') : t('accounts.connectWooTitle')}</h3>
                                        <p className="text-white/80 text-sm">{t('accounts.wooSubtitle')}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowWooCommerceModal(false);
                                        setEditingWooId(null);
                                        setWooForm({ storeUrl: '', consumerKey: '', consumerSecret: '', name: '' });
                                        setWooTestResult(null);
                                    }}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('accounts.storeName')}</label>
                                <input
                                    type="text"
                                    placeholder="Minha Loja"
                                    value={wooForm.name}
                                    onChange={(e) => setWooForm({ ...wooForm, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#96588A] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('accounts.storeUrl')} *</label>
                                <input
                                    type="url"
                                    placeholder="https://minhaloja.com.br"
                                    value={wooForm.storeUrl}
                                    onChange={(e) => setWooForm({ ...wooForm, storeUrl: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#96588A] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Consumer Key *</label>
                                <input
                                    type="text"
                                    placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    value={wooForm.consumerKey}
                                    onChange={(e) => setWooForm({ ...wooForm, consumerKey: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#96588A] focus:border-transparent font-mono text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Consumer Secret *</label>
                                <input
                                    type="password"
                                    placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    value={wooForm.consumerSecret}
                                    onChange={(e) => setWooForm({ ...wooForm, consumerSecret: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#96588A] focus:border-transparent font-mono text-sm"
                                />
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    <strong>{t('accounts.wooInstructions')}</strong><br />
                                    1. {t('accounts.wooStep1')}<br />
                                    2. {t('accounts.wooStep2')}<br />
                                    3. {t('accounts.wooStep3')}<br />
                                    4. {t('accounts.wooStep4')}
                                </p>
                            </div>

                            {wooTestResult && (
                                <div className={`p-4 rounded-lg flex items-center gap-2 ${wooTestResult.success ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    }`}>
                                    {wooTestResult.success ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                    <span className="text-sm">{wooTestResult.message}</span>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex justify-between">
                            <button
                                onClick={handleTestWooCommerce}
                                disabled={testingWoo}
                                className="px-4 py-2 text-[#96588A] border border-[#96588A] rounded-lg hover:bg-[#96588A]/10 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {testingWoo ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {t('common.testConnection')}
                            </button>
                            <button
                                onClick={handleSaveWooCommerce}
                                disabled={savingWoo || !wooTestResult?.success}
                                className="px-6 py-2 bg-[#96588A] text-white rounded-lg hover:bg-[#7f4276] transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {savingWoo ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {editingWooId ? t('accounts.updateIntegration') : t('accounts.saveIntegration')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chatwoot Modal */}
            {showChatwootModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b bg-gradient-to-r from-[#1f93ff] to-[#0c7ce6] shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <MessageCircle className="w-8 h-8 text-white" />
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{editingChatwootId ? t('accounts.editChatwoot') : t('accounts.connectChatwoot')}</h3>
                                        <p className="text-white/80 text-sm">{t('accounts.chatwootSubtitle')}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowChatwootModal(false);
                                        setEditingChatwootId(null);
                                        setChatwootForm({ chatwootUrl: '', accessToken: '', name: '', inboxId: '', accountId: '', instagramInboxId: '', instagramAccountId: '' });
                                        setChatwootTestResult(null);
                                    }}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('accounts.integrationName')}</label>
                                <input
                                    type="text"
                                    placeholder="Meu Chatwoot"
                                    value={chatwootForm.name}
                                    onChange={(e) => setChatwootForm({ ...chatwootForm, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1f93ff] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('accounts.chatwootUrl')} *</label>
                                <input
                                    type="url"
                                    placeholder="https://app.chatwoot.com"
                                    value={chatwootForm.chatwootUrl}
                                    onChange={(e) => setChatwootForm({ ...chatwootForm, chatwootUrl: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1f93ff] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('accounts.accessToken')} *</label>
                                <input
                                    type="password"
                                    placeholder="Seu token de acesso"
                                    value={chatwootForm.accessToken}
                                    onChange={(e) => setChatwootForm({ ...chatwootForm, accessToken: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1f93ff] focus:border-transparent font-mono text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('accounts.accountIdLabel')} *</label>
                                <input
                                    type="number"
                                    placeholder="1"
                                    value={chatwootForm.accountId}
                                    onChange={(e) => setChatwootForm({ ...chatwootForm, accountId: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1f93ff] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('accounts.inboxIdLabel')}</label>
                                <input
                                    type="number"
                                    placeholder="1"
                                    value={chatwootForm.inboxId}
                                    onChange={(e) => setChatwootForm({ ...chatwootForm, inboxId: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1f93ff] focus:border-transparent"
                                />
                                <p className="text-xs text-gray-400 mt-1">{t('accounts.inboxDesc')}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('accounts.instagramInboxId')}
                                    <span className="ml-1 text-xs font-normal text-gray-400">- {t('accounts.instagramInboxDesc')}</span>
                                </label>
                                <input
                                    type="number"
                                    placeholder="Ex: 5"
                                    value={chatwootForm.instagramInboxId}
                                    onChange={(e) => setChatwootForm({ ...chatwootForm, instagramInboxId: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1f93ff] focus:border-transparent"
                                />
                                <p className="text-xs text-gray-400 mt-1">{t('accounts.instagramInboxHelp')}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('accounts.instagramAccount')}
                                    <span className="ml-1 text-xs font-normal text-gray-400">- {t('accounts.instagramAccountDesc')}</span>
                                </label>
                                <select
                                    value={chatwootForm.instagramAccountId}
                                    onChange={(e) => setChatwootForm({ ...chatwootForm, instagramAccountId: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1f93ff] focus:border-transparent bg-white"
                                >
                                    <option value="">{t('accounts.selectInstagram')}</option>
                                    {accounts
                                        .filter((a) => a.platform === 'instagram' && a.status === 'active')
                                        .map((acc) => (
                                            <option key={acc.accountId} value={acc.accountId}>
                                                {acc.accountName}
                                            </option>
                                        ))}
                                </select>
                                <p className="text-xs text-gray-400 mt-1">{t('accounts.selectInstagramHelp')}</p>
                            </div>

                            {/* Webhook URL - shown after test succeeds */}
                            {chatwootTestResult?.success && (
                                <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Link className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-800">{t('accounts.webhookUrl')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-xs bg-white px-3 py-2 rounded border border-blue-200 text-blue-900 break-all">
                                            {`${window.location.origin}/api/webhooks/chatwoot`}
                                        </code>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/chatwoot`);
                                                setWebhookCopied(true);
                                                setTimeout(() => setWebhookCopied(false), 2000);
                                            }}
                                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors shrink-0"
                                            title="Copiar URL"
                                        >
                                            {webhookCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-blue-600" />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-blue-600">
                                        {t('accounts.webhookInstructions')}
                                    </p>
                                </div>
                            )}

                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    <strong>{t('accounts.chatwootInstructions')}</strong><br />
                                    1. {t('accounts.chatwootStep1')}<br />
                                    2. {t('accounts.chatwootStep2')}<br />
                                    3. {t('accounts.chatwootStep3')}<br />
                                    4. {t('accounts.chatwootStep4')}<br />
                                    5. {t('accounts.chatwootStep5')}
                                </p>
                            </div>

                            {chatwootTestResult && (
                                <div className={`p-4 rounded-lg flex items-center gap-2 ${chatwootTestResult.success ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    }`}>
                                    {chatwootTestResult.success ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                    <span className="text-sm">{chatwootTestResult.message}</span>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex justify-between shrink-0">
                            <button
                                onClick={handleTestChatwoot}
                                disabled={testingChatwoot}
                                className="px-4 py-2 text-[#1f93ff] border border-[#1f93ff] rounded-lg hover:bg-[#1f93ff]/10 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {testingChatwoot ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {t('common.testConnection')}
                            </button>
                            <button
                                onClick={handleSaveChatwoot}
                                disabled={savingChatwoot || !chatwootTestResult?.success}
                                className="px-6 py-2 bg-[#1f93ff] text-white rounded-lg hover:bg-[#0c7ce6] transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {savingChatwoot ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {editingChatwootId ? t('accounts.updateIntegration') : t('accounts.saveIntegration')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Token Modal */}
            {showTokenModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b bg-gradient-to-r from-pink-500 to-purple-600">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Key className="w-8 h-8 text-white" />
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{t('accounts.updateToken')}</h3>
                                        <p className="text-white/80 text-sm">{tokenForm.accountName}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowTokenModal(false)}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('accounts.permanentToken')} *</label>
                                <textarea
                                    placeholder={t('accounts.tokenPlaceholder')}
                                    value={tokenForm.accessToken}
                                    onChange={(e) => setTokenForm({ ...tokenForm, accessToken: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-pink-500 focus:border-transparent font-mono text-sm"
                                />
                            </div>

                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                <p className="text-xs text-yellow-800">
                                    <strong>{t('accounts.tokenImportant')}</strong>
                                </p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    <strong>{t('accounts.tokenInstructions')}</strong><br />
                                    1. {t('accounts.tokenStep1')} <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Graph API Explorer</a><br />
                                    2. {t('accounts.tokenStep2')}<br />
                                    3. {t('accounts.tokenStep3')} <code className="bg-gray-200 px-1 rounded">instagram_basic</code>, <code className="bg-gray-200 px-1 rounded">instagram_manage_messages</code>, <code className="bg-gray-200 px-1 rounded">pages_manage_metadata</code><br />
                                    4. {t('accounts.tokenStep4')}<br />
                                    5. {t('accounts.tokenStep5')} <a href="https://developers.facebook.com/tools/debug/accesstoken" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Access Token Debugger</a>
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex justify-end">
                            <button
                                onClick={handleSaveToken}
                                disabled={savingToken || !tokenForm.accessToken}
                                className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {savingToken ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {t('accounts.saveToken')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountsPage;
