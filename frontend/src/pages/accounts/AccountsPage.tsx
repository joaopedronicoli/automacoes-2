import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import api from '../../services/api';
import { Facebook, Instagram, Youtube, Music, Loader2, Trash2, ShoppingCart, X, Check, ExternalLink, MessageCircle, Copy, Link, Key } from 'lucide-react';

interface Integration {
    id: string;
    type: string;
    name: string;
    storeUrl: string;
    status: string;
    createdAt: string;
}

const AccountsPage = () => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showWooCommerceModal, setShowWooCommerceModal] = useState(false);
    const [wooForm, setWooForm] = useState({ storeUrl: '', consumerKey: '', consumerSecret: '', name: '' });
    const [savingWoo, setSavingWoo] = useState(false);
    const [testingWoo, setTestingWoo] = useState(false);
    const [wooTestResult, setWooTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showChatwootModal, setShowChatwootModal] = useState(false);
    const [chatwootForm, setChatwootForm] = useState({ chatwootUrl: '', accessToken: '', name: '', inboxId: '', accountId: '', instagramInboxId: '', instagramAccountId: '' });
    const [webhookCopied, setWebhookCopied] = useState(false);
    const [savingChatwoot, setSavingChatwoot] = useState(false);
    const [testingChatwoot, setTestingChatwoot] = useState(false);
    const [chatwootTestResult, setChatwootTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showTokenModal, setShowTokenModal] = useState(false);
    const [tokenForm, setTokenForm] = useState({ accountId: '', accountName: '', accessToken: '' });
    const [savingToken, setSavingToken] = useState(false);
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

    useEffect(() => {
        Promise.all([fetchAccounts(), fetchIntegrations()]).finally(() => setIsLoading(false));
    }, []);

    const handleDelete = async (accountId: string, accountName: string) => {
        if (!confirm(`Tem certeza que deseja desconectar a conta "${accountName}"?`)) {
            return;
        }

        setDeletingId(accountId);
        try {
            await api.delete(`/social-accounts/${accountId}`);
            setAccounts(accounts.filter(acc => acc.id !== accountId));
        } catch (error) {
            console.error('Erro ao desconectar conta:', error);
            alert('Erro ao desconectar conta. Tente novamente.');
        } finally {
            setDeletingId(null);
        }
    };

    const handleDeleteIntegration = async (integrationId: string, name: string) => {
        if (!confirm(`Tem certeza que deseja remover a integracao "${name}"?`)) {
            return;
        }

        setDeletingId(integrationId);
        try {
            await api.delete(`/integrations/${integrationId}`);
            setIntegrations(integrations.filter(i => i.id !== integrationId));
        } catch (error) {
            console.error('Erro ao remover integracao:', error);
            alert('Erro ao remover integracao. Tente novamente.');
        } finally {
            setDeletingId(null);
        }
    };

    const handleConnect = async (platform: string) => {
        const { supabase } = await import('../../lib/supabase');
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

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
            setWooTestResult({ success: false, message: 'Preencha todos os campos' });
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

            setWooTestResult({ success: true, message: `Conexao bem sucedida! ${res.data.productCount} produtos encontrados.` });
        } catch (error: any) {
            setWooTestResult({ success: false, message: error.response?.data?.message || 'Falha ao conectar. Verifique as credenciais.' });
        } finally {
            setTestingWoo(false);
        }
    };

    const handleSaveWooCommerce = async () => {
        if (!wooForm.storeUrl || !wooForm.consumerKey || !wooForm.consumerSecret) {
            alert('Preencha todos os campos');
            return;
        }

        setSavingWoo(true);

        try {
            const res = await api.post('/integrations/woocommerce', {
                name: wooForm.name || 'Minha Loja WooCommerce',
                storeUrl: wooForm.storeUrl.replace(/\/$/, ''),
                consumerKey: wooForm.consumerKey,
                consumerSecret: wooForm.consumerSecret
            });

            setIntegrations([...integrations, res.data]);
            setShowWooCommerceModal(false);
            setWooForm({ storeUrl: '', consumerKey: '', consumerSecret: '', name: '' });
            setWooTestResult(null);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Erro ao salvar integracao');
        } finally {
            setSavingWoo(false);
        }
    };

    const handleTestChatwoot = async () => {
        if (!chatwootForm.chatwootUrl || !chatwootForm.accessToken) {
            setChatwootTestResult({ success: false, message: 'Preencha URL e Token de acesso' });
            return;
        }

        setTestingChatwoot(true);
        setChatwootTestResult(null);

        try {
            await api.post('/integrations/chatwoot/test', {
                chatwootUrl: chatwootForm.chatwootUrl.replace(/\/$/, ''),
                accessToken: chatwootForm.accessToken
            });

            setChatwootTestResult({ success: true, message: 'Conexao bem sucedida!' });
        } catch (error: any) {
            setChatwootTestResult({ success: false, message: error.response?.data?.message || 'Falha ao conectar. Verifique as credenciais.' });
        } finally {
            setTestingChatwoot(false);
        }
    };

    const handleSaveChatwoot = async () => {
        if (!chatwootForm.chatwootUrl || !chatwootForm.accessToken || !chatwootForm.inboxId || !chatwootForm.accountId) {
            alert('Preencha todos os campos');
            return;
        }

        setSavingChatwoot(true);

        try {
            const res = await api.post('/integrations/chatwoot', {
                name: chatwootForm.name || 'Chatwoot',
                chatwootUrl: chatwootForm.chatwootUrl.replace(/\/$/, ''),
                accessToken: chatwootForm.accessToken,
                inboxId: parseInt(chatwootForm.inboxId),
                accountId: parseInt(chatwootForm.accountId),
                instagramInboxId: chatwootForm.instagramInboxId ? parseInt(chatwootForm.instagramInboxId) : undefined,
                instagramAccountId: chatwootForm.instagramAccountId || undefined,
            });

            setIntegrations([...integrations, res.data]);
            setShowChatwootModal(false);
            setChatwootForm({ chatwootUrl: '', accessToken: '', name: '', inboxId: '', accountId: '', instagramInboxId: '', instagramAccountId: '' });
            setChatwootTestResult(null);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Erro ao salvar integracao');
        } finally {
            setSavingChatwoot(false);
        }
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
            alert('Insira o token de acesso');
            return;
        }

        setSavingToken(true);

        try {
            await api.patch(`/social-accounts/${tokenForm.accountId}/token`, {
                accessToken: tokenForm.accessToken,
            });

            setShowTokenModal(false);
            setTokenForm({ accountId: '', accountName: '', accessToken: '' });
            alert('Token atualizado com sucesso!');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Erro ao atualizar token');
        } finally {
            setSavingToken(false);
        }
    };

    const wooCommerceIntegration = integrations.find(i => i.type === 'woocommerce');
    const chatwootIntegration = integrations.find(i => i.type === 'chatwoot');

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Contas e Integracoes</h1>
                    <p className="text-gray-500">Gerencie suas conexoes de redes sociais e e-commerce</p>
                </div>
            </div>

            {/* Social Media Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800">Redes Sociais</h2>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={() => handleConnect('facebook')}
                        className="flex items-center gap-2 bg-[#1877F2] text-white px-4 py-2 rounded-md hover:bg-[#1877F2]/90 transition-colors"
                    >
                        <Facebook className="w-5 h-5" />
                        Conectar Facebook
                    </button>
                    <button
                        onClick={() => handleConnect('youtube')}
                        className="flex items-center gap-2 bg-[#FF0000] text-white px-4 py-2 rounded-md hover:bg-[#FF0000]/90 transition-colors"
                    >
                        <Youtube className="w-5 h-5" />
                        Conectar YouTube
                    </button>
                    <button
                        onClick={() => handleConnect('tiktok')}
                        className="flex items-center gap-2 bg-[#000000] text-white px-4 py-2 rounded-md hover:bg-[#333333]/90 transition-colors"
                    >
                        <Music className="w-5 h-5" />
                        Conectar TikTok
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {accounts.map((account) => (
                            <div key={account.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${account.platform === 'facebook' ? 'bg-[#1877F2]/10 text-[#1877F2]' :
                                            account.platform === 'instagram' ? 'bg-pink-100 text-pink-600' :
                                                account.platform === 'youtube' ? 'bg-[#FF0000]/10 text-[#FF0000]' :
                                                    account.platform === 'tiktok' ? 'bg-black/10 text-black' :
                                                        'bg-gray-100 text-gray-500'
                                            }`}>
                                            {account.platform === 'facebook' && <Facebook className="w-5 h-5" />}
                                            {account.platform === 'instagram' && <Instagram className="w-5 h-5" />}
                                            {account.platform === 'youtube' && <Youtube className="w-5 h-5" />}
                                            {account.platform === 'tiktok' && <Music className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{account.accountName}</h3>
                                            <p className="text-xs text-gray-500 capitalize">{account.platform}</p>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${account.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {account.status === 'active' ? 'Ativo' : 'Inativo'}
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t flex justify-between">
                                    {account.platform === 'instagram' && (
                                        <button
                                            onClick={() => handleOpenTokenModal(account)}
                                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                                        >
                                            <Key className="w-4 h-4" />
                                            Editar Token
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
                                        Desconectar
                                    </button>
                                </div>
                            </div>
                        ))}

                        {accounts.length === 0 && (
                            <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed text-gray-500">
                                Nenhuma conta conectada ainda. Selecione uma plataforma acima para comecar.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Customer Support Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800">Suporte ao Cliente</h2>
                <p className="text-sm text-gray-500">Conecte plataformas de atendimento para registrar mensagens de broadcast</p>

                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={() => setShowChatwootModal(true)}
                        disabled={!!chatwootIntegration}
                        className="flex items-center gap-2 bg-[#1f93ff] text-white px-4 py-2 rounded-md hover:bg-[#1f93ff]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <MessageCircle className="w-5 h-5" />
                        {chatwootIntegration ? 'Chatwoot Conectado' : 'Conectar Chatwoot'}
                    </button>
                </div>

                {/* Connected Support Integrations */}
                {integrations.filter(i => i.type === 'chatwoot').length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {integrations.filter(i => i.type === 'chatwoot').map((integration) => (
                            <div key={integration.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1f93ff]/10 text-[#1f93ff]">
                                            <MessageCircle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                                            <p className="text-xs text-gray-500">Chatwoot</p>
                                        </div>
                                    </div>
                                    <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        Conectado
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
                                <div className="mt-4 pt-4 border-t flex justify-end">
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
                                        Remover
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* E-commerce Integrations Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800">Integracoes E-commerce</h2>
                <p className="text-sm text-gray-500">Conecte sua loja para importar produtos automaticamente</p>

                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={() => setShowWooCommerceModal(true)}
                        disabled={!!wooCommerceIntegration}
                        className="flex items-center gap-2 bg-[#96588A] text-white px-4 py-2 rounded-md hover:bg-[#96588A]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ShoppingCart className="w-5 h-5" />
                        {wooCommerceIntegration ? 'WooCommerce Conectado' : 'Conectar WooCommerce'}
                    </button>
                </div>

                {/* Connected Integrations */}
                {integrations.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {integrations.map((integration) => (
                            <div key={integration.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#96588A]/10 text-[#96588A]">
                                            <ShoppingCart className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                                            <p className="text-xs text-gray-500">WooCommerce</p>
                                        </div>
                                    </div>
                                    <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        Conectado
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
                                <div className="mt-4 pt-4 border-t flex justify-end">
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
                                        Remover
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* WooCommerce Modal */}
            {showWooCommerceModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b bg-gradient-to-r from-[#96588A] to-[#7f4276]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ShoppingCart className="w-8 h-8 text-white" />
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Conectar WooCommerce</h3>
                                        <p className="text-white/80 text-sm">Importe seus produtos automaticamente</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowWooCommerceModal(false);
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Loja</label>
                                <input
                                    type="text"
                                    placeholder="Minha Loja"
                                    value={wooForm.name}
                                    onChange={(e) => setWooForm({ ...wooForm, name: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#96588A] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">URL da Loja *</label>
                                <input
                                    type="url"
                                    placeholder="https://minhaloja.com.br"
                                    value={wooForm.storeUrl}
                                    onChange={(e) => setWooForm({ ...wooForm, storeUrl: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#96588A] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Key *</label>
                                <input
                                    type="text"
                                    placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    value={wooForm.consumerKey}
                                    onChange={(e) => setWooForm({ ...wooForm, consumerKey: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#96588A] focus:border-transparent font-mono text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Secret *</label>
                                <input
                                    type="password"
                                    placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    value={wooForm.consumerSecret}
                                    onChange={(e) => setWooForm({ ...wooForm, consumerSecret: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#96588A] focus:border-transparent font-mono text-sm"
                                />
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-xs text-gray-600">
                                    <strong>Como obter as credenciais:</strong><br />
                                    1. Acesse seu WordPress Admin<br />
                                    2. Va em WooCommerce {'>'} Configuracoes {'>'} Avancado {'>'} REST API<br />
                                    3. Clique em "Adicionar chave"<br />
                                    4. Permissoes: Leitura
                                </p>
                            </div>

                            {wooTestResult && (
                                <div className={`p-4 rounded-lg flex items-center gap-2 ${wooTestResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                    }`}>
                                    {wooTestResult.success ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                    <span className="text-sm">{wooTestResult.message}</span>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t bg-gray-50 flex justify-between">
                            <button
                                onClick={handleTestWooCommerce}
                                disabled={testingWoo}
                                className="px-4 py-2 text-[#96588A] border border-[#96588A] rounded-lg hover:bg-[#96588A]/10 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {testingWoo ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Testar Conexao
                            </button>
                            <button
                                onClick={handleSaveWooCommerce}
                                disabled={savingWoo || !wooTestResult?.success}
                                className="px-6 py-2 bg-[#96588A] text-white rounded-lg hover:bg-[#7f4276] transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {savingWoo ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Salvar Integracao
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chatwoot Modal */}
            {showChatwootModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b bg-gradient-to-r from-[#1f93ff] to-[#0c7ce6] shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <MessageCircle className="w-8 h-8 text-white" />
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Conectar Chatwoot</h3>
                                        <p className="text-white/80 text-sm">Instagram DMs + Broadcasts no Chatwoot</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowChatwootModal(false);
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Integracao</label>
                                <input
                                    type="text"
                                    placeholder="Meu Chatwoot"
                                    value={chatwootForm.name}
                                    onChange={(e) => setChatwootForm({ ...chatwootForm, name: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f93ff] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">URL do Chatwoot *</label>
                                <input
                                    type="url"
                                    placeholder="https://app.chatwoot.com"
                                    value={chatwootForm.chatwootUrl}
                                    onChange={(e) => setChatwootForm({ ...chatwootForm, chatwootUrl: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f93ff] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Token de Acesso *</label>
                                <input
                                    type="password"
                                    placeholder="Seu token de acesso"
                                    value={chatwootForm.accessToken}
                                    onChange={(e) => setChatwootForm({ ...chatwootForm, accessToken: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f93ff] focus:border-transparent font-mono text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ID da Conta (Account ID) *</label>
                                <input
                                    type="number"
                                    placeholder="1"
                                    value={chatwootForm.accountId}
                                    onChange={(e) => setChatwootForm({ ...chatwootForm, accountId: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f93ff] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Inbox ID (Broadcast/WhatsApp)</label>
                                <input
                                    type="number"
                                    placeholder="1"
                                    value={chatwootForm.inboxId}
                                    onChange={(e) => setChatwootForm({ ...chatwootForm, inboxId: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f93ff] focus:border-transparent"
                                />
                                <p className="text-xs text-gray-400 mt-1">Caixa de entrada usada para broadcasts</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Inbox ID do Instagram (DMs)
                                    <span className="ml-1 text-xs font-normal text-gray-400">- para receber DMs do Instagram</span>
                                </label>
                                <input
                                    type="number"
                                    placeholder="Ex: 5"
                                    value={chatwootForm.instagramInboxId}
                                    onChange={(e) => setChatwootForm({ ...chatwootForm, instagramInboxId: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f93ff] focus:border-transparent"
                                />
                                <p className="text-xs text-gray-400 mt-1">Crie um inbox do tipo "API" no Chatwoot para o Instagram</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Conta Instagram
                                    <span className="ml-1 text-xs font-normal text-gray-400">- vincular ao Chatwoot</span>
                                </label>
                                <select
                                    value={chatwootForm.instagramAccountId}
                                    onChange={(e) => setChatwootForm({ ...chatwootForm, instagramAccountId: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f93ff] focus:border-transparent bg-white"
                                >
                                    <option value="">Selecione uma conta Instagram</option>
                                    {accounts
                                        .filter((a) => a.platform === 'instagram' && a.status === 'active')
                                        .map((acc) => (
                                            <option key={acc.accountId} value={acc.accountId}>
                                                {acc.accountName}
                                            </option>
                                        ))}
                                </select>
                                <p className="text-xs text-gray-400 mt-1">Selecione qual conta Instagram tera as DMs integradas ao Chatwoot</p>
                            </div>

                            {/* Webhook URL - shown after test succeeds */}
                            {chatwootTestResult?.success && (
                                <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Link className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-800">Webhook URL (configure no Chatwoot)</span>
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
                                        No Chatwoot: Configuracoes {'>'} Integracoes {'>'} Webhooks {'>'} Adicionar.
                                        Selecione o evento <strong>message_created</strong>.
                                    </p>
                                </div>
                            )}

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-xs text-gray-600">
                                    <strong>Como configurar:</strong><br />
                                    1. Acesse seu Chatwoot {'>'} Configuracoes {'>'} Perfil {'>'} copie o "Access Token"<br />
                                    2. Account ID: numero na URL (app.chatwoot.com/app/accounts/<strong>[ID]</strong>)<br />
                                    3. Crie um Inbox tipo <strong>"API"</strong> para o Instagram e anote o ID<br />
                                    4. Apos salvar, configure o <strong>Webhook</strong> no Chatwoot com a URL acima<br />
                                    5. Selecione o evento: <strong>message_created</strong>
                                </p>
                            </div>

                            {chatwootTestResult && (
                                <div className={`p-4 rounded-lg flex items-center gap-2 ${chatwootTestResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                    }`}>
                                    {chatwootTestResult.success ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                    <span className="text-sm">{chatwootTestResult.message}</span>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t bg-gray-50 flex justify-between shrink-0">
                            <button
                                onClick={handleTestChatwoot}
                                disabled={testingChatwoot}
                                className="px-4 py-2 text-[#1f93ff] border border-[#1f93ff] rounded-lg hover:bg-[#1f93ff]/10 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {testingChatwoot ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Testar Conexao
                            </button>
                            <button
                                onClick={handleSaveChatwoot}
                                disabled={savingChatwoot || !chatwootTestResult?.success}
                                className="px-6 py-2 bg-[#1f93ff] text-white rounded-lg hover:bg-[#0c7ce6] transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {savingChatwoot ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Salvar Integracao
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Token Modal */}
            {showTokenModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b bg-gradient-to-r from-pink-500 to-purple-600">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Key className="w-8 h-8 text-white" />
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Atualizar Token</h3>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Token de Acesso Permanente *</label>
                                <textarea
                                    placeholder="Cole aqui o token de acesso permanente gerado no Facebook Developer"
                                    value={tokenForm.accessToken}
                                    onChange={(e) => setTokenForm({ ...tokenForm, accessToken: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent font-mono text-sm"
                                />
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-xs text-gray-600">
                                    <strong>Como obter o token permanente:</strong><br />
                                    1. Acesse <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Graph API Explorer</a><br />
                                    2. Selecione seu App e gere um User Token<br />
                                    3. Adicione as permissoes: <code className="bg-gray-200 px-1 rounded">instagram_basic</code>, <code className="bg-gray-200 px-1 rounded">instagram_manage_messages</code>, <code className="bg-gray-200 px-1 rounded">pages_manage_metadata</code><br />
                                    4. Clique em "Generate Access Token"<br />
                                    5. Converta para token de longa duracao no <a href="https://developers.facebook.com/tools/debug/accesstoken" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Access Token Debugger</a>
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t bg-gray-50 flex justify-end">
                            <button
                                onClick={handleSaveToken}
                                disabled={savingToken || !tokenForm.accessToken}
                                className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {savingToken ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Salvar Token
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountsPage;
