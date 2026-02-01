import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Loader2, ArrowLeft } from 'lucide-react';

const AutomationBuilderPage = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            const payload = {
                name: data.name,
                status: 'active',
                triggers: {
                    keywords: data.keywords ? data.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k) : [],
                    detectQuestions: data.detectQuestions
                },
                responseConfig: {
                    commentReply: data.replyText ? { message: data.replyText } : undefined,
                    directMessage: data.dmText ? { message: data.dmText } : undefined
                }
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
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Criar Fluxo de Trabalho</h1>
                    <p className="text-gray-500">Defina gatilhos e acoes</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Info */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">1. Informacoes Basicas</h2>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Automacao</label>
                        <input
                            {...register('name', { required: 'Nome e obrigatorio' })}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="ex. Resposta sobre Preco"
                        />
                        {errors.name && <span className="text-xs text-red-500">{errors.name.message as string}</span>}
                    </div>
                </div>

                {/* Triggers */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">2. Gatilhos</h2>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Palavras-chave (separadas por virgula)</label>
                        <textarea
                            {...register('keywords')}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="preco, valor, quanto custa"
                            rows={3}
                        />
                        <p className="text-xs text-gray-500 mt-1">Deixe vazio para corresponder a todos os comentarios (se "Detectar Perguntas" estiver desativado)</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" {...register('detectQuestions')} id="q-check" className="rounded border-gray-300 text-primary focus:ring-primary" />
                        <label htmlFor="q-check" className="text-sm text-gray-700">Disparar apenas em perguntas (?)</label>
                    </div>
                </div>

                {/* Actions */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">3. Acoes</h2>

                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">Responder ao Comentario</label>
                        <textarea
                            {...register('replyText')}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="Ola {{name}}, obrigado por perguntar! O preco e..."
                            rows={3}
                        />
                        <p className="text-xs text-gray-500">Use {'{{name}}'} para inserir o nome do usuario.</p>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                        <label className="block text-sm font-medium text-gray-700">Enviar Mensagem Direta (DM)</label>
                        <textarea
                            {...register('dmText')}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="Aqui estao mais detalhes em particular..."
                            rows={3}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/automations')}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 flex items-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Automacao'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AutomationBuilderPage;
