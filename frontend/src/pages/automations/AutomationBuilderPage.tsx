import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import {
    Loader2,
    ArrowLeft,
    Zap,
    MessageCircle,
    Send,
    Sparkles,
    Package,
    Image,
    ChevronDown,
    ChevronUp,
    Search,
    X,
    Bot,
    MessageSquare,
    Reply,
    Phone
} from 'lucide-react';

// Utility function to format prices
const formatPrice = (price: string): string => {
    if (!price) return '0.00';
    const num = parseFloat(price);
    return isNaN(num) ? '0.00' : num.toFixed(2);
};

interface Product {
    id: number;
    name: string;
    price: string;
    regular_price: string;
    sale_price: string;
    description: string;
    short_description: string;
    permalink: string;
    images: Array<{ src: string; alt: string }>;
    categories: Array<{ id: number; name: string }>;
    stock_status: string;
    stock_quantity: number | null;
}

interface Integration {
    id: string;
    type: string;
    name: string;
    storeUrl: string;
    status: string;
}

interface WABA {
    id: string;
    name: string;
}

interface PhoneNumber {
    id: string;
    display_phone_number: string;
    verified_name: string;
    quality_rating: string;
    status: string;
}

interface MessageTemplate {
    id: string;
    name: string;
    language: string;
    status: string;
    category: string;
    components: Array<{
        type: string;
        format?: string;
        text?: string;
    }>;
}

interface WhatsAppConfig {
    wabaId: string;
    phoneNumberId: string;
    templateName: string;
    templateLanguage: string;
    templateComponents: any[];
}

