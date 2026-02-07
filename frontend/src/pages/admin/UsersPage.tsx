import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../store/store';
import api from '../../services/api';
import { Loader2, Shield, ShieldOff, Trash2, Search, Users } from 'lucide-react';

interface AdminUser {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    role: string;
    createdAt: string;
}

const UsersPage = () => {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser && currentUser.role !== 'admin') {
            navigate('/');
        }
    }, [currentUser, navigate]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/admin/users');
            setUsers(data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Falha ao carregar usuários');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleRole = async (userId: string, currentRole: string) => {
        setActionLoading(userId);
        try {
            const newRole = currentRole === 'admin' ? 'user' : 'admin';
            const { data } = await api.patch(`/admin/users/${userId}/role`, { role: newRole });
            setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: data.role } : u)));
        } catch (err: any) {
            setError(err.response?.data?.message || 'Falha ao alterar role');
        } finally {
            setActionLoading(null);
        }
    };

    const deleteUser = async (userId: string) => {
        setActionLoading(userId);
        try {
            await api.delete(`/admin/users/${userId}`);
            setUsers((prev) => prev.filter((u) => u.id !== userId));
            setDeleteConfirm(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Falha ao remover usuário');
        } finally {
            setActionLoading(null);
        }
    };

    const filteredUsers = users.filter(
        (u) =>
            u.name?.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            u.phone?.includes(search),
    );

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-indigo-500" />
                        Gerenciar Usuários
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nome, email ou telefone..."
                        className="pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-sm text-gray-900 dark:text-gray-100 w-full sm:w-80 placeholder:text-gray-400"
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl">
                    {error}
                    <button onClick={() => setError('')} className="ml-2 underline">Fechar</button>
                </div>
            )}

            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                            <th className="text-left px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Usuário</th>
                            <th className="text-left px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Telefone</th>
                            <th className="text-left px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Role</th>
                            <th className="text-left px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Criado em</th>
                            <th className="text-right px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                        {filteredUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-sm font-medium text-white flex-shrink-0">
                                            {u.name?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{u.name || 'Sem nome'}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                    {u.phone || <span className="text-gray-400 dark:text-gray-500">—</span>}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                                        u.role === 'admin'
                                            ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                    }`}>
                                        {u.role === 'admin' && <Shield className="w-3 h-3" />}
                                        {u.role === 'admin' ? 'Admin' : 'Usuário'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                    {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        {u.id !== currentUser?.id && (
                                            <>
                                                <button
                                                    onClick={() => toggleRole(u.id, u.role)}
                                                    disabled={actionLoading === u.id}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        u.role === 'admin'
                                                            ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                                            : 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                                    } disabled:opacity-50`}
                                                    title={u.role === 'admin' ? 'Remover admin' : 'Tornar admin'}
                                                >
                                                    {actionLoading === u.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : u.role === 'admin' ? (
                                                        <ShieldOff className="w-4 h-4" />
                                                    ) : (
                                                        <Shield className="w-4 h-4" />
                                                    )}
                                                </button>

                                                {deleteConfirm === u.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => deleteUser(u.id)}
                                                            disabled={actionLoading === u.id}
                                                            className="px-2 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50"
                                                        >
                                                            {actionLoading === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirmar'}
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirm(null)}
                                                            className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                                                        >
                                                            Não
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setDeleteConfirm(u.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Remover usuário"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {u.id === currentUser?.id && (
                                            <span className="text-xs text-gray-400 dark:text-gray-500 italic">Você</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredUsers.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            {search ? 'Nenhum usuário encontrado para essa busca' : 'Nenhum usuário cadastrado'}
                        </p>
                    </div>
                )}
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {filteredUsers.map((u) => (
                    <div key={u.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-sm font-medium text-white flex-shrink-0">
                                    {u.name?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{u.name || 'Sem nome'}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                                    {u.phone && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{u.phone}</p>}
                                </div>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${
                                u.role === 'admin'
                                    ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                                {u.role === 'admin' && <Shield className="w-3 h-3" />}
                                {u.role === 'admin' ? 'Admin' : 'Usuário'}
                            </span>
                        </div>

                        {u.id !== currentUser?.id && (
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={() => toggleRole(u.id, u.role)}
                                    disabled={actionLoading === u.id}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                                        u.role === 'admin'
                                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                                            : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                                    } disabled:opacity-50`}
                                >
                                    {actionLoading === u.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : u.role === 'admin' ? (
                                        <>
                                            <ShieldOff className="w-3.5 h-3.5" />
                                            Remover admin
                                        </>
                                    ) : (
                                        <>
                                            <Shield className="w-3.5 h-3.5" />
                                            Tornar admin
                                        </>
                                    )}
                                </button>

                                {deleteConfirm === u.id ? (
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => deleteUser(u.id)}
                                            disabled={actionLoading === u.id}
                                            className="px-3 py-2 bg-red-600 text-white text-xs rounded-lg disabled:opacity-50"
                                        >
                                            Sim
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(null)}
                                            className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-lg"
                                        >
                                            Não
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setDeleteConfirm(u.id)}
                                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {filteredUsers.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            {search ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UsersPage;
