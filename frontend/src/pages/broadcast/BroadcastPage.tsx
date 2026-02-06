import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
    Loader2,
    Upload,
    Send,
    Phone,
    FileSpreadsheet,
    Users,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    RefreshCw,
    Trash2,
    X,
    Download,
    Eye,
    Calendar,
    Pause,
    Play,
    RotateCcw,
    BarChart3,
    Link2,
    Search,
    Image
} from 'lucide-react';

interface WABA {
    id: string;
    name: string;
}

interface PhoneNumber {
    id: string;
    display_phone_number: string;
    verified_name: string;
}

interface MessageTemplate {
    id: string;
    name: string;
    language: string;
    category: string;
    components: Array<{
        type: string;
        text?: string;
        buttons?: Array<{
            type?: string;
            text?: string;
            url?: string;
        }>;
    }>;
}

interface Contact {
    name: string;
    phone: string;
    status?: 'pending' | 'sent' | 'failed';
    error?: string;
    [key: string]: any; // Dynamic fields from CSV
}

interface TemplateVariable {
    index: number;
    componentType: 'HEADER' | 'BODY' | 'BUTTON';
    placeholder: string;
}

interface VariableMapping {
    variableIndex: number;
    componentType: 'HEADER' | 'BODY' | 'BUTTON';
    source: 'csv' | 'manual';
    csvColumn?: string;
    manualValue?: string;
}

interface Broadcast {
    id: string;
    name: string;
    templateName: string;
    templateLanguage: string;
    status: 'pending' | 'scheduled' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled';
    totalContacts: number;
    sentCount: number;
    failedCount: number;
    createdAt: string;
    completedAt?: string;
    scheduledAt?: string;
    timeWindowStart?: string;
    timeWindowEnd?: string;
    contacts: Contact[];
}

interface ChatwootSyncResult {
    synced: number;
    missing: number;
    created: number;
    errors: number;
    errorDetails: Array<{ phone: string; error: string }>;
    contacts?: Array<{ name: string; phone: string; chatwootSyncStatus?: string; chatwootContactId?: number }>;
}

interface DuplicateCheckResult {
    duplicateCount: number;
    uniqueCount: number;
    duplicatePhones: string[];
}

interface PreviewResult {
    headerText?: string;
    bodyText: string;
    footerText?: string;
}

interface Analytics {
    totalBroadcasts: number;
    totalSent: number;
    totalFailed: number;
    totalSkipped: number;
    successRate: number;
}

interface ContactLog {
    name: string;
    phone: string;
    status: 'pending' | 'sent' | 'failed' | 'skipped';
    error?: string;
    messageId?: string;
    sentAt?: string;
    retryAttempts?: number;
}

interface LogsResult {
    contacts: ContactLog[];
    total: number;
    page: number;
    limit: number;
    broadcast: {
        name: string;
        templateName: string;
        status: string;
        createdAt: string;
    };
}

interface ChatwootIntegration {
    id: string;
    name: string;
    storeUrl: string;
    metadata: {
        inboxId: number;
        accountId: number;
    };
}

