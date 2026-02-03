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
    X
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
    }>;
}

interface Contact {
    name: string;
    phone: string;
    status?: 'pending' | 'sent' | 'failed';
    error?: string;
}

interface Broadcast {
    id: string;
    name: string;
    templateName: string;
    templateLanguage: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    totalContacts: number;
    sentCount: number;
    failedCount: number;
    createdAt: string;
    completedAt?: string;
    contacts: Contact[];
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

    const [loadingWabas, setLoadingWabas] = useState(false);
    const [loadingPhones, setLoadingPhones] = useState(false);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);

    const [uploadErrors, setUploadErrors] = useState<string[]>([]);
    const [dragActive, setDragActive] = useState(false);

    // Fetch WABAs on mount
    useEffect(() => {
        fetchWabas();
        fetchBroadcasts();
    }, []);

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
        if (!selectedWaba || !selectedPhone || !selectedTemplate || contacts.length === 0) {
            return;
        }

        setSending(true);
        try {
            await api.post('/broadcast', {
                name: broadcastName || `Broadcast ${new Date().toLocaleString('pt-BR')}`,
                wabaId: selectedWaba,
                phoneNumberId: selectedPhone,
                templateName: selectedTemplate.name,
                templateLanguage: selectedTemplate.language,
                templateComponents: [],
                contacts: contacts
            });

            // Reset form
            setContacts([]);
            setBroadcastName('');
            setUploadErrors([]);

            // Refresh broadcasts list
            fetchBroadcasts();
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
            pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, text: 'Pendente' },
            processing: { color: 'bg-blue-100 text-blue-700', icon: Loader2, text: 'Processando' },
            completed: { color: 'bg-green-100 text-green-700', icon: CheckCircle, text: 'Concluido' },
            failed: { color: 'bg-red-100 text-red-700', icon: XCircle, text: 'Falhou' },
            cancelled: { color: 'bg-gray-100 text-gray-700', icon: XCircle, text: 'Cancelado' }
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
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                            <Phone className="w-6 h-6 text-white" />
                        </div>
                        Broadcast WhatsApp
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Envie mensagens em massa via WhatsApp Business</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - New Broadcast */}
                <div className="space-y-6">
                    {/* CSV Upload */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-green-600" />
                            Upload de Contatos
                        </h3>

                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                                dragActive
                                    ? 'border-green-400 bg-green-50'
                                    : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                            }`}
                        >
                            {uploading ? (
                                <div className="flex flex-col items-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-2" />
                                    <p className="text-sm text-gray-600">Processando arquivo...</p>
                                </div>
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600 mb-2">
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
                                    <p className="text-xs text-gray-500 mt-3">
                                        Formato: nome, telefone (uma linha por contato)
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Upload errors */}
                        {uploadErrors.length > 0 && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm font-medium text-yellow-800 mb-1">Avisos:</p>
                                <ul className="text-xs text-yellow-700 space-y-1">
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
                                    <p className="text-sm font-medium text-gray-700">
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
                                <div className="max-h-40 overflow-y-auto border rounded-lg">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50 sticky top-0">
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
                                                <tr className="border-t bg-gray-50">
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

                    {/* WhatsApp Config */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Phone className="w-5 h-5 text-green-600" />
                            Configuracao do Envio
                        </h3>

                        <div className="space-y-4">
                            {/* Broadcast Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nome do Broadcast (opcional)
                                </label>
                                <input
                                    type="text"
                                    value={broadcastName}
                                    onChange={(e) => setBroadcastName(e.target.value)}
                                    placeholder="Ex: Promocao de Janeiro"
                                    className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-green-500"
                                />
                            </div>

                            {/* WABA Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Conta WhatsApp Business
                                </label>
                                {loadingWabas ? (
                                    <div className="flex items-center gap-2 text-gray-500 py-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">Carregando...</span>
                                    </div>
                                ) : wabas.length === 0 ? (
                                    <p className="text-sm text-yellow-600 py-2">
                                        <AlertCircle className="w-4 h-4 inline mr-1" />
                                        Nenhuma conta encontrada. Reconecte o Facebook.
                                    </p>
                                ) : (
                                    <select
                                        value={selectedWaba}
                                        onChange={(e) => handleWabaChange(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-green-500"
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Numero de Telefone
                                    </label>
                                    {loadingPhones ? (
                                        <div className="flex items-center gap-2 text-gray-500 py-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="text-sm">Carregando...</span>
                                        </div>
                                    ) : (
                                        <select
                                            value={selectedPhone}
                                            onChange={(e) => setSelectedPhone(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-green-500"
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Template de Mensagem
                                    </label>
                                    {loadingTemplates ? (
                                        <div className="flex items-center gap-2 text-gray-500 py-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="text-sm">Carregando...</span>
                                        </div>
                                    ) : (
                                        <select
                                            value={selectedTemplate?.name || ''}
                                            onChange={(e) => {
                                                const template = templates.find(t => t.name === e.target.value);
                                                setSelectedTemplate(template || null);
                                            }}
                                            className="w-full px-4 py-2.5 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="">Selecione um template</option>
                                            {templates.map(template => (
                                                <option key={template.id} value={template.name}>
                                                    {template.name} ({template.language})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}

                            {/* Template Preview */}
                            {selectedTemplate && (
                                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                                    <p className="text-xs font-medium text-green-600 mb-2">Preview:</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {getTemplatePreview(selectedTemplate)}
                                    </p>
                                </div>
                            )}

                            {/* Send Button */}
                            <button
                                onClick={handleSendBroadcast}
                                disabled={!selectedWaba || !selectedPhone || !selectedTemplate || contacts.length === 0 || sending}
                                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Iniciando Envio...
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
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
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
                            <Phone className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                            <p>Nenhum broadcast realizado ainda</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {broadcasts.map(broadcast => (
                                <div
                                    key={broadcast.id}
                                    className="p-4 border rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="font-medium text-gray-900">{broadcast.name}</h4>
                                            <p className="text-xs text-gray-500">
                                                {broadcast.templateName} ({broadcast.templateLanguage})
                                            </p>
                                        </div>
                                        <StatusBadge status={broadcast.status} />
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
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
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                                            <div
                                                className="bg-green-600 h-1.5 rounded-full transition-all"
                                                style={{
                                                    width: `${((broadcast.sentCount + broadcast.failedCount) / broadcast.totalContacts) * 100}%`
                                                }}
                                            />
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">
                                            {new Date(broadcast.createdAt).toLocaleString('pt-BR')}
                                        </span>
                                        <div className="flex gap-2">
                                            {broadcast.status === 'processing' && (
                                                <button
                                                    onClick={() => handleCancelBroadcast(broadcast.id)}
                                                    className="text-xs text-yellow-600 hover:text-yellow-700 flex items-center gap-1"
                                                >
                                                    <X className="w-3 h-3" />
                                                    Cancelar
                                                </button>
                                            )}
                                            {['completed', 'failed', 'cancelled'].includes(broadcast.status) && (
                                                <button
                                                    onClick={() => handleDeleteBroadcast(broadcast.id)}
                                                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                    Excluir
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BroadcastPage;
