import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Plus, Trash2, Zap } from 'lucide-react';

const AutomationsPage = () => {
    const [automations, setAutomations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAutomations();
    }, []);

    const fetchAutomations = async () => {
        try {
            const res = await api.get('/automations');
            setAutomations(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'paused' : 'active';
        try {
            await api.patch(`/automations/${id}`, { status: newStatus });
            setAutomations(automations.map(a =>
                a.id === id ? { ...a, status: newStatus } : a
            ));
        } catch (error) {
            console.error('Failed to toggle status', error);
        }
    };

    const deleteAutomation = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta automacao?')) return;
        try {
            await api.delete(`/automations/${id}`);
            setAutomations(automations.filter(a => a.id !== id));
        } catch (error) {
            console.error('Failed to delete', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Automacoes</h1>
                    <p className="text-gray-500">Configure suas respostas automaticas e gatilhos</p>
                </div>
                <Link
                    to="/automations/new"
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Criar Automacao
                </Link>
            </div>

            {isLoading ? (
                <div className="text-center py-12">Carregando automacoes...</div>
            ) : automations.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed text-gray-500">
                    Nenhuma automacao encontrada. Crie a sua primeira!
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gatilhos</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acoes</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acoes</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {automations.map((automation) => (
                                <tr key={automation.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                                                <Zap className="w-5 h-5" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{automation.name}</div>
                                                <div className="text-xs text-gray-500">ID: {automation.id.slice(0, 8)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">
                                            {automation.triggers?.keywords?.length > 0
                                                ? `Palavras-chave: ${automation.triggers.keywords.join(', ')}`
                                                : 'Multiplos'
                                            }
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-500">
                                            {automation.responseConfig?.commentReply ? 'Responder Comentario, ' : ''}
                                            {automation.responseConfig?.directMessage ? 'Enviar DM' : ''}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => toggleStatus(automation.id, automation.status)}
                                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer transition-colors ${automation.status === 'active'
                                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                }`}
                                        >
                                            {automation.status === 'active' ? 'Ativo' : 'Pausado'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => deleteAutomation(automation.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AutomationsPage;
