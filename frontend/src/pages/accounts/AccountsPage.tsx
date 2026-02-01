import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import api from '../../services/api';
import { Facebook, Instagram, Youtube, Music, Loader2 } from 'lucide-react';

const AccountsPage = () => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useSelector((state: RootState) => state.auth);

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/social-accounts');
            setAccounts(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleConnect = async (platform: string) => {
        // Get Supabase token to authenticate the request
        const { supabase } = await import('../../lib/supabase');
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) {
            console.error('No auth token available');
            return;
        }

        // Use relative /api path - Nginx proxies to backend in production,
        // Vite proxy handles it in development
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Contas Conectadas</h1>
                    <p className="text-gray-500">Gerencie suas conexoes de redes sociais</p>
                </div>
            </div>

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
                        <div key={account.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${account.platform === 'facebook' ? 'bg-[#1877F2]/10 text-[#1877F2]' :
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
                    ))}

                    {accounts.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed text-gray-500">
                            Nenhuma conta conectada ainda. Selecione uma plataforma acima para comecar.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AccountsPage;
