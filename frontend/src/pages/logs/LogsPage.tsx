import { useEffect, useState } from 'react';
import api from '../../services/api';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Info, RefreshCcw, Download } from 'lucide-react';

const LogsPage = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/logs');
            setLogs(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleExport = () => {
        if (!logs.length) return;

        const headers = ['Horario', 'Status', 'Tipo de Acao', 'Detalhes', 'ID da Automacao'];
        const csvContent = [
            headers.join(','),
            ...logs.map(log => [
                `"${format(new Date(log.executedAt), 'yyyy-MM-dd HH:mm:ss')}"`,
                log.status,
                log.actionType,
                `"${(log.content || '').replace(/"/g, '""')}"`,
                log.automationId || 'N/A'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `logs_automacao_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <Info className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Logs de Atividade</h1>
                    <p className="text-gray-500">Historico de acoes automatizadas</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
                        title="Exportar CSV"
                    >
                        <Download className="w-4 h-4" />
                        Exportar CSV
                    </button>
                    <button
                        onClick={fetchLogs}
                        className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                        title="Atualizar Logs"
                    >
                        <RefreshCcw className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12">Carregando logs...</div>
            ) : logs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed text-gray-500">
                    Nenhum log de atividade encontrado ainda.
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acao</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalhes</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID da Automacao</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {logs.map((log) => (
                                <tr key={log.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {format(new Date(log.executedAt), 'dd/MM, HH:mm:ss')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-sm text-gray-900 capitalize">
                                            {getStatusIcon(log.status)}
                                            {log.status === 'success' ? 'Sucesso' : log.status === 'error' ? 'Erro' : log.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                                        {log.actionType.replace('_', ' ')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-500 max-w-xs truncate" title={log.content}>
                                            {log.content}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                                        {log.automationId?.slice(0, 8)}...
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

export default LogsPage;
