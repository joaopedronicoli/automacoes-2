import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
    MessageCircle,
    Plus,
    Trash2,
    ExternalLink,
    Loader2,
    X,
    Wifi,
    WifiOff,
    Users,
    Mail,
    Code,
    Smartphone,
} from 'lucide-react';

interface AccountInfo {
    id: string;
    chatwootAccountId: number;
    chatwootUserEmail: string;
    status: string;
    panelUrl: string;
    usage: { inboxes: number; agents: number; whatsapp: number };
    limits: { maxChatwootInboxes: number; maxChatwootAgents: number; maxWhatsappConnections: number };
}

interface WhatsAppInstance {
    id: string;
    instanceName: string;
    phoneNumber: string | null;
    status: string;
    createdAt: string;
}

const ChatwootPlatformSection = () => {
    const { t } = useTranslation();
    const [account, setAccount] = useState<AccountInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [settingUp, setSettingUp] = useState(false);
    const [inboxes, setInboxes] = useState<any[]>([]);
    const [agents, setAgents] = useState<any[]>([]);
    const [whatsappInstances, setWhatsappInstances] = useState<WhatsAppInstance[]>([]);

    // Modals
    const [showInboxModal, setShowInboxModal] = useState(false);
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const [qrData, setQrData] = useState<any>(null);
    const [qrInstanceId, setQrInstanceId] = useState<string | null>(null);
    const qrIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Forms
    const [inboxForm, setInboxForm] = useState({ type: 'email' as 'email' | 'api', name: '', email: '', webhookUrl: '' });
    const [agentForm, setAgentForm] = useState({ email: '', name: '' });
    const [savingInbox, setSavingInbox] = useState(false);
    const [savingAgent, setSavingAgent] = useState(false);
    const [creatingWhatsapp, setCreatingWhatsapp] = useState(false);

    const fetchAccount = async () => {
        try {
            const res = await api.get('/chatwoot-platform/account');
            setAccount(res.data);
        } catch {
            setAccount(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchInboxes = async () => {
        try {
            const res = await api.get('/chatwoot-platform/inboxes');
            setInboxes(res.data);
        } catch {}
    };

    const fetchAgents = async () => {
        try {
            const res = await api.get('/chatwoot-platform/agents');
            setAgents(res.data);
        } catch {}
    };

    const fetchWhatsapp = async () => {
        try {
            const res = await api.get('/chatwoot-platform/whatsapp');
            setWhatsappInstances(res.data);
        } catch {}
    };

    useEffect(() => {
        fetchAccount();
    }, []);

    useEffect(() => {
        if (account) {
            fetchInboxes();
            fetchAgents();
            fetchWhatsapp();
        }
    }, [account?.id]);

    useEffect(() => {
        return () => {
            if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
        };
    }, []);

    const handleSetup = async () => {
        setSettingUp(true);
        try {
            await api.post('/chatwoot-platform/setup');
            await fetchAccount();
        } catch (err: any) {
            console.error('Setup failed:', err);
        } finally {
            setSettingUp(false);
        }
    };

    const handleCreateInbox = async () => {
        setSavingInbox(true);
        try {
            await api.post('/chatwoot-platform/inboxes', inboxForm);
            setShowInboxModal(false);
            setInboxForm({ type: 'email', name: '', email: '', webhookUrl: '' });
            await fetchInboxes();
            await fetchAccount();
        } catch (err: any) {
            console.error(err);
        } finally {
            setSavingInbox(false);
        }
    };

    const handleDeleteInbox = async (inboxId: number) => {
        if (!confirm(t('accounts.chatwootPlatform.deleteInboxConfirm'))) return;
        try {
            await api.delete(`/chatwoot-platform/inboxes/${inboxId}`);
            await fetchInboxes();
            await fetchAccount();
        } catch (err: any) {
            console.error(err);
        }
    };

    const handleCreateWhatsapp = async () => {
        setCreatingWhatsapp(true);
        try {
            const res = await api.post('/chatwoot-platform/whatsapp');
            const { instance, qrCode } = res.data;
            setQrInstanceId(instance.id);
            setQrData(qrCode);
            setShowQrModal(true);
            startQrPolling(instance.id);
            await fetchWhatsapp();
            await fetchAccount();
        } catch (err: any) {
            console.error(err);
        } finally {
            setCreatingWhatsapp(false);
        }
    };

    const startQrPolling = (instanceId: string) => {
        if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
        qrIntervalRef.current = setInterval(async () => {
            try {
                const res = await api.get(`/chatwoot-platform/whatsapp/${instanceId}/status`);
                if (res.data.status === 'connected') {
                    if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
                    setShowQrModal(false);
                    await fetchWhatsapp();
                    await fetchAccount();
                }
            } catch {}
        }, 3000);
    };

    const handleRefreshQr = async (instanceId: string) => {
        try {
            const res = await api.get(`/chatwoot-platform/whatsapp/${instanceId}/qr`);
            setQrData(res.data);
        } catch {}
    };

    const handleDeleteWhatsapp = async (instanceId: string) => {
        if (!confirm(t('accounts.chatwootPlatform.deleteInboxConfirm'))) return;
        try {
            await api.delete(`/chatwoot-platform/whatsapp/${instanceId}`);
            await fetchWhatsapp();
            await fetchAccount();
        } catch (err: any) {
            console.error(err);
        }
    };

    const handleAddAgent = async () => {
        setSavingAgent(true);
        try {
            await api.post('/chatwoot-platform/agents', agentForm);
            setShowAgentModal(false);
            setAgentForm({ email: '', name: '' });
            await fetchAgents();
            await fetchAccount();
        } catch (err: any) {
            console.error(err);
        } finally {
            setSavingAgent(false);
        }
    };

    const handleRemoveAgent = async (agentId: number) => {
        if (!confirm(t('accounts.chatwootPlatform.deleteInboxConfirm'))) return;
        try {
            await api.delete(`/chatwoot-platform/agents/${agentId}`);
            await fetchAgents();
            await fetchAccount();
        } catch (err: any) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">{t('accounts.chatwootPlatform.title')}</h2>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('common.loading')}
                </div>
            </div>
        );
    }

    // Not set up yet
    if (!account) {
        return (
            <div className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">{t('accounts.chatwootPlatform.title')}</h2>
                    <p className="text-sm text-muted-foreground">{t('accounts.chatwootPlatform.desc')}</p>
                </div>
                <div className="glass-card p-6 rounded-xl text-center space-y-3">
                    <MessageCircle className="w-12 h-12 mx-auto text-[#1f93ff] opacity-50" />
                    <p className="text-sm text-muted-foreground">{t('accounts.chatwootPlatform.setupDesc')}</p>
                    <button
                        onClick={handleSetup}
                        disabled={settingUp}
                        className="inline-flex items-center gap-2 bg-[#1f93ff] text-white px-6 py-2.5 rounded-lg hover:bg-[#1f93ff]/90 transition-colors disabled:opacity-50"
                    >
                        {settingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                        {settingUp ? t('accounts.chatwootPlatform.settingUp') : t('accounts.chatwootPlatform.setup')}
                    </button>
                </div>
            </div>
        );
    }

    const cp = 'accounts.chatwootPlatform';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">{t(`${cp}.title`)}</h2>
                    <p className="text-sm text-muted-foreground">{t(`${cp}.desc`)}</p>
                </div>
                <a
                    href={account.panelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-[#1f93ff] hover:underline"
                >
                    {t(`${cp}.panelLink`)}
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>

            {/* Usage Limits Bar */}
            <div className="glass-card p-4 rounded-xl">
                <h3 className="text-sm font-medium text-foreground mb-3">{t(`${cp}.limits`)}</h3>
                <div className="grid grid-cols-3 gap-4">
                    <LimitBar
                        label={t(`${cp}.inboxes`)}
                        current={account.usage.inboxes}
                        max={account.limits.maxChatwootInboxes}
                        t={t}
                        cp={cp}
                    />
                    <LimitBar
                        label={t(`${cp}.agents`)}
                        current={account.usage.agents}
                        max={account.limits.maxChatwootAgents}
                        t={t}
                        cp={cp}
                    />
                    <LimitBar
                        label="WhatsApp"
                        current={account.usage.whatsapp}
                        max={account.limits.maxWhatsappConnections}
                        t={t}
                        cp={cp}
                    />
                </div>
            </div>

            {/* WhatsApp Connections */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        {t(`${cp}.whatsapp`)}
                    </h3>
                    <button
                        onClick={handleCreateWhatsapp}
                        disabled={creatingWhatsapp || account.usage.whatsapp >= account.limits.maxWhatsappConnections}
                        className="inline-flex items-center gap-1.5 text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                        {creatingWhatsapp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        {t(`${cp}.connectWhatsapp`)}
                    </button>
                </div>
                {whatsappInstances.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {whatsappInstances.map((inst) => (
                            <div key={inst.id} className="glass-card p-4 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {inst.status === 'connected' ? (
                                        <Wifi className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <WifiOff className="w-5 h-5 text-yellow-500" />
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {inst.phoneNumber || inst.instanceName}
                                        </p>
                                        <p className={`text-xs ${inst.status === 'connected' ? 'text-green-600' : 'text-yellow-600'}`}>
                                            {inst.status === 'connected' ? t(`${cp}.connected`) : t(`${cp}.disconnected`)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {inst.status !== 'connected' && (
                                        <button
                                            onClick={() => {
                                                setQrInstanceId(inst.id);
                                                handleRefreshQr(inst.id);
                                                setShowQrModal(true);
                                                startQrPolling(inst.id);
                                            }}
                                            className="text-xs text-[#1f93ff] hover:underline"
                                        >
                                            QR Code
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteWhatsapp(inst.id)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">{t(`${cp}.disconnected`)}</p>
                )}
            </div>

            {/* Inboxes */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {t(`${cp}.inboxes`)}
                    </h3>
                    <button
                        onClick={() => setShowInboxModal(true)}
                        disabled={account.usage.inboxes >= account.limits.maxChatwootInboxes}
                        className="inline-flex items-center gap-1.5 text-sm bg-[#1f93ff] text-white px-3 py-1.5 rounded-lg hover:bg-[#1f93ff]/90 transition-colors disabled:opacity-50"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        {t(`${cp}.createInbox`)}
                    </button>
                </div>
                {inboxes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {inboxes.map((inbox: any) => (
                            <div key={inbox.id} className="glass-card p-4 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                                        {inbox.channel_type?.includes('email') ? <Mail className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{inbox.name}</p>
                                        <p className="text-xs text-muted-foreground">{inbox.channel_type || 'api'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteInbox(inbox.id)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>

            {/* Agents */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {t(`${cp}.agents`)}
                    </h3>
                    <button
                        onClick={() => setShowAgentModal(true)}
                        disabled={account.usage.agents >= account.limits.maxChatwootAgents}
                        className="inline-flex items-center gap-1.5 text-sm bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        {t(`${cp}.addAgent`)}
                    </button>
                </div>
                {agents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {agents.map((agent: any) => (
                            <div key={agent.id} className="glass-card p-4 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-sm font-medium text-white">
                                        {agent.name?.[0]?.toUpperCase() || 'A'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{agent.name}</p>
                                        <p className="text-xs text-muted-foreground">{agent.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveAgent(agent.id)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>

            {/* QR Code Modal */}
            {showQrModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowQrModal(false); if (qrIntervalRef.current) clearInterval(qrIntervalRef.current); }}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-foreground">{t(`${cp}.connectWhatsapp`)}</h3>
                            <button onClick={() => { setShowQrModal(false); if (qrIntervalRef.current) clearInterval(qrIntervalRef.current); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 flex flex-col items-center gap-4">
                            <p className="text-sm text-muted-foreground text-center">{t(`${cp}.scanQr`)}</p>
                            {qrData?.qrcode?.base64 ? (
                                <img src={qrData.qrcode.base64} alt="QR Code" className="w-64 h-64 rounded-lg" />
                            ) : qrData?.base64 ? (
                                <img src={qrData.base64} alt="QR Code" className="w-64 h-64 rounded-lg" />
                            ) : (
                                <div className="w-64 h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {t(`${cp}.connecting`)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Inbox Modal */}
            {showInboxModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowInboxModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-foreground">{t(`${cp}.createInbox`)}</h3>
                            <button onClick={() => setShowInboxModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">{t(`${cp}.inboxType`)}</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setInboxForm({ ...inboxForm, type: 'email' })}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${inboxForm.type === 'email' ? 'bg-[#1f93ff] text-white' : 'bg-gray-100 dark:bg-gray-700 text-foreground'}`}
                                    >
                                        {t(`${cp}.emailInbox`)}
                                    </button>
                                    <button
                                        onClick={() => setInboxForm({ ...inboxForm, type: 'api' })}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${inboxForm.type === 'api' ? 'bg-[#1f93ff] text-white' : 'bg-gray-100 dark:bg-gray-700 text-foreground'}`}
                                    >
                                        {t(`${cp}.apiInbox`)}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">{t(`${cp}.inboxName`)}</label>
                                <input
                                    type="text"
                                    value={inboxForm.name}
                                    onChange={(e) => setInboxForm({ ...inboxForm, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground focus:ring-2 focus:ring-[#1f93ff] focus:border-transparent"
                                />
                            </div>
                            {inboxForm.type === 'email' && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">{t(`${cp}.inboxEmail`)}</label>
                                    <input
                                        type="email"
                                        value={inboxForm.email}
                                        onChange={(e) => setInboxForm({ ...inboxForm, email: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground focus:ring-2 focus:ring-[#1f93ff] focus:border-transparent"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                            <button onClick={() => setShowInboxModal(false)} className="px-4 py-2 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleCreateInbox}
                                disabled={savingInbox || !inboxForm.name}
                                className="px-4 py-2 text-sm bg-[#1f93ff] text-white rounded-lg hover:bg-[#1f93ff]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {savingInbox && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('common.create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Agent Modal */}
            {showAgentModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAgentModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-foreground">{t(`${cp}.addAgent`)}</h3>
                            <button onClick={() => setShowAgentModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">{t(`${cp}.agentName`)}</label>
                                <input
                                    type="text"
                                    value={agentForm.name}
                                    onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">{t(`${cp}.agentEmail`)}</label>
                                <input
                                    type="email"
                                    value={agentForm.email}
                                    onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                            <button onClick={() => setShowAgentModal(false)} className="px-4 py-2 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleAddAgent}
                                disabled={savingAgent || !agentForm.email || !agentForm.name}
                                className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {savingAgent && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t(`${cp}.addAgent`)}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const LimitBar = ({ label, current, max, t, cp }: { label: string; current: number; max: number; t: any; cp: string }) => {
    const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
    const isAtLimit = current >= max;

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span className="text-foreground font-medium">{label}</span>
                <span className={isAtLimit ? 'text-red-500 font-semibold' : 'text-muted-foreground'}>
                    {current} {t(`${cp}.of`)} {max}
                </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${isAtLimit ? 'bg-red-500' : 'bg-[#1f93ff]'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
};

export default ChatwootPlatformSection;