const AutomationBuilderPage = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [hasWooCommerce, setHasWooCommerce] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        post: true,
        product: true,
        triggers: true,
        actions: true,
        ai: true
    });
    const [activeAction, setActiveAction] = useState<'comment' | 'dm' | 'flow' | 'whatsapp'>('comment');

    // WhatsApp states
    const [wabas, setWabas] = useState<WABA[]>([]);
    const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [loadingWabas, setLoadingWabas] = useState(false);
    const [loadingPhones, setLoadingPhones] = useState(false);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig>({
        wabaId: '',
        phoneNumberId: '',
        templateName: '',
        templateLanguage: '',
        templateComponents: []
    });
    const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);

    const navigate = useNavigate();
    const location = useLocation();
    const postData = location.state?.post;

    useEffect(() => {
        checkWooCommerceIntegration();
    }, []);

    const checkWooCommerceIntegration = async () => {
        try {
            const res = await api.get('/integrations');
            const integrations: Integration[] = res.data;
            const wooIntegration = integrations.find(i => i.type === 'woocommerce' && i.status === 'active');
            setHasWooCommerce(!!wooIntegration);
            if (wooIntegration) {
                fetchProducts();
            }
        } catch (error) {
            console.error('Erro ao verificar integracoes:', error);
        }
    };

    const fetchProducts = async (search?: string) => {
        setLoadingProducts(true);
        try {
            const params = search ? `?search=${encodeURIComponent(search)}&limit=100` : '?limit=100';
            const res = await api.get(`/integrations/woocommerce/products${params}`);
            setProducts(res.data);
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        } finally {
            setLoadingProducts(false);
        }
    };

    // Debounce para buscar na API quando digitar
    useEffect(() => {
        if (!hasWooCommerce) return;

        const timeoutId = setTimeout(() => {
            if (productSearch.length >= 2) {
                fetchProducts(productSearch);
            } else if (productSearch.length === 0) {
                fetchProducts();
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [productSearch, hasWooCommerce]);

    const filteredProducts = products;

    // WhatsApp data fetching
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
        if (!wabaId) return;
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
        if (!wabaId) return;
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

    // Load WABAs when WhatsApp tab is selected
    useEffect(() => {
        if (activeAction === 'whatsapp' && wabas.length === 0) {
            fetchWabas();
        }
    }, [activeAction]);

    // Load phone numbers and templates when WABA changes
    useEffect(() => {
        if (whatsappConfig.wabaId) {
            fetchPhoneNumbers(whatsappConfig.wabaId);
            fetchTemplates(whatsappConfig.wabaId);
        }
    }, [whatsappConfig.wabaId]);

    const handleWabaChange = (wabaId: string) => {
        setWhatsappConfig({
            wabaId,
            phoneNumberId: '',
            templateName: '',
            templateLanguage: '',
            templateComponents: []
        });
        setPhoneNumbers([]);
        setTemplates([]);
        setSelectedTemplate(null);
    };

    const handleTemplateChange = (templateName: string) => {
        const template = templates.find(t => t.name === templateName);
        setSelectedTemplate(template || null);
        setWhatsappConfig(prev => ({
            ...prev,
            templateName: template?.name || '',
            templateLanguage: template?.language || '',
            templateComponents: []
        }));
    };

    const getTemplatePreview = (template: MessageTemplate | null) => {
        if (!template) return '';
        const bodyComponent = template.components?.find(c => c.type === 'BODY');
        return bodyComponent?.text || '';
    };

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const buildAIContext = () => {
        let context = '';

        if (postData?.content) {
            context += `LEGENDA DO POST:\n${postData.content}\n\n`;
        }

        if (selectedProduct) {
            context += `PRODUTO SELECIONADO:\n`;
            context += `Nome: ${selectedProduct.name}\n`;
            context += `Preco: R$ ${formatPrice(selectedProduct.sale_price || selectedProduct.price)}\n`;
            context += `Descricao: ${selectedProduct.short_description || selectedProduct.description}\n`;
            if (selectedProduct.categories?.length) {
                context += `Categorias: ${selectedProduct.categories.map(c => c.name).join(', ')}\n`;
            }
            context += `Link: ${selectedProduct.permalink}\n`;
        }

        return context;
    };

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            const aiContext = buildAIContext();

            const payload = {
                name: data.name,
                postId: postData?.id || null,
                socialAccountId: postData?.accountId || null,
                status: 'active',
                triggers: {
                    keywords: data.keywords ? data.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k) : [],
                    detectQuestions: data.detectQuestions,
                    allComments: data.allComments
                },
                responseConfig: {
                    commentReply: data.replyText ? { message: data.replyText } : undefined,
                    directMessage: data.dmText ? { message: data.dmText } : undefined,
                    useAI: data.useAI,
                    aiContext: aiContext,
                    aiPrompt: data.aiPrompt,
                    whatsappTemplate: whatsappConfig.wabaId && whatsappConfig.phoneNumberId && whatsappConfig.templateName ? {
                        wabaId: whatsappConfig.wabaId,
                        phoneNumberId: whatsappConfig.phoneNumberId,
                        templateName: whatsappConfig.templateName,
                        templateLanguage: whatsappConfig.templateLanguage,
                        templateComponents: whatsappConfig.templateComponents
                    } : undefined
                },
                productId: selectedProduct?.id?.toString() || null,
                productData: selectedProduct ? {
                    name: selectedProduct.name,
                    price: selectedProduct.price,
                    promoPrice: selectedProduct.sale_price,
                    description: selectedProduct.short_description || selectedProduct.description,
                    permalink: selectedProduct.permalink,
                    image: selectedProduct.images?.[0]?.src
                } : null
            };

            await api.post('/automations', payload);
            navigate('/automations');
        } catch (error) {
            console.error(error);
            alert('Falha ao criar automacao');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-white/80 rounded-xl transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
                                <Zap className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Criar Automacao</h1>
                                <p className="text-sm text-gray-500">Configure respostas inteligentes para seus seguidores</p>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Post Info Section */}
                    {postData && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => toggleSection('post')}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-pink-100 rounded-lg">
                                        <Image className="w-5 h-5 text-pink-600" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-semibold text-gray-900">Publicacao Selecionada</h3>
                                        <p className="text-sm text-gray-500">{postData.accountName} - {postData.platform}</p>
                                    </div>
                                </div>
                                {expandedSections.post ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                            </button>

                            {expandedSections.post && (
                                <div className="px-6 pb-6 border-t">
                                    <div className="mt-4 flex gap-4">
                                        {postData.mediaUrl && (
                                            postData.mediaType === 'video' ? (
                                                <div className="w-32 h-32 rounded-xl overflow-hidden bg-black relative">
                                                    <video
                                                        src={postData.mediaUrl}
                                                        poster={postData.thumbnailUrl}
                                                        controls
                                                        className="w-full h-full object-contain"
                                                        preload="metadata"
                                                    />
                                                </div>
                                            ) : (
                                                <img
                                                    src={postData.mediaUrl}
                                                    alt="Post"
                                                    className="w-32 h-32 object-cover rounded-xl"
                                                />
                                            )
                                        )}
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Legenda do Post</label>
                                            <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-700 max-h-32 overflow-y-auto">
                                                {postData.content || 'Sem legenda'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Sparkles className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="font-semibold text-gray-900">Nome da Automacao</h3>
                        </div>
                        <input
                            {...register('name', { required: 'Nome e obrigatorio' })}
                            className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all"
                            placeholder="Ex: Resposta automatica sobre precos"
                        />
                        {errors.name && <span className="text-xs text-red-500 mt-1">{errors.name.message as string}</span>}
                    </div>

                    {/* Product Selection */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => toggleSection('product')}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <Package className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-gray-900">Produto Relacionado</h3>
                                    <p className="text-sm text-gray-500">
                                        {selectedProduct ? selectedProduct.name : hasWooCommerce ? 'Selecione um produto para contextualizar' : 'Conecte sua loja WooCommerce em Contas'}
                                    </p>
                                </div>
                            </div>
                            {expandedSections.product ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </button>

                        {expandedSections.product && (
                            <div className="px-6 pb-6 border-t">
                                <div className="mt-4">
                                    {selectedProduct ? (
                                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                                            {selectedProduct.images?.[0]?.src && (
                                                <img
                                                    src={selectedProduct.images[0].src}
                                                    alt={selectedProduct.name}
                                                    className="w-20 h-20 object-cover rounded-lg"
                                                />
                                            )}
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-gray-900">{selectedProduct.name}</h4>
                                                {selectedProduct.categories?.[0] && (
                                                    <p className="text-sm text-gray-600">{selectedProduct.categories[0].name}</p>
                                                )}
                                                <p className="text-lg font-bold text-green-600 mt-1">
                                                    R$ {formatPrice(selectedProduct.sale_price || selectedProduct.price)}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedProduct(null)}
                                                className="p-2 hover:bg-white rounded-lg transition-colors"
                                            >
                                                <X className="w-5 h-5 text-gray-400" />
                                            </button>
                                        </div>
                                    ) : hasWooCommerce ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowProductModal(true)}
                                            className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-all"
                                        >
                                            + Selecionar Produto
                                        </button>
                                    ) : (
                                        <div className="w-full py-4 px-6 bg-gray-50 rounded-xl text-center">
                                            <p className="text-gray-500 text-sm mb-2">Nenhuma loja conectada</p>
                                            <button
                                                type="button"
                                                onClick={() => navigate('/accounts')}
                                                className="text-purple-600 text-sm font-medium hover:underline"
                                            >
                                                Conectar WooCommerce
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Triggers */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => toggleSection('triggers')}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <Zap className="w-5 h-5 text-orange-600" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-gray-900">Gatilhos</h3>
                                    <p className="text-sm text-gray-500">Quando a automacao deve ser ativada</p>
                                </div>
                            </div>
                            {expandedSections.triggers ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </button>

                        {expandedSections.triggers && (
                            <div className="px-6 pb-6 border-t space-y-4">
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Palavras-chave</label>
                                    <textarea
                                        {...register('keywords')}
                                        className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                                        placeholder="preco, valor, quanto custa, comprar"
                                        rows={2}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Separe por virgula. A automacao dispara quando detectar essas palavras.</p>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            {...register('detectQuestions')}
                                            className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-sm text-gray-700">Apenas perguntas (?)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            {...register('allComments')}
                                            className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-sm text-gray-700">Todos os comentarios</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => toggleSection('actions')}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <MessageCircle className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-gray-900">Acoes</h3>
                                    <p className="text-sm text-gray-500">O que fazer quando o gatilho for ativado</p>
                                </div>
                            </div>
                            {expandedSections.actions ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </button>

                        {expandedSections.actions && (
                            <div className="px-6 pb-6 border-t">
                                {/* Action Type Tabs */}
                                <div className="mt-4 flex gap-2 p-1 bg-gray-100 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setActiveAction('comment')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeAction === 'comment'
                                            ? 'bg-white text-purple-600 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        <Reply className="w-4 h-4" />
                                        Responder Comentario
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveAction('dm')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeAction === 'dm'
                                            ? 'bg-white text-purple-600 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        <Send className="w-4 h-4" />
                                        Enviar DM
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveAction('flow')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeAction === 'flow'
                                            ? 'bg-white text-purple-600 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        Fluxo IA
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveAction('whatsapp')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeAction === 'whatsapp'
                                            ? 'bg-white text-green-600 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        <Phone className="w-4 h-4" />
                                        WhatsApp
                                    </button>
                                </div>

                                {/* Action Content */}
                                <div className="mt-4 space-y-4">
                                    {activeAction === 'comment' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem de Resposta</label>
                                            <textarea
                                                {...register('replyText')}
                                                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                                                placeholder="Ola {{name}}! Obrigado pelo interesse..."
                                                rows={4}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Use {'{{name}}'} para o nome do usuario</p>
                                        </div>
                                    )}

                                    {activeAction === 'dm' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem Direta</label>
                                            <textarea
                                                {...register('dmText')}
                                                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                                                placeholder="Oi {{name}}! Vi seu comentario e quero te ajudar..."
                                                rows={4}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Mensagem enviada no privado automaticamente</p>
                                        </div>
                                    )}

                                    {activeAction === 'flow' && (
                                        <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-100">
                                            <div className="flex items-center gap-3 mb-4">
                                                <Bot className="w-8 h-8 text-purple-600" />
                                                <div>
                                                    <h4 className="font-semibold text-gray-900">Fluxo de Conversa com IA</h4>
                                                    <p className="text-sm text-gray-600">A IA conduzira a conversa baseada no contexto</p>
                                                </div>
                                            </div>

                                            <label className="flex items-center gap-2 cursor-pointer mb-4">
                                                <input
                                                    type="checkbox"
                                                    {...register('useAI')}
                                                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                />
                                                <span className="text-sm font-medium text-gray-700">Ativar respostas com IA</span>
                                            </label>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Instrucoes para a IA</label>
                                                <textarea
                                                    {...register('aiPrompt')}
                                                    className="w-full px-4 py-3 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                                                    placeholder="Voce e uma atendente da Patricia Elias Dermocosmeticos. Seja cordial, tire duvidas sobre o produto e direcione para compra..."
                                                    rows={4}
                                                />
                                            </div>

                                            {(postData || selectedProduct) && (
                                                <div className="mt-4 p-4 bg-white rounded-lg border border-purple-100">
                                                    <p className="text-xs font-medium text-purple-600 mb-2">Contexto automatico incluido:</p>
                                                    <div className="text-xs text-gray-600 space-y-1">
                                                        {postData?.content && <p>- Legenda do post</p>}
                                                        {selectedProduct && <p>- Informacoes do produto: {selectedProduct.name}</p>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeAction === 'whatsapp' && (
                                        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                                            <div className="flex items-center gap-3 mb-4">
                                                <Phone className="w-8 h-8 text-green-600" />
                                                <div>
                                                    <h4 className="font-semibold text-gray-900">WhatsApp Business</h4>
                                                    <p className="text-sm text-gray-600">Envie templates aprovados via WhatsApp</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {/* WABA Selection */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Conta WhatsApp Business (WABA)
                                                    </label>
                                                    {loadingWabas ? (
                                                        <div className="flex items-center gap-2 text-gray-500">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            <span className="text-sm">Carregando contas...</span>
                                                        </div>
                                                    ) : wabas.length === 0 ? (
                                                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                            <p className="text-sm text-yellow-800">
                                                                Nenhuma conta WhatsApp Business encontrada. Reconecte sua conta do Facebook com permissoes do WhatsApp.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <select
                                                            value={whatsappConfig.wabaId}
                                                            onChange={(e) => handleWabaChange(e.target.value)}
                                                            className="w-full px-4 py-3 bg-white border border-green-200 rounded-xl focus:ring-2 focus:ring-green-500"
                                                        >
                                                            <option value="">Selecione uma conta</option>
                                                            {wabas.map(waba => (
                                                                <option key={waba.id} value={waba.id}>
                                                                    {waba.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>

                                                {/* Phone Number Selection */}
                                                {whatsappConfig.wabaId && (
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Numero de Telefone
                                                        </label>
                                                        {loadingPhones ? (
                                                            <div className="flex items-center gap-2 text-gray-500">
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                <span className="text-sm">Carregando numeros...</span>
                                                            </div>
                                                        ) : phoneNumbers.length === 0 ? (
                                                            <p className="text-sm text-gray-500">Nenhum numero encontrado</p>
                                                        ) : (
                                                            <select
                                                                value={whatsappConfig.phoneNumberId}
                                                                onChange={(e) => setWhatsappConfig(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                                                                className="w-full px-4 py-3 bg-white border border-green-200 rounded-xl focus:ring-2 focus:ring-green-500"
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
                                                {whatsappConfig.wabaId && whatsappConfig.phoneNumberId && (
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Template de Mensagem
                                                        </label>
                                                        {loadingTemplates ? (
                                                            <div className="flex items-center gap-2 text-gray-500">
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                <span className="text-sm">Carregando templates...</span>
                                                            </div>
                                                        ) : templates.length === 0 ? (
                                                            <p className="text-sm text-gray-500">Nenhum template aprovado encontrado</p>
                                                        ) : (
                                                            <select
                                                                value={whatsappConfig.templateName}
                                                                onChange={(e) => handleTemplateChange(e.target.value)}
                                                                className="w-full px-4 py-3 bg-white border border-green-200 rounded-xl focus:ring-2 focus:ring-green-500"
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
                                                    <div className="p-4 bg-white rounded-lg border border-green-100">
                                                        <p className="text-xs font-medium text-green-600 mb-2">Preview do Template:</p>
                                                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                                            {getTemplatePreview(selectedTemplate)}
                                                        </div>
                                                        <div className="mt-2 flex gap-2">
                                                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                                                {selectedTemplate.category}
                                                            </span>
                                                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                                                {selectedTemplate.language}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/automations')}
                            className="px-6 py-3 text-gray-700 hover:bg-white rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg shadow-purple-500/25 flex items-center gap-2 font-medium"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Zap className="w-5 h-5" />
                                    Criar Automacao
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Product Selection Modal */}
            {showProductModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                        <div className="p-6 border-b">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Selecionar Produto</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowProductModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar produto..."
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>

                        <div className="overflow-y-auto max-h-96 p-4 space-y-2">
                            {!hasWooCommerce ? (
                                <div className="text-center py-8">
                                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                    <p className="text-gray-500 mb-2">Nenhuma loja conectada</p>
                                    <button
                                        type="button"
                                        onClick={() => { setShowProductModal(false); navigate('/accounts'); }}
                                        className="text-purple-600 text-sm font-medium hover:underline"
                                    >
                                        Ir para Contas e conectar WooCommerce
                                    </button>
                                </div>
                            ) : loadingProducts ? (
                                <div className="text-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
                                    <p className="text-gray-500 mt-2">Carregando produtos...</p>
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Nenhum produto encontrado
                                </div>
                            ) : (
                                filteredProducts.map((product) => (
                                    <button
                                        key={product.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedProduct(product);
                                            setShowProductModal(false);
                                        }}
                                        className="w-full flex items-center gap-4 p-4 hover:bg-purple-50 rounded-xl transition-colors text-left border border-transparent hover:border-purple-200"
                                    >
                                        {product.images?.[0]?.src && (
                                            <img
                                                src={product.images[0].src}
                                                alt={product.name}
                                                className="w-16 h-16 object-cover rounded-lg"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                                            {product.categories?.[0] && (
                                                <p className="text-sm text-gray-500">{product.categories[0].name}</p>
                                            )}
                                            <p className="text-sm font-semibold text-green-600 mt-1">
                                                R$ {formatPrice(product.sale_price || product.price)}
                                            </p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AutomationBuilderPage;