const BroadcastPage = () => {
    // State
    const [wabas, setWabas] = useState<WABA[]>([]);
    const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);

    const [selectedWaba, setSelectedWaba] = useState('');
    const [selectedPhone, setSelectedPhone] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
    const [broadcastName, setBroadcastName] = useState('');
    const [contacts, setContacts] = useState<Contact[]>([]);

    // New states for variable system
    const [broadcastMode, setBroadcastMode] = useState<'bulk' | 'single'>('bulk');
    const [singleRecipient, setSingleRecipient] = useState({ name: '', phone: '' });
    const [csvColumns, setCsvColumns] = useState<string[]>([]);
    const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([]);
    const [variableMappings, setVariableMappings] = useState<VariableMapping[]>([]);

    const [loadingWabas, setLoadingWabas] = useState(false);
    const [loadingPhones, setLoadingPhones] = useState(false);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);

    const [uploadErrors, setUploadErrors] = useState<string[]>([]);
    const [dragActive, setDragActive] = useState(false);

    // New states for enhanced features
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledAt, setScheduledAt] = useState('');
    const [timeWindowStart, setTimeWindowStart] = useState('');
    const [timeWindowEnd, setTimeWindowEnd] = useState('');
    const [enableDeduplication, setEnableDeduplication] = useState(false);
    const [duplicateResult, setDuplicateResult] = useState<DuplicateCheckResult | null>(null);
    const [chatwootSyncResult, setChatwootSyncResult] = useState<ChatwootSyncResult | null>(null);
    const [syncingChatwoot, setSyncingChatwoot] = useState(false);
    const [creatingChatwootContacts, setCreatingChatwootContacts] = useState(false);
    const [chatwootCreationResult, setChatwootCreationResult] = useState<{
        created: number;
        errors: number;
        errorDetails: Array<{ phone: string; error: string }>;
    } | null>(null);
    const [showChatwootSyncModal, setShowChatwootSyncModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [chatwootIntegrations, setChatwootIntegrations] = useState<ChatwootIntegration[]>([]);
    const [selectedChatwoot, setSelectedChatwoot] = useState<string>('');
    const [templateSearch, setTemplateSearch] = useState('');
    const [headerMediaUrl, setHeaderMediaUrl] = useState('');
    // Logs state
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [logsResult, setLogsResult] = useState<LogsResult | null>(null);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [logsFilter, setLogsFilter] = useState<string>('all');

    // Chatwoot labels state
    const [chatwootLabels, setChatwootLabels] = useState<Array<{ id: number; title: string; color: string }>>([]);
    const [conversationTags, setConversationTags] = useState<string[]>([]);
    const [contactTags, setContactTags] = useState<string[]>([]);
    const [newConversationTag, setNewConversationTag] = useState('');
    const [newContactTag, setNewContactTag] = useState('');

    // Fetch WABAs on mount
    useEffect(() => {
        fetchWabas();
        fetchBroadcasts();
        fetchAnalytics();
        fetchChatwootIntegrations();
    }, []);

    const fetchChatwootIntegrations = async () => {
        try {
            const res = await api.get('/integrations/chatwoot');
            setChatwootIntegrations(res.data);
            // Auto-select first one if available
            if (res.data.length > 0 && !selectedChatwoot) {
                setSelectedChatwoot(res.data[0].id);
                // Fetch labels for the first integration
                fetchChatwootLabels(res.data[0].id);
            }
        } catch (error) {
            console.error('Erro ao carregar integracoes Chatwoot:', error);
        }
    };

    const fetchChatwootLabels = async (integrationId: string) => {
        try {
            const res = await api.get(`/integrations/chatwoot/${integrationId}/labels`);
            setChatwootLabels(res.data);
        } catch (error) {
            console.error('Erro ao carregar labels do Chatwoot:', error);
            setChatwootLabels([]);
        }
    };

    const handleChatwootChange = (integrationId: string) => {
        setSelectedChatwoot(integrationId);
        setConversationTags([]);
        setContactTags([]);
        if (integrationId) {
            fetchChatwootLabels(integrationId);
        } else {
            setChatwootLabels([]);
        }
    };

    const addConversationTag = (tag: string) => {
        if (tag && !conversationTags.includes(tag)) {
            setConversationTags([...conversationTags, tag]);
        }
        setNewConversationTag('');
    };

    const removeConversationTag = (tag: string) => {
        setConversationTags(conversationTags.filter(t => t !== tag));
    };

    const addContactTag = (tag: string) => {
        if (tag && !contactTags.includes(tag)) {
            setContactTags([...contactTags, tag]);
        }
        setNewContactTag('');
    };

    const removeContactTag = (tag: string) => {
        setContactTags(contactTags.filter(t => t !== tag));
    };

    // Check for duplicates when deduplication is enabled
    useEffect(() => {
        if (enableDeduplication && broadcastName && contacts.length > 0) {
            checkDuplicates();
        } else {
            setDuplicateResult(null);
        }
    }, [enableDeduplication, broadcastName, contacts]);

    // Check Chatwoot contacts when CSV is loaded and Chatwoot is selected
    useEffect(() => {
        if (selectedChatwoot && contacts.length > 0) {
            handleCheckChatwootContacts(contacts);
        } else {
            setChatwootSyncResult(null);
        }
    }, [selectedChatwoot, contacts.length]);

    const fetchAnalytics = async () => {
        try {
            const res = await api.get('/broadcast/analytics');
            setAnalytics(res.data);
        } catch (error) {
            console.error('Erro ao carregar analytics:', error);
        }
    };

    const fetchLogs = async (broadcastId: string, status: string = 'all') => {
        setLoadingLogs(true);
        try {
            const res = await api.get(`/broadcast/${broadcastId}/logs`, {
                params: { status: status === 'all' ? undefined : status, limit: 100 }
            });
            setLogsResult(res.data);
            setShowLogsModal(true);
        } catch (error: any) {
            console.error('Erro ao carregar logs:', error);
            alert(error.response?.data?.message || 'Erro ao carregar logs');
        } finally {
            setLoadingLogs(false);
        }
    };

    const checkDuplicates = async () => {
        if (!broadcastName || contacts.length === 0) return;
        try {
            const res = await api.post('/broadcast/check-duplicates', {
                name: broadcastName,
                contacts,
            });
            setDuplicateResult(res.data);
        } catch (error) {
            console.error('Erro ao verificar duplicados:', error);
        }
    };

    const handleChatwootSync = async (broadcastId: string) => {
        setSyncingChatwoot(true);
        try {
            const res = await api.post(`/broadcast/${broadcastId}/chatwoot-sync`);
            setChatwootSyncResult(res.data);
            setShowChatwootSyncModal(true);
            fetchBroadcasts();
        } catch (error: any) {
            console.error('Erro ao sincronizar Chatwoot:', error);
            alert(error.response?.data?.message || 'Erro ao sincronizar com Chatwoot');
        } finally {
            setSyncingChatwoot(false);
        }
    };

    const handleCreateMissingChatwoot = async (broadcastId: string) => {
        setSyncingChatwoot(true);
        try {
            const res = await api.post(`/broadcast/${broadcastId}/chatwoot-create-missing`);
            setChatwootSyncResult(res.data);
            fetchBroadcasts();
            alert(`${res.data.created} contatos criados no Chatwoot`);
        } catch (error: any) {
            console.error('Erro ao criar contatos:', error);
            alert(error.response?.data?.message || 'Erro ao criar contatos no Chatwoot');
        } finally {
            setSyncingChatwoot(false);
        }
    };

    const handlePreviewTemplate = async () => {
        if (!selectedTemplate) return;
        setLoadingPreview(true);
        try {
            const res = await api.post('/broadcast/preview-template', {
                templateName: selectedTemplate.name,
                templateLanguage: selectedTemplate.language,
                wabaId: selectedWaba,
                variableMappings,
                sampleContact: contacts.length > 0 ? contacts[0] : undefined,
            });
            setPreviewResult(res.data);
            setShowPreviewModal(true);
        } catch (error: any) {
            console.error('Erro ao gerar preview:', error);
            alert('Erro ao gerar preview do template');
        } finally {
            setLoadingPreview(false);
        }
    };

    const handlePauseBroadcast = async (broadcastId: string) => {
        try {
            await api.post(`/broadcast/${broadcastId}/pause`);
            fetchBroadcasts();
        } catch (error) {
            console.error('Erro ao pausar broadcast:', error);
        }
    };

    const handleResumeBroadcast = async (broadcastId: string) => {
        try {
            await api.post(`/broadcast/${broadcastId}/resume`);
            fetchBroadcasts();
        } catch (error) {
            console.error('Erro ao retomar broadcast:', error);
        }
    };

    const handleRetryFailed = async (broadcastId: string) => {
        try {
            await api.post(`/broadcast/${broadcastId}/retry-failed`);
            fetchBroadcasts();
            alert('Reenvio iniciado para mensagens com falha');
        } catch (error: any) {
            console.error('Erro ao reenviar:', error);
            alert(error.response?.data?.message || 'Erro ao reenviar mensagens');
        }
    };

    // Auto-sync contacts with Chatwoot when CSV is loaded and Chatwoot is selected
    const handleCheckChatwootContacts = async (contactsToCheck: Contact[]) => {
        if (!selectedChatwoot || contactsToCheck.length === 0) return;

        setSyncingChatwoot(true);
        setChatwootSyncResult(null);
        setCreatingChatwootContacts(false);
        setChatwootCreationResult(null);
        try {
            const res = await api.post('/broadcast/check-chatwoot-contacts', {
                chatwootIntegrationId: selectedChatwoot,
                contacts: contactsToCheck.map(c => ({ name: c.name, phone: c.phone })),
            });
            setChatwootSyncResult(res.data);
            // Merge sync status back into original contacts (preserve CSV fields)
            if (res.data.contacts) {
                const syncMap = new Map<string, any>();
                for (const sc of res.data.contacts) {
                    syncMap.set(sc.phone, sc);
                }
                setContacts(prev => prev.map(c => {
                    const synced = syncMap.get(c.phone);
                    return synced ? { ...c, chatwootSyncStatus: synced.chatwootSyncStatus, chatwootContactId: synced.chatwootContactId } : c;
                }));
            }
        } catch (error: any) {
            console.error('Erro ao verificar Chatwoot:', error);
            // Don't show alert, just log - user can still proceed
        } finally {
            setSyncingChatwoot(false);
        }
    };

    // Create missing contacts in Chatwoot
    const handleCreateChatwootContacts = async () => {
        console.log('[CriarContatos] Botao clicado!');
        console.log('[CriarContatos] selectedChatwoot:', selectedChatwoot);
        console.log('[CriarContatos] chatwootSyncResult:', JSON.stringify(chatwootSyncResult));
        console.log('[CriarContatos] contacts.length:', contacts.length);

        if (!selectedChatwoot) {
            console.log('[CriarContatos] RETURN: selectedChatwoot vazio');
            return;
        }

        if (!chatwootSyncResult) {
            console.log('[CriarContatos] RETURN: chatwootSyncResult nulo');
            return;
        }

        // Use contacts from chatwootSyncResult (which have correct chatwootSyncStatus)
        // Fall back to main contacts if syncResult doesn't have them
        const syncContacts = chatwootSyncResult.contacts;
        console.log('[CriarContatos] syncContacts:', syncContacts?.length, 'items');

        const contactsToCreate = syncContacts || contacts.map(c => ({
            name: c.name,
            phone: c.phone,
            chatwootSyncStatus: 'missing' as string,
        }));

        console.log('[CriarContatos] contactsToCreate:', contactsToCreate.length);

        if (contactsToCreate.length === 0) {
            console.log('[CriarContatos] RETURN: contactsToCreate vazio');
            return;
        }

        console.log('[CriarContatos] Iniciando criacao...');
        setCreatingChatwootContacts(true);
        setChatwootCreationResult(null);
        try {
            const res = await api.post('/broadcast/create-chatwoot-contacts', {
                chatwootIntegrationId: selectedChatwoot,
                contacts: contactsToCreate,
            });

            console.log('[CriarContatos] Resposta:', JSON.stringify(res.data));

            // Update sync result
            setChatwootSyncResult(res.data);

            // Save creation result for displaying summary
            setChatwootCreationResult({
                created: res.data.created || 0,
                errors: res.data.errors || 0,
                errorDetails: res.data.errorDetails || [],
            });

            // Merge updated sync status back into contacts (preserve CSV fields)
            if (res.data.contacts) {
                const syncMap = new Map<string, any>();
                for (const sc of res.data.contacts) {
                    syncMap.set(sc.phone, sc);
                }
                setContacts(prev => prev.map(c => {
                    const synced = syncMap.get(c.phone);
                    return synced ? { ...c, chatwootSyncStatus: synced.chatwootSyncStatus, chatwootContactId: synced.chatwootContactId } : c;
                }));
            }
        } catch (error: any) {
            console.error('[CriarContatos] ERRO:', error);
            console.error('[CriarContatos] Response:', error.response?.data);
            setChatwootCreationResult({
                created: 0,
                errors: chatwootSyncResult?.missing || contactsToCreate.length,
                errorDetails: [{ phone: '-', error: error.response?.data?.message || error.message || 'Erro ao criar contatos no Chatwoot' }],
            });
        } finally {
            setCreatingChatwootContacts(false);
            console.log('[CriarContatos] Finalizado');
        }
    };

    const fetchWabas = async () => {
        setLoadingWabas(true);
        try {
            const res = await api.get('/whatsapp/wabas');
            setWabas(res.data);
        } catch (error) {
            console.error('Erro ao carregar WABAs:', error);
        } finally {
            setLoadingWabas(false);
        }
    };

    const fetchPhoneNumbers = async (wabaId: string) => {
        setLoadingPhones(true);
        try {
            const res = await api.get(`/whatsapp/${wabaId}/phone-numbers`);
            setPhoneNumbers(res.data);
        } catch (error) {
            console.error('Erro ao carregar numeros:', error);
        } finally {
            setLoadingPhones(false);
        }
    };

    const fetchTemplates = async (wabaId: string) => {
        setLoadingTemplates(true);
        try {
            const res = await api.get(`/whatsapp/${wabaId}/templates`);
            setTemplates(res.data);
        } catch (error) {
            console.error('Erro ao carregar templates:', error);
        } finally {
            setLoadingTemplates(false);
        }
    };

    const fetchBroadcasts = async () => {
        setLoadingBroadcasts(true);
        try {
            const res = await api.get('/broadcast');
            setBroadcasts(res.data);
        } catch (error) {
            console.error('Erro ao carregar broadcasts:', error);
        } finally {
            setLoadingBroadcasts(false);
        }
    };

    // Download CSV template
    const handleDownloadTemplate = async () => {
        try {
            const response = await api.get('/broadcast/csv-template', {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'broadcast-template.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erro ao baixar template:', error);
            alert('Erro ao baixar template CSV');
        }
    };

    // Handle WABA change
    const handleWabaChange = (wabaId: string) => {
        setSelectedWaba(wabaId);
        setSelectedPhone('');
        setSelectedTemplate(null);
        setPhoneNumbers([]);
        setTemplates([]);
        if (wabaId) {
            fetchPhoneNumbers(wabaId);
            fetchTemplates(wabaId);
        }
    };

    // Handle file upload
    const handleFileUpload = async (file: File) => {
        if (!file) return;

        setUploading(true);
        setUploadErrors([]);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/broadcast/upload-csv', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setContacts(res.data.contacts);
            setCsvColumns(res.data.detectedColumns || []);

            if (res.data.errors.length > 0) {
                setUploadErrors(res.data.errors);
            }
        } catch (error: any) {
            console.error('Erro ao fazer upload:', error);
            setUploadErrors([error.response?.data?.message || 'Erro ao processar arquivo']);
        } finally {
            setUploading(false);
        }
    };

    // Detect template variables
    const detectTemplateVariables = (template: MessageTemplate) => {
        const variables: TemplateVariable[] = [];

        for (const component of template.components || []) {
            let componentType: 'HEADER' | 'BODY' | 'BUTTON' = 'BODY';
            let text = '';

            if (component.type === 'HEADER' && component.text) {
                componentType = 'HEADER';
                text = component.text;
            } else if (component.type === 'BODY' && component.text) {
                componentType = 'BODY';
                text = component.text;
            } else if (component.type === 'BUTTONS') {
                componentType = 'BUTTON';
                // Search in button.url if available
                const buttons = component.buttons || [];
                for (const button of buttons) {
                    if (button.url) text = button.url;
                }
            }

            const regex = /\{\{(\d+)\}\}/g;
            let match;
            while ((match = regex.exec(text)) !== null) {
                variables.push({
                    index: parseInt(match[1]),
                    componentType,
                    placeholder: match[0],
                });
            }
        }

        setTemplateVariables(variables);

        // Initialize empty mappings
        setVariableMappings(variables.map(v => ({
            variableIndex: v.index,
            componentType: v.componentType,
            source: 'manual',
            manualValue: '',
        })));

        // Reset media URL when template changes
        setHeaderMediaUrl('');
    };

    // Detect if template has media header
    const getTemplateHeaderType = (template: MessageTemplate | null): 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'TEXT' | null => {
        if (!template) return null;
        const headerComponent = template.components?.find(c => c.type === 'HEADER');
        if (!headerComponent) return null;
        // Check format field which indicates media type
        const format = (headerComponent as any).format;
        if (format === 'IMAGE' || format === 'VIDEO' || format === 'DOCUMENT') {
            return format;
        }
        if (headerComponent.text) return 'TEXT';
        return null;
    };

    // Filter and sort templates
    const filteredTemplates = templates
        .filter(t => t.name.toLowerCase().includes(templateSearch.toLowerCase()))
        .sort((a, b) => {
            const aStartsWithNumber = /^\d/.test(a.name);
            const bStartsWithNumber = /^\d/.test(b.name);
            if (aStartsWithNumber && !bStartsWithNumber) return 1;
            if (!aStartsWithNumber && bStartsWithNumber) return -1;
            return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
        });

    // Drag and drop handlers
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    }, []);

    // Send broadcast
    const handleSendBroadcast = async () => {
        // Basic validations
        if (!selectedWaba || !selectedPhone || !selectedTemplate) {
            alert('Preencha todos os campos obrigatorios');
            return;
        }

        if (broadcastMode === 'bulk' && contacts.length === 0) {
            alert('Faca upload de um arquivo CSV');
            return;
        }

        if (broadcastMode === 'single' && (!singleRecipient.name || !singleRecipient.phone)) {
            alert('Preencha nome e telefone');
            return;
        }

        // Validate variable mappings
        if (templateVariables.length > 0) {
            const invalid = variableMappings.filter(m =>
                (m.source === 'csv' && !m.csvColumn) ||
                (m.source === 'manual' && !m.manualValue)
            );
            if (invalid.length > 0) {
                alert('Preencha todos os mapeamentos de variaveis');
                return;
            }
        }

        setSending(true);
        try {
            // Check if template has media header
            const headerType = getTemplateHeaderType(selectedTemplate);
            const needsMediaUrl = headerType && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType);

            if (needsMediaUrl && !headerMediaUrl) {
                alert('Este template requer uma URL de midia para o cabecalho');
                setSending(false);
                return;
            }

            // Debug: log mappings before sending
            console.log('Variable mappings being sent:', JSON.stringify(variableMappings, null, 2));
            console.log('Contacts being sent:', JSON.stringify(contacts.slice(0, 2), null, 2));

            const payload: any = {
                name: broadcastName || `Broadcast ${new Date().toLocaleString('pt-BR')}`,
                wabaId: selectedWaba,
                phoneNumberId: selectedPhone,
                templateName: selectedTemplate.name,
                templateLanguage: selectedTemplate.language,
                templateCategory: selectedTemplate.category,
                mode: broadcastMode,
                variableMappings: variableMappings,
                // New fields
                timeWindowStart: timeWindowStart || undefined,
                timeWindowEnd: timeWindowEnd || undefined,
                enableDeduplication,
                chatwootIntegrationId: selectedChatwoot || undefined,
                conversationTags: conversationTags.length > 0 ? conversationTags : undefined,
                contactTags: contactTags.length > 0 ? contactTags : undefined,
                // Media header
                headerMediaType: needsMediaUrl ? headerType : undefined,
                headerMediaUrl: needsMediaUrl ? headerMediaUrl : undefined,
            };

            if (isScheduled && scheduledAt) {
                payload.scheduledAt = scheduledAt;
            }

            if (broadcastMode === 'bulk') {
                payload.contacts = contacts;
                payload.csvColumns = csvColumns;
            } else {
                payload.singleRecipient = singleRecipient;
            }

            // Use different endpoint for scheduled broadcasts
            const endpoint = isScheduled && scheduledAt ? '/broadcast/schedule' : '/broadcast';
            await api.post(endpoint, payload);

            // Reset form
            setContacts([]);
            setCsvColumns([]);
            setBroadcastName('');
            setUploadErrors([]);
            setTemplateVariables([]);
            setVariableMappings([]);
            setSingleRecipient({ name: '', phone: '' });
            // Reset new fields
            setIsScheduled(false);
            setScheduledAt('');
            setTimeWindowStart('');
            setTimeWindowEnd('');
            setEnableDeduplication(false);
            setDuplicateResult(null);
            setChatwootSyncResult(null);
            setHeaderMediaUrl('');
            setTemplateSearch('');
            // Keep selectedChatwoot as it's a preference

            // Refresh broadcasts list
            fetchBroadcasts();
            alert('Broadcast iniciado com sucesso!');
        } catch (error: any) {
            console.error('Erro ao enviar broadcast:', error);
            alert(error.response?.data?.message || 'Erro ao enviar broadcast');
        } finally {
            setSending(false);
        }
    };

    // Cancel broadcast
    const handleCancelBroadcast = async (broadcastId: string) => {
        try {
            await api.post(`/broadcast/${broadcastId}/cancel`);
            fetchBroadcasts();
        } catch (error) {
            console.error('Erro ao cancelar broadcast:', error);
        }
    };

    // Delete broadcast
    const handleDeleteBroadcast = async (broadcastId: string) => {
        if (!confirm('Tem certeza que deseja excluir este broadcast?')) return;
        try {
            await api.delete(`/broadcast/${broadcastId}`);
            fetchBroadcasts();
        } catch (error) {
            console.error('Erro ao excluir broadcast:', error);
        }
    };

    // Get template preview
    const getTemplatePreview = (template: MessageTemplate | null) => {
        if (!template) return '';
        const bodyComponent = template.components?.find(c => c.type === 'BODY');
        return bodyComponent?.text || '';
    };

    // Status badge component
    const StatusBadge = ({ status }: { status: string }) => {
        const config: Record<string, { color: string; icon: typeof Clock; text: string }> = {
            pending: { color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 dark:text-yellow-400', icon: Clock, text: 'Pendente' },
            scheduled: { color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400', icon: Calendar, text: 'Agendado' },
            processing: { color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400', icon: Loader2, text: 'Processando' },
            paused: { color: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400', icon: Pause, text: 'Pausado' },
            completed: { color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400', icon: CheckCircle, text: 'Concluido' },
            failed: { color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400', icon: XCircle, text: 'Falhou' },
            cancelled: { color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300', icon: XCircle, text: 'Cancelado' }
        };

        const { color, icon: Icon, text } = config[status] || config.pending;

        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
                <Icon className={`w-3.5 h-3.5 ${status === 'processing' ? 'animate-spin' : ''}`} />
                {text}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                            <Phone className="w-6 h-6 text-white" />
                        </div>
                        Broadcast WhatsApp
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Envie mensagens em massa via WhatsApp Business</p>
                </div>
                <button
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
                >
                    <BarChart3 className="w-4 h-4" />
                    Analytics
                </button>
            </div>

            {/* Analytics Section */}
            {showAnalytics && analytics && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        Estatisticas de Envio
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-blue-600">{analytics.totalBroadcasts}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Total Broadcasts</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-green-600">{analytics.totalSent}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Enviados</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-red-600">{analytics.totalFailed}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Falhas</p>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{analytics.totalSkipped}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Ignorados</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-purple-600">{analytics.successRate}%</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Taxa Sucesso</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - New Broadcast */}
                <div className="space-y-6">
                    {/* Mode Selector */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Modo de Envio</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setBroadcastMode('bulk')}
                                className={`p-4 rounded-xl border-2 transition-all ${
                                    broadcastMode === 'bulk'
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500'
                                }`}
                            >
                                <Users className="w-6 h-6 mx-auto mb-2 text-green-600" />
                                <p className="text-sm font-medium">Envio em Massa</p>
                            </button>
                            <button
                                onClick={() => setBroadcastMode('single')}
                                className={`p-4 rounded-xl border-2 transition-all ${
                                    broadcastMode === 'single'
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500'
                                }`}
                            >
                                <Phone className="w-6 h-6 mx-auto mb-2 text-green-600" />
                                <p className="text-sm font-medium">Envio Unico</p>
                            </button>
                        </div>
                    </div>

                    {/* Single Recipient Form */}
                    {broadcastMode === 'single' && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                <Phone className="w-5 h-5 text-green-600" />
                                Destinatario
                            </h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome do contato</label>
                                        <input
                                            type="text"
                                            value={singleRecipient.name}
                                            onChange={(e) => setSingleRecipient({...singleRecipient, name: e.target.value})}
                                            placeholder="Ex: Joao Silva"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl dark:text-gray-100 focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Telefone com DDD</label>
                                        <input
                                            type="tel"
                                            value={singleRecipient.phone}
                                            onChange={(e) => setSingleRecipient({...singleRecipient, phone: e.target.value})}
                                            placeholder="5511999999999"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl dark:text-gray-100 focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                </div>

                                {/* Variable inputs for single recipient */}
                                {selectedTemplate && templateVariables.length > 0 && (
                                    <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700 rounded-xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                                                <span className="w-6 h-6 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center">
                                                    {templateVariables.length}
                                                </span>
                                                Preencher Variaveis do Template
                                            </h4>
                                            <button
                                                onClick={handlePreviewTemplate}
                                                disabled={loadingPreview}
                                                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 flex items-center gap-1.5 disabled:opacity-50"
                                            >
                                                {loadingPreview ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Eye className="w-3 h-3" />
                                                )}
                                                Preview
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {templateVariables.map((variable, idx) => {
                                                const mapping = variableMappings[idx];
                                                if (!mapping) return null;

                                                return (
                                                    <div key={idx} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-purple-100 dark:border-purple-800">
                                                        <label className="block text-xs font-medium text-purple-700 dark:text-purple-400 mb-1.5">
                                                            {variable.placeholder}
                                                            <span className="text-purple-500 dark:text-purple-500 ml-1">({variable.componentType})</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={mapping.manualValue || ''}
                                                            onChange={(e) => {
                                                                const newMappings = [...variableMappings];
                                                                newMappings[idx].source = 'manual';
                                                                newMappings[idx].manualValue = e.target.value;
                                                                setVariableMappings(newMappings);
                                                            }}
                                                            placeholder={`Valor para ${variable.placeholder}`}
                                                            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-purple-500 dark:text-gray-100"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* CSV Upload (only in bulk mode) */}
                    {broadcastMode === 'bulk' && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                                Upload de Contatos
                            </h3>

                            {/* Download Template Button */}
                            <button
                                onClick={handleDownloadTemplate}
                                className="w-full mb-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 flex items-center justify-center gap-2 transition-all"
                            >
                                <Download className="w-4 h-4" />
                                Baixar Template CSV
                            </button>

                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                                dragActive
                                    ? 'border-green-400 bg-green-50 dark:bg-green-900/30'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500 hover:bg-green-50/50'
                            }`}
                        >
                            {uploading ? (
                                <div className="flex flex-col items-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-2" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Processando arquivo...</p>
                                </div>
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        Arraste um arquivo CSV ou clique para selecionar
                                    </p>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                                        className="hidden"
                                        id="csv-upload"
                                    />
                                    <label
                                        htmlFor="csv-upload"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 cursor-pointer transition-colors"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Selecionar Arquivo
                                    </label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                                        Formato: nome, telefone (uma linha por contato)
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Upload errors */}
                        {uploadErrors.length > 0 && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-1">Avisos:</p>
                                <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                                    {uploadErrors.slice(0, 5).map((error, i) => (
                                        <li key={i}>{error}</li>
                                    ))}
                                    {uploadErrors.length > 5 && (
                                        <li>... e mais {uploadErrors.length - 5} avisos</li>
                                    )}
                                </ul>
                            </div>
                        )}

                        {/* Contacts preview */}
                        {contacts.length > 0 && (
                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">
                                        <Users className="w-4 h-4 inline mr-1" />
                                        {contacts.length} contatos carregados
                                    </p>
                                    <button
                                        onClick={() => setContacts([])}
                                        className="text-xs text-red-600 hover:text-red-700"
                                    >
                                        Limpar
                                    </button>
                                </div>
                                <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Nome</th>
                                                <th className="px-3 py-2 text-left">Telefone</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {contacts.slice(0, 10).map((contact, i) => (
                                                <tr key={i} className="border-t">
                                                    <td className="px-3 py-2">{contact.name}</td>
                                                    <td className="px-3 py-2">{contact.phone}</td>
                                                </tr>
                                            ))}
                                            {contacts.length > 10 && (
                                                <tr className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                                                    <td colSpan={2} className="px-3 py-2 text-center text-gray-500">
                                                        ... e mais {contacts.length - 10} contatos
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        </div>
                    )}

                    {/* WhatsApp Config */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <Phone className="w-5 h-5 text-green-600" />
                            Configuracao do Envio
                        </h3>

                        <div className="space-y-4">
                            {/* Broadcast Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                                    Nome do Broadcast (opcional)
                                </label>
                                <input
                                    type="text"
                                    value={broadcastName}
                                    onChange={(e) => setBroadcastName(e.target.value)}
                                    placeholder="Ex: Promocao de Janeiro"
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl dark:text-gray-100 focus:ring-2 focus:ring-green-500"
                                />
                            </div>

                            {/* WABA Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                                    Conta WhatsApp Business
                                </label>
                                {loadingWabas ? (
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 py-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">Carregando...</span>
                                    </div>
                                ) : wabas.length === 0 ? (
                                    <p className="text-sm text-yellow-600 dark:text-yellow-400 py-2">
                                        <AlertCircle className="w-4 h-4 inline mr-1" />
                                        Nenhuma conta encontrada. Reconecte o Facebook.
                                    </p>
                                ) : (
                                    <select
                                        value={selectedWaba}
                                        onChange={(e) => handleWabaChange(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl dark:text-gray-100 focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="">Selecione uma conta</option>
                                        {wabas.map(waba => (
                                            <option key={waba.id} value={waba.id}>{waba.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Phone Selection */}
                            {selectedWaba && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                                        Numero de Telefone
                                    </label>
                                    {loadingPhones ? (
                                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 py-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="text-sm">Carregando...</span>
                                        </div>
                                    ) : (
                                        <select
                                            value={selectedPhone}
                                            onChange={(e) => setSelectedPhone(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl dark:text-gray-100 focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="">Selecione um numero</option>
                                            {phoneNumbers.map(phone => (
                                                <option key={phone.id} value={phone.id}>
                                                    {phone.display_phone_number} - {phone.verified_name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}

                            {/* Template Selection */}
                            {selectedPhone && (
                                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-xl">
                                    <label className="block text-sm font-semibold text-green-900 dark:text-green-300 mb-3 flex items-center gap-2">
                                        <FileSpreadsheet className="w-4 h-4" />
                                        Template de Mensagem
                                        <span className="text-xs font-normal bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                                            {templates.length} disponiveis
                                        </span>
                                    </label>
                                    {loadingTemplates ? (
                                        <div className="flex items-center gap-2 text-green-600 py-4 justify-center">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span className="text-sm">Carregando templates...</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Search field */}
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Buscar por nome do template..."
                                                    value={templateSearch}
                                                    onChange={(e) => setTemplateSearch(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-green-200 dark:border-green-600 rounded-xl dark:text-gray-100 focus:ring-2 focus:ring-green-500 text-sm"
                                                />
                                                {templateSearch && (
                                                    <button
                                                        onClick={() => setTemplateSearch('')}
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Template cards grid */}
                                            <div className="max-h-64 overflow-y-auto rounded-lg">
                                                <div className="grid grid-cols-1 gap-2">
                                                    {filteredTemplates.map(template => {
                                                        const isSelected = selectedTemplate?.name === template.name;
                                                        const bodyText = template.components?.find(c => c.type === 'BODY')?.text || '';
                                                        const headerType = getTemplateHeaderType(template);
                                                        const variableCount = (bodyText.match(/\{\{\d+\}\}/g) || []).length;

                                                        return (
                                                            <button
                                                                key={template.id}
                                                                onClick={() => {
                                                                    setSelectedTemplate(template);
                                                                    detectTemplateVariables(template);
                                                                }}
                                                                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                                                                    isSelected
                                                                        ? 'border-green-500 bg-green-100 dark:bg-green-900/40'
                                                                        : 'border-transparent bg-white dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300'
                                                                }`}
                                                            >
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className={`font-medium text-sm truncate ${isSelected ? 'text-green-800 dark:text-green-300' : 'text-gray-900 dark:text-gray-100'}`}>
                                                                                {template.name}
                                                                            </span>
                                                                            {isSelected && (
                                                                                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                                                                                {template.language}
                                                                            </span>
                                                                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">
                                                                                {template.category}
                                                                            </span>
                                                                            {headerType && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && (
                                                                                <span className="text-xs bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                                    <Image className="w-3 h-3" />
                                                                                    {headerType}
                                                                                </span>
                                                                            )}
                                                                            {variableCount > 0 && (
                                                                                <span className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded">
                                                                                    {variableCount} var
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {isSelected && bodyText && (
                                                                    <p className="text-xs text-green-700 dark:text-green-400 mt-2 line-clamp-2 border-t border-green-200 dark:border-green-700 pt-2">
                                                                        {bodyText.substring(0, 100)}{bodyText.length > 100 ? '...' : ''}
                                                                    </p>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {templateSearch && (
                                                <p className="text-xs text-green-700 dark:text-green-400 text-center">
                                                    {filteredTemplates.length} de {templates.length} templates encontrados
                                                </p>
                                            )}

                                            {filteredTemplates.length === 0 && templateSearch && (
                                                <div className="text-center py-4 text-gray-500">
                                                    <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                                    <p className="text-sm">Nenhum template encontrado para "{templateSearch}"</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Media Header URL Input */}
                            {selectedTemplate && getTemplateHeaderType(selectedTemplate) && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(getTemplateHeaderType(selectedTemplate)!) && (
                                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                                    <label className="block text-sm font-medium text-orange-800 mb-2 flex items-center gap-2">
                                        <Image className="w-4 h-4" />
                                        URL da Midia ({getTemplateHeaderType(selectedTemplate)})
                                    </label>
                                    <p className="text-xs text-orange-600 mb-2">
                                        Este template requer uma {getTemplateHeaderType(selectedTemplate)?.toLowerCase() === 'image' ? 'imagem' : getTemplateHeaderType(selectedTemplate)?.toLowerCase() === 'video' ? 'video' : 'documento'} no cabecalho
                                    </p>
                                    <input
                                        type="url"
                                        placeholder="https://exemplo.com/imagem.jpg"
                                        value={headerMediaUrl}
                                        onChange={(e) => setHeaderMediaUrl(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 text-sm"
                                    />
                                    {headerMediaUrl && (
                                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" /> URL configurada
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Template Preview */}
                            {selectedTemplate && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl border border-green-200">
                                    <p className="text-xs font-medium text-green-600 mb-2">Preview:</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {getTemplatePreview(selectedTemplate)}
                                    </p>
                                </div>
                            )}

                            {/* Variable Mapping Interface - Only show for bulk mode */}
                            {selectedTemplate && templateVariables.length > 0 && broadcastMode === 'bulk' && (
                                <div className="p-5 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700 rounded-xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                                            <span className="w-6 h-6 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center">
                                                {templateVariables.length}
                                            </span>
                                            Mapear Variaveis do Template
                                        </h4>
                                        <button
                                            onClick={handlePreviewTemplate}
                                            disabled={loadingPreview}
                                            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 flex items-center gap-1.5 disabled:opacity-50"
                                        >
                                            {loadingPreview ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Eye className="w-3 h-3" />
                                            )}
                                            Preview
                                        </button>
                                    </div>

                                    {csvColumns.length === 0 && (
                                        <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg">
                                            <p className="text-xs text-yellow-800 dark:text-yellow-400 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4" />
                                                Faca upload do CSV primeiro para usar variaveis dinamicas por contato
                                            </p>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {templateVariables.map((variable, idx) => {
                                            const mapping = variableMappings[idx];
                                            if (!mapping) return null;

                                            return (
                                                <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-semibold bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-300 px-2 py-1 rounded-full">
                                                                {variable.placeholder}
                                                            </span>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                {variable.componentType === 'HEADER' ? 'Cabecalho' :
                                                                 variable.componentType === 'BODY' ? 'Corpo' : 'Botao'}
                                                            </span>
                                                        </div>
                                                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                                                            <button
                                                                onClick={() => {
                                                                    const newMappings = [...variableMappings];
                                                                    newMappings[idx].source = 'csv';
                                                                    setVariableMappings(newMappings);
                                                                }}
                                                                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                                                                    mapping.source === 'csv'
                                                                        ? 'bg-purple-600 text-white shadow-sm'
                                                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                                                                }`}
                                                            >
                                                                <FileSpreadsheet className="w-3 h-3 inline mr-1" />
                                                                CSV
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const newMappings = [...variableMappings];
                                                                    newMappings[idx].source = 'manual';
                                                                    setVariableMappings(newMappings);
                                                                }}
                                                                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                                                                    mapping.source === 'manual'
                                                                        ? 'bg-purple-600 text-white shadow-sm'
                                                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                                                                }`}
                                                            >
                                                                Fixo
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {mapping.source === 'csv' ? (
                                                        <div className="relative">
                                                            <FileSpreadsheet className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                            <select
                                                                value={mapping.csvColumn || ''}
                                                                onChange={(e) => {
                                                                    const newMappings = [...variableMappings];
                                                                    newMappings[idx].csvColumn = e.target.value;
                                                                    setVariableMappings(newMappings);
                                                                }}
                                                                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:text-gray-100"
                                                                disabled={csvColumns.length === 0}
                                                            >
                                                                <option value="">Selecione uma coluna do CSV</option>
                                                                {csvColumns.map(col => (
                                                                    <option key={col} value={col}>{col}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={mapping.manualValue || ''}
                                                            onChange={(e) => {
                                                                const newMappings = [...variableMappings];
                                                                newMappings[idx].manualValue = e.target.value;
                                                                setVariableMappings(newMappings);
                                                            }}
                                                            placeholder="Digite o valor que sera usado para todos os contatos"
                                                            className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:text-gray-100"
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Chatwoot Integration Selection */}
                            {chatwootIntegrations.length > 0 && (
                                <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                                    <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                        <Link2 className="w-4 h-4" />
                                        Integrar com Chatwoot
                                    </h4>

                                    <div className="space-y-4">
                                        {/* Chatwoot Selection */}
                                        <div>
                                            <label className="block text-xs font-medium text-blue-700 mb-1">
                                                Caixa de Entrada
                                            </label>
                                            <select
                                                value={selectedChatwoot}
                                                onChange={(e) => handleChatwootChange(e.target.value)}
                                                className="w-full px-3 py-2.5 text-sm bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">Nao integrar com Chatwoot</option>
                                                {chatwootIntegrations.map(integration => (
                                                    <option key={integration.id} value={integration.id}>
                                                        {integration.name} (Inbox #{integration.metadata?.inboxId})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Tags Section - Only show when Chatwoot is selected */}
                                        {selectedChatwoot && (
                                            <div className="space-y-4 pt-3 border-t border-blue-200">
                                                {/* Conversation Tags */}
                                                <div>
                                                    <label className="block text-xs font-medium text-blue-700 mb-2">
                                                        Tags da Conversa
                                                    </label>
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        {conversationTags.map(tag => (
                                                            <span
                                                                key={tag}
                                                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                                                            >
                                                                {tag}
                                                                <button
                                                                    onClick={() => removeConversationTag(tag)}
                                                                    className="hover:text-blue-900"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="flex-1 relative">
                                                            <input
                                                                type="text"
                                                                value={newConversationTag}
                                                                onChange={(e) => setNewConversationTag(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        addConversationTag(newConversationTag);
                                                                    }
                                                                }}
                                                                placeholder="Digite ou selecione uma tag..."
                                                                className="w-full px-3 py-2 text-sm bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                                list="conversation-tags-list"
                                                            />
                                                            <datalist id="conversation-tags-list">
                                                                {chatwootLabels
                                                                    .filter(l => !conversationTags.includes(l.title))
                                                                    .map(label => (
                                                                        <option key={label.id} value={label.title} />
                                                                    ))
                                                                }
                                                            </datalist>
                                                        </div>
                                                        <button
                                                            onClick={() => addConversationTag(newConversationTag)}
                                                            disabled={!newConversationTag}
                                                            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Contact Tags */}
                                                <div>
                                                    <label className="block text-xs font-medium text-indigo-700 mb-2">
                                                        Tags do Contato
                                                    </label>
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        {contactTags.map(tag => (
                                                            <span
                                                                key={tag}
                                                                className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full"
                                                            >
                                                                {tag}
                                                                <button
                                                                    onClick={() => removeContactTag(tag)}
                                                                    className="hover:text-indigo-900"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="flex-1 relative">
                                                            <input
                                                                type="text"
                                                                value={newContactTag}
                                                                onChange={(e) => setNewContactTag(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        addContactTag(newContactTag);
                                                                    }
                                                                }}
                                                                placeholder="Digite ou selecione uma tag..."
                                                                className="w-full px-3 py-2 text-sm bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                                list="contact-tags-list"
                                                            />
                                                            <datalist id="contact-tags-list">
                                                                {chatwootLabels
                                                                    .filter(l => !contactTags.includes(l.title))
                                                                    .map(label => (
                                                                        <option key={label.id} value={label.title} />
                                                                    ))
                                                                }
                                                            </datalist>
                                                        </div>
                                                        <button
                                                            onClick={() => addContactTag(newContactTag)}
                                                            disabled={!newContactTag}
                                                            className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>

                                                {chatwootLabels.length === 0 && (
                                                    <p className="text-xs text-blue-600 italic">
                                                        Dica: Crie labels no Chatwoot para ve-las aqui como sugestoes
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Show sync status when CSV is loaded and Chatwoot is selected */}
                                        {selectedChatwoot && contacts.length > 0 && (
                                            <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                                                {syncingChatwoot ? (
                                                    <div className="flex items-center gap-2 text-blue-600">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span className="text-sm">Verificando contatos no Chatwoot...</span>
                                                    </div>
                                                ) : creatingChatwootContacts ? (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 text-blue-600">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            <span className="text-sm font-medium">
                                                                Criando contatos no Chatwoot...
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-blue-100 rounded-full h-2">
                                                            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }} />
                                                        </div>
                                                        <p className="text-xs text-blue-500">
                                                            Isso pode levar alguns instantes dependendo da quantidade de contatos
                                                        </p>
                                                    </div>
                                                ) : chatwootCreationResult ? (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                                            <span className="text-sm font-medium text-green-700">
                                                                Criacao de contatos finalizada
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            {chatwootCreationResult.created > 0 && (
                                                                <span className="text-sm text-green-700">
                                                                    <CheckCircle className="w-4 h-4 inline mr-1" />
                                                                    {chatwootCreationResult.created} criado{chatwootCreationResult.created !== 1 ? 's' : ''}
                                                                </span>
                                                            )}
                                                            {chatwootCreationResult.errors > 0 && (
                                                                <span className="text-sm text-red-700">
                                                                    <XCircle className="w-4 h-4 inline mr-1" />
                                                                    {chatwootCreationResult.errors} erro{chatwootCreationResult.errors !== 1 ? 's' : ''}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {chatwootCreationResult.errorDetails.length > 0 && (
                                                            <div className="mt-1 p-2 bg-red-50 rounded text-xs text-red-600 max-h-24 overflow-y-auto">
                                                                {chatwootCreationResult.errorDetails.map((e, i) => (
                                                                    <div key={i}>{e.phone}: {e.error}</div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {chatwootSyncResult && chatwootSyncResult.synced + (chatwootCreationResult.created || 0) > 0 && (
                                                            <p className="text-xs text-green-600 mt-1">
                                                                Total sincronizado: {chatwootSyncResult.synced + (chatwootCreationResult.created || 0)} contato{(chatwootSyncResult.synced + (chatwootCreationResult.created || 0)) !== 1 ? 's' : ''}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : chatwootSyncResult ? (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-green-700">
                                                                <CheckCircle className="w-4 h-4 inline mr-1" />
                                                                {chatwootSyncResult.synced} encontrado{chatwootSyncResult.synced !== 1 ? 's' : ''}
                                                            </span>
                                                            {chatwootSyncResult.missing > 0 && (
                                                                <span className="text-sm text-yellow-700 dark:text-yellow-300">
                                                                    <AlertCircle className="w-4 h-4 inline mr-1" />
                                                                    {chatwootSyncResult.missing} nao encontrado{chatwootSyncResult.missing !== 1 ? 's' : ''}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {chatwootSyncResult.created > 0 && (
                                                            <span className="text-sm text-blue-700">
                                                                <CheckCircle className="w-4 h-4 inline mr-1" />
                                                                {chatwootSyncResult.created} criado{chatwootSyncResult.created !== 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                        {chatwootSyncResult.errors > 0 && (
                                                            <span className="text-sm text-red-700">
                                                                <XCircle className="w-4 h-4 inline mr-1" />
                                                                {chatwootSyncResult.errors} erro{chatwootSyncResult.errors !== 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                        {chatwootSyncResult.missing > 0 && (
                                                            <button
                                                                onClick={handleCreateChatwootContacts}
                                                                disabled={creatingChatwootContacts}
                                                                className="w-full mt-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                                            >
                                                                <Users className="w-4 h-4" />
                                                                Criar {chatwootSyncResult.missing} contato{chatwootSyncResult.missing !== 1 ? 's' : ''} no Chatwoot
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-blue-800">
                                                        <Users className="w-4 h-4 inline mr-1" />
                                                        {contacts.length} contatos serao verificados no Chatwoot
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {chatwootIntegrations.length === 0 && (
                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                        <Link2 className="w-4 h-4" />
                                        Nenhuma integracao Chatwoot configurada.
                                        <a href="/accounts" className="text-blue-600 hover:underline">Configurar</a>
                                    </p>
                                </div>
                            )}

                            {/* Scheduling & Time Window Combined Section */}
                            <div className="p-5 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-900/20 dark:via-indigo-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700 rounded-xl">
                                <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Agendamento e Horarios
                                </h4>

                                {/* Schedule Toggle */}
                                <div className={`p-4 rounded-xl border-2 transition-all mb-4 ${
                                    isScheduled
                                        ? 'border-purple-400 bg-purple-100 dark:bg-purple-900/40'
                                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
                                }`}>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className={`relative w-12 h-6 rounded-full transition-colors ${
                                            isScheduled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                                        }`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                                isScheduled ? 'translate-x-7' : 'translate-x-1'
                                            }`} />
                                            <input
                                                type="checkbox"
                                                checked={isScheduled}
                                                onChange={(e) => setIsScheduled(e.target.checked)}
                                                className="sr-only"
                                            />
                                        </div>
                                        <div>
                                            <span className={`text-sm font-medium ${isScheduled ? 'text-purple-900 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                                Agendar para depois
                                            </span>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {isScheduled ? 'O broadcast sera enviado na data/hora definida' : 'O broadcast sera enviado imediatamente'}
                                            </p>
                                        </div>
                                    </label>

                                    {isScheduled && (
                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">
                                                    Data
                                                </label>
                                                <input
                                                    type="date"
                                                    value={scheduledAt ? scheduledAt.split('T')[0] : ''}
                                                    onChange={(e) => {
                                                        const time = scheduledAt ? scheduledAt.split('T')[1] : '09:00';
                                                        setScheduledAt(`${e.target.value}T${time}`);
                                                    }}
                                                    min={new Date().toISOString().split('T')[0]}
                                                    className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:text-gray-100"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">
                                                    Horario
                                                </label>
                                                <input
                                                    type="time"
                                                    value={scheduledAt ? scheduledAt.split('T')[1]?.substring(0, 5) : '09:00'}
                                                    onChange={(e) => {
                                                        const date = scheduledAt ? scheduledAt.split('T')[0] : new Date().toISOString().split('T')[0];
                                                        setScheduledAt(`${date}T${e.target.value}`);
                                                    }}
                                                    className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:text-gray-100"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Time Window Section */}
                                <div className="p-4 bg-white dark:bg-gray-700 rounded-xl border border-blue-200 dark:border-blue-700">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm font-medium text-blue-900 dark:text-blue-300">Janela de Envio</span>
                                        </div>
                                        <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">
                                            Opcional
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                        Limite o envio para um horario especifico. Mensagens fora do horario serao pausadas automaticamente.
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Inicio</label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="time"
                                                    value={timeWindowStart}
                                                    onChange={(e) => setTimeWindowStart(e.target.value)}
                                                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                                                    placeholder="08:00"
                                                />
                                            </div>
                                        </div>
                                        <div className="text-gray-400 mt-5">
                                            <span className="text-lg">→</span>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Fim</label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="time"
                                                    value={timeWindowEnd}
                                                    onChange={(e) => setTimeWindowEnd(e.target.value)}
                                                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                                                    placeholder="18:00"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    {timeWindowStart && timeWindowEnd && (
                                        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-center">
                                            <p className="text-xs text-blue-700 dark:text-blue-400">
                                                Mensagens serao enviadas apenas entre <strong>{timeWindowStart}</strong> e <strong>{timeWindowEnd}</strong>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Deduplication Section */}
                            <div className={`p-4 rounded-xl border-2 transition-all ${
                                enableDeduplication
                                    ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                                    : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                            }`}>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`relative w-12 h-6 rounded-full transition-colors ${
                                        enableDeduplication ? 'bg-yellow-500' : 'bg-gray-300 dark:bg-gray-600'
                                    }`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                            enableDeduplication ? 'translate-x-7' : 'translate-x-1'
                                        }`} />
                                        <input
                                            type="checkbox"
                                            checked={enableDeduplication}
                                            onChange={(e) => setEnableDeduplication(e.target.checked)}
                                            className="sr-only"
                                        />
                                    </div>
                                    <div>
                                        <span className={`text-sm font-medium ${enableDeduplication ? 'text-yellow-900 dark:text-yellow-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                            Evitar duplicados
                                        </span>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Nao envia para quem ja recebeu broadcast com mesmo nome
                                        </p>
                                    </div>
                                </label>
                                {duplicateResult && duplicateResult.duplicateCount > 0 && (
                                    <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg border border-yellow-200 dark:border-yellow-700">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300 flex items-center gap-1">
                                                <AlertCircle className="w-4 h-4" />
                                                Duplicados encontrados
                                            </span>
                                            <span className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
                                                {duplicateResult.duplicateCount}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-yellow-700 dark:text-yellow-400">Serao ignorados</span>
                                            <span className="text-green-700 dark:text-green-400 font-medium">
                                                {duplicateResult.uniqueCount} serao enviados
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Send Button */}
                            <button
                                onClick={handleSendBroadcast}
                                disabled={
                                    !selectedWaba ||
                                    !selectedPhone ||
                                    !selectedTemplate ||
                                    (broadcastMode === 'bulk' && contacts.length === 0) ||
                                    (broadcastMode === 'single' && (!singleRecipient.name || !singleRecipient.phone)) ||
                                    sending
                                }
                                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Iniciando Envio...
                                    </>
                                ) : broadcastMode === 'single' ? (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Enviar Mensagem
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Enviar para {contacts.length} contatos
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column - Broadcast History */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-gray-600" />
                            Historico de Envios
                        </h3>
                        <button
                            onClick={fetchBroadcasts}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Atualizar"
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-500 ${loadingBroadcasts ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {loadingBroadcasts && broadcasts.length === 0 ? (
                        <div className="text-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
                        </div>
                    ) : broadcasts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Phone className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                            <p>Nenhum broadcast realizado ainda</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {broadcasts.map(broadcast => (
                                <div
                                    key={broadcast.id}
                                    className="p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{broadcast.name}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {broadcast.templateName} ({broadcast.templateLanguage})
                                            </p>
                                        </div>
                                        <StatusBadge status={broadcast.status} />
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        <span className="flex items-center gap-1">
                                            <Users className="w-4 h-4" />
                                            {broadcast.totalContacts}
                                        </span>
                                        <span className="flex items-center gap-1 text-green-600">
                                            <CheckCircle className="w-4 h-4" />
                                            {broadcast.sentCount}
                                        </span>
                                        {broadcast.failedCount > 0 && (
                                            <span className="flex items-center gap-1 text-red-600">
                                                <XCircle className="w-4 h-4" />
                                                {broadcast.failedCount}
                                            </span>
                                        )}
                                    </div>

                                    {/* Progress bar */}
                                    {broadcast.status === 'processing' && (
                                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mb-2">
                                            <div
                                                className="bg-green-600 h-1.5 rounded-full transition-all"
                                                style={{
                                                    width: `${((broadcast.sentCount + broadcast.failedCount) / broadcast.totalContacts) * 100}%`
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Scheduled info */}
                                    {broadcast.scheduledAt && broadcast.status === 'scheduled' && (
                                        <div className="text-xs text-purple-600 mb-2 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Agendado para: {new Date(broadcast.scheduledAt).toLocaleString('pt-BR')}
                                        </div>
                                    )}

                                    {/* Time window info */}
                                    {broadcast.timeWindowStart && broadcast.timeWindowEnd && (
                                        <div className="text-xs text-blue-600 mb-2 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Janela: {broadcast.timeWindowStart} - {broadcast.timeWindowEnd}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(broadcast.createdAt).toLocaleString('pt-BR')}
                                        </span>
                                        <div className="flex gap-2 flex-wrap">
                                            {/* Processing actions */}
                                            {broadcast.status === 'processing' && (
                                                <>
                                                    <button
                                                        onClick={() => handlePauseBroadcast(broadcast.id)}
                                                        className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
                                                    >
                                                        <Pause className="w-3 h-3" />
                                                        Pausar
                                                    </button>
                                                    <button
                                                        onClick={() => handleCancelBroadcast(broadcast.id)}
                                                        className="text-xs text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:text-yellow-300 flex items-center gap-1"
                                                    >
                                                        <X className="w-3 h-3" />
                                                        Cancelar
                                                    </button>
                                                </>
                                            )}

                                            {/* Paused actions */}
                                            {broadcast.status === 'paused' && (
                                                <>
                                                    <button
                                                        onClick={() => handleResumeBroadcast(broadcast.id)}
                                                        className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                                                    >
                                                        <Play className="w-3 h-3" />
                                                        Retomar
                                                    </button>
                                                    <button
                                                        onClick={() => handleCancelBroadcast(broadcast.id)}
                                                        className="text-xs text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:text-yellow-300 flex items-center gap-1"
                                                    >
                                                        <X className="w-3 h-3" />
                                                        Cancelar
                                                    </button>
                                                </>
                                            )}

                                            {/* Pending/Scheduled actions */}
                                            {['pending', 'scheduled'].includes(broadcast.status) && (
                                                <>
                                                    <button
                                                        onClick={() => handleChatwootSync(broadcast.id)}
                                                        disabled={syncingChatwoot}
                                                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                    >
                                                        <Link2 className="w-3 h-3" />
                                                        Sync Chatwoot
                                                    </button>
                                                    <button
                                                        onClick={() => handleCancelBroadcast(broadcast.id)}
                                                        className="text-xs text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:text-yellow-300 flex items-center gap-1"
                                                    >
                                                        <X className="w-3 h-3" />
                                                        Cancelar
                                                    </button>
                                                </>
                                            )}

                                            {/* Completed/Failed actions */}
                                            {['completed', 'failed'].includes(broadcast.status) && (
                                                <>
                                                    {broadcast.failedCount > 0 && (
                                                        <button
                                                            onClick={() => handleRetryFailed(broadcast.id)}
                                                            className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
                                                        >
                                                            <RotateCcw className="w-3 h-3" />
                                                            Reenviar Falhas
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteBroadcast(broadcast.id)}
                                                        className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        Excluir
                                                    </button>
                                                </>
                                            )}

                                            {/* Cancelled actions */}
                                            {broadcast.status === 'cancelled' && (
                                                <button
                                                    onClick={() => handleDeleteBroadcast(broadcast.id)}
                                                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                    Excluir
                                                </button>
                                            )}

                                            {/* Ver Logs - always visible */}
                                            <button
                                                onClick={() => fetchLogs(broadcast.id)}
                                                disabled={loadingLogs}
                                                className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 flex items-center gap-1"
                                            >
                                                <BarChart3 className="w-3 h-3" />
                                                Ver Logs
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Modal */}
            {showPreviewModal && previewResult && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <Eye className="w-5 h-5 text-green-600" />
                                Preview da Mensagem
                            </h3>
                            <button
                                onClick={() => setShowPreviewModal(false)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-xl border border-green-200 dark:border-green-700">
                            {previewResult.headerText && (
                                <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                                    {previewResult.headerText}
                                </p>
                            )}
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {previewResult.bodyText}
                            </p>
                            {previewResult.footerText && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                    {previewResult.footerText}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => setShowPreviewModal(false)}
                            className="mt-4 w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}

            {/* Chatwoot Sync Result Modal (only for existing broadcasts) */}
            {showChatwootSyncModal && chatwootSyncResult && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <Link2 className="w-5 h-5 text-blue-600" />
                                Sincronizacao Chatwoot
                            </h3>
                            <button
                                onClick={() => { setChatwootSyncResult(null); setShowChatwootSyncModal(false); }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                                <span className="text-sm text-green-700">Sincronizados</span>
                                <span className="font-semibold text-green-700">{chatwootSyncResult.synced}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                                <span className="text-sm text-yellow-700 dark:text-yellow-300">Faltando</span>
                                <span className="font-semibold text-yellow-700 dark:text-yellow-300">{chatwootSyncResult.missing}</span>
                            </div>
                            {chatwootSyncResult.created > 0 && (
                                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                    <span className="text-sm text-blue-700">Criados</span>
                                    <span className="font-semibold text-blue-700">{chatwootSyncResult.created}</span>
                                </div>
                            )}
                            {chatwootSyncResult.errors > 0 && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                                    <p className="text-sm text-red-700 mb-2">Erros: {chatwootSyncResult.errors}</p>
                                    <div className="max-h-20 overflow-y-auto text-xs text-red-600">
                                        {chatwootSyncResult.errorDetails.map((e, i) => (
                                            <p key={i}>{e.phone}: {e.error}</p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 mt-4">
                            {chatwootSyncResult.missing > 0 && (
                                <button
                                    onClick={() => {
                                        const latestBroadcast = broadcasts.find(b =>
                                            b.status === 'pending' || b.status === 'scheduled'
                                        );
                                        if (latestBroadcast) {
                                            handleCreateMissingChatwoot(latestBroadcast.id);
                                        }
                                    }}
                                    disabled={syncingChatwoot}
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {syncingChatwoot ? (
                                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                    ) : (
                                        `Criar ${chatwootSyncResult.missing} Contatos`
                                    )}
                                </button>
                            )}
                            <button
                                onClick={() => { setChatwootSyncResult(null); setShowChatwootSyncModal(false); }}
                                className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Logs Modal */}
            {showLogsModal && logsResult && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full mx-4 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-purple-600" />
                                    Logs do Broadcast
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {logsResult.broadcast.name} - {logsResult.broadcast.templateName}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowLogsModal(false)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Filter */}
                        <div className="flex gap-2 mb-4">
                            {['all', 'sent', 'failed', 'pending', 'skipped'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => {
                                        setLogsFilter(status);
                                        if (logsResult) {
                                            fetchLogs(logsResult.broadcast.name, status);
                                        }
                                    }}
                                    className={`px-3 py-1 text-xs rounded-full ${
                                        logsFilter === status
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                    }`}
                                >
                                    {status === 'all' ? 'Todos' :
                                     status === 'sent' ? 'Enviados' :
                                     status === 'failed' ? 'Falhas' :
                                     status === 'pending' ? 'Pendentes' : 'Ignorados'}
                                </button>
                            ))}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg text-center">
                                <p className="text-lg font-bold text-blue-700">{logsResult.total}</p>
                                <p className="text-xs text-blue-600">Total</p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded-lg text-center">
                                <p className="text-lg font-bold text-green-700">
                                    {logsResult.contacts.filter(c => c.status === 'sent').length}
                                </p>
                                <p className="text-xs text-green-600">Enviados</p>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/30 p-2 rounded-lg text-center">
                                <p className="text-lg font-bold text-red-700">
                                    {logsResult.contacts.filter(c => c.status === 'failed').length}
                                </p>
                                <p className="text-xs text-red-600">Falhas</p>
                            </div>
                            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-2 rounded-lg text-center">
                                <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                                    {logsResult.contacts.filter(c => c.status === 'skipped').length}
                                </p>
                                <p className="text-xs text-yellow-600 dark:text-yellow-400">Ignorados</p>
                            </div>
                        </div>

                        {/* Contacts Table */}
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                    <tr>
                                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300">Nome</th>
                                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300">Telefone</th>
                                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300">Status</th>
                                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300">Enviado em</th>
                                        <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300">Erro</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logsResult.contacts.map((contact, idx) => (
                                        <tr key={idx} className="border-t border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="p-2">{contact.name}</td>
                                            <td className="p-2 font-mono text-xs">{contact.phone}</td>
                                            <td className="p-2">
                                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                                    contact.status === 'sent' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' :
                                                    contact.status === 'failed' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400' :
                                                    contact.status === 'skipped' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 dark:text-yellow-400' :
                                                    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                }`}>
                                                    {contact.status === 'sent' ? 'Enviado' :
                                                     contact.status === 'failed' ? 'Falhou' :
                                                     contact.status === 'skipped' ? 'Ignorado' : 'Pendente'}
                                                </span>
                                            </td>
                                            <td className="p-2 text-xs text-gray-500 dark:text-gray-400">
                                                {contact.sentAt ? new Date(contact.sentAt).toLocaleString('pt-BR') : '-'}
                                            </td>
                                            <td className="p-2 text-xs text-red-600 max-w-xs truncate" title={contact.error}>
                                                {contact.error || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between items-center mt-4 pt-4 border-t">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Mostrando {logsResult.contacts.length} de {logsResult.total} contatos
                            </p>
                            <button
                                onClick={() => setShowLogsModal(false)}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BroadcastPage;
