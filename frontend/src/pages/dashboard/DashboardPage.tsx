import { useEffect, useState } from 'react';
import { Activity, MessageSquare, ThumbsUp, Users, Loader2 } from 'lucide-react';
import api from '../../services/api';

const StatCard = ({ icon: Icon, label, value, trend }: any) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Icon className="w-6 h-6" />
            </div>
            {trend !== undefined && (
                <span className={`text-sm font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trend > 0 ? '+' : ''}{trend}%
                </span>
            )}
        </div>
        <h3 className="text-gray-500 text-sm font-medium">{label}</h3>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value?.toLocaleString() || '0'}</p>
    </div>
);

const DashboardPage = () => {
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/stats/dashboard');
                setStats(res.data);
            } catch (error) {
                console.error('Failed to fetch dashboard stats', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const statItems = [
        { icon: MessageSquare, label: 'Total de Comentarios', value: stats?.totalComments, trend: stats?.trends?.comments },
        { icon: ThumbsUp, label: 'Total de Curtidas', value: stats?.totalLikes, trend: stats?.trends?.likes },
        { icon: Activity, label: 'Automacoes Executadas', value: stats?.automationsRun, trend: stats?.trends?.automations },
        { icon: Users, label: 'Alcance Potencial', value: stats?.reach, trend: 0 },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Painel</h1>
                <p className="text-gray-500">Visao geral do desempenho das suas redes sociais</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statItems.map((stat, i) => (
                    <StatCard key={i} {...stat} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900">Status do Sistema</h2>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">Operacional</span>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Status da API</span>
                            <span className="font-medium text-green-600">Online</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Webhooks</span>
                            <span className="font-medium text-green-600">Ativos</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Taxa de Sucesso das Automacoes</span>
                            <span className="font-medium text-blue-600">{stats?.successRate || 0}%</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Conectar Mais Contas</h2>
                    <p className="text-gray-500 text-sm mb-4">Amplie seu alcance conectando mais perfis.</p>
                    <a
                        href="/accounts"
                        className="text-primary font-medium hover:underline text-sm"
                    >
                        Gerenciar Contas &rarr;
                    </a>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
