import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../store/store';
import api from '../../services/api';
import { Loader2, Shield, ShieldOff, Trash2, Search, Users, Settings2, X, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Plan {
    id: string;
    name: string;
    slug: string;
    modules: string[];
}

const ALL_SELLABLE_MODULES = ['inbox', 'contacts', 'posts', 'comments', 'automations', 'broadcast', 'jolu_ai'];

interface AdminUser {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    role: string;
    createdAt: string;
    planId: string | null;
    planName: string | null;
    extraModules: string[];
    disabledModules: string[];
    activeModules: string[];
}

const UsersPage = () => {
    const { t } = useTranslation();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [modulesModal, setModulesModal] = useState<AdminUser | null>(null);
    const [modalExtra, setModalExtra] = useState<string[]>([]);
    const [modalDisabled, setModalDisabled] = useState<string[]>([]);
    const [moduleSaving, setModuleSaving] = useState(false);
    const [editModal, setEditModal] = useState<AdminUser | null>(null);
    const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
    const [editSaving, setEditSaving] = useState(false);
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser && currentUser.role !== 'admin') {
            navigate('/');
        }
    }, [currentUser, navigate]);

    useEffect(() => {
        fetchUsers();
        fetchPlans();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/admin/users');
            setUsers(data);
        } catch (err: any) {
            setError(err.response?.data?.message || t('users.failedToLoad'));
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
            setError(err.response?.data?.message || t('users.failedToChangeRole'));
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
            setError(err.response?.data?.message || t('users.failedToRemove'));
        } finally {
            setActionLoading(null);
        }
    };

    const fetchPlans = async () => {
        try {
            const { data } = await api.get('/admin/plans');
            setPlans(data);
        } catch (err) {
            // Plans might not be accessible yet
        }
    };

    const changePlan = async (userId: string, planId: string) => {
        setActionLoading(userId);
        try {
            const { data } = await api.patch(`/admin/users/${userId}/plan`, {
                planId: planId || null,
            });
            setUsers((prev) =>
                prev.map((u) =>
                    u.id === userId
                        ? {
                              ...u,
                              planId: data.planId,
                              planName: data.plan?.name || null,
                              activeModules: data.activeModules || [],
                          }
                        : u,
                ),
            );
        } catch (err: any) {
            setError(err.response?.data?.message || t('users.failedToChangePlan'));
        } finally {
            setActionLoading(null);
        }
    };

    const openModulesModal = (user: AdminUser) => {
        setModulesModal(user);
        setModalExtra(user.extraModules || []);
        setModalDisabled(user.disabledModules || []);
    };

    const saveModules = async () => {
        if (!modulesModal) return;
        setModuleSaving(true);
        try {
            const { data } = await api.patch(`/admin/users/${modulesModal.id}/modules`, {
                extraModules: modalExtra,
                disabledModules: modalDisabled,
            });
            setUsers((prev) =>
                prev.map((u) =>
                    u.id === modulesModal.id
                        ? {
                              ...u,
                              extraModules: data.extraModules || [],
                              disabledModules: data.disabledModules || [],
                              activeModules: data.activeModules || [],
                          }
                        : u,
                ),
            );
            setModulesModal(null);
        } catch (err: any) {
            setError(err.response?.data?.message || t('users.failedToSaveModules'));
        } finally {
            setModuleSaving(false);
        }
    };

    const toggleExtraModule = (mod: string) => {
        setModalExtra((prev) => (prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]));
        setModalDisabled((prev) => prev.filter((m) => m !== mod));
    };

    const toggleDisabledModule = (mod: string) => {
        setModalDisabled((prev) => (prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]));
        setModalExtra((prev) => prev.filter((m) => m !== mod));
    };

    const openEditModal = (user: AdminUser) => {
        setEditForm({ name: user.name || '', email: user.email, phone: user.phone || '' });
        setEditModal(user);
    };

    const saveEditUser = async () => {
        if (!editModal) return;
        setEditSaving(true);
        try {
            const { data } = await api.patch(`/admin/users/${editModal.id}`, editForm);
            setUsers((prev) =>
                prev.map((u) =>
                    u.id === editModal.id
                        ? { ...u, name: data.name, email: data.email, phone: data.phone }
                        : u,
                ),
            );
            setEditModal(null);
        } catch (err: any) {
            setError(err.response?.data?.message || t('users.updateFailed'));
        } finally {
            setEditSaving(false);
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 page-header-accent animate-fade-in-up">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Shield className="w-6 h-6 text-indigo-500" />
                        {t('users.title')}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {users.length === 1 ? t('users.usersCount', { count: users.length }) : t('users.usersCountPlural', { count: users.length })}
                    </p>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('users.searchPlaceholder')}
                        className="pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.08)] transition-all text-sm text-foreground w-full sm:w-80 placeholder:text-gray-400"
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl">
                    {error}
                    <button onClick={() => setError('')} className="ml-2 underline">{t('common.close')}</button>
                </div>
            )}

            {/* Desktop Table */}
            <div className="hidden md:block glass-card rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                            <th className="text-left px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('users.userColumn')}</th>
                            <th className="text-left px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('users.phoneColumn')}</th>
                            <th className="text-left px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('users.roleColumn')}</th>
                            <th className="text-left px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('users.plan')}</th>
                            <th className="text-left px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('users.createdAt')}</th>
                            <th className="text-right px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('common.actions')}</th>
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
                                            <p className="font-medium text-foreground text-sm">{u.name || t('users.noName')}</p>
                                            <p className="text-xs text-muted-foreground">{u.email}</p>
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
                                        {u.role === 'admin' ? t('users.admin') : t('users.userRole')}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={u.planId || ''}
                                            onChange={(e) => changePlan(u.id, e.target.value)}
                                            disabled={actionLoading === u.id}
                                            className="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
                                        >
                                            <option value="">{t('users.noPlan')}</option>
                                            {plans.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => openModulesModal(u)}
                                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                            title={t('users.modules')}
                                        >
                                            <Settings2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-muted-foreground">
                                    {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => openEditModal(u)}
                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                            title={t('users.editUser')}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
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
                                                    title={u.role === 'admin' ? t('users.removeAdmin') : t('users.makeAdmin')}
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
                                                            {actionLoading === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : t('common.confirm')}
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirm(null)}
                                                            className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                                                        >
                                                            {t('common.no')}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setDeleteConfirm(u.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title={t('users.removeUser')}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {u.id === currentUser?.id && (
                                            <span className="text-xs text-gray-400 dark:text-gray-500 italic">{t('common.you')}</span>
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
                        <p className="text-muted-foreground text-sm">
                            {search ? t('users.noUsersSearch') : t('users.noUsers')}
                        </p>
                    </div>
                )}
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {filteredUsers.map((u) => (
                    <div key={u.id} className="glass-card rounded-xl p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-sm font-medium text-white flex-shrink-0">
                                    {u.name?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <p className="font-medium text-foreground text-sm">{u.name || t('users.noName')}</p>
                                    <p className="text-xs text-muted-foreground">{u.email}</p>
                                    {u.phone && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{u.phone}</p>}
                                </div>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${
                                u.role === 'admin'
                                    ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                                {u.role === 'admin' && <Shield className="w-3 h-3" />}
                                {u.role === 'admin' ? t('users.admin') : t('users.userRole')}
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
                                            {t('users.removeAdmin')}
                                        </>
                                    ) : (
                                        <>
                                            <Shield className="w-3.5 h-3.5" />
                                            {t('users.makeAdmin')}
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
                                            {t('common.yes')}
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(null)}
                                            className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-lg"
                                        >
                                            {t('common.no')}
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
                        <p className="text-muted-foreground text-sm">
                            {search ? t('users.noUsersSearch') : t('users.noUsers')}
                        </p>
                    </div>
                )}
            </div>

            {/* Edit User Modal */}
            {editModal && (
                <div className="fixed inset-0 modal-backdrop backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-card-static rounded-2xl max-w-md w-full">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="font-semibold text-foreground">{t('users.editUserTitle')}</h3>
                            <button onClick={() => setEditModal(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.name')}</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.08)]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.email')}</label>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.08)]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.phone')}</label>
                                <input
                                    type="text"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.08)]"
                                    placeholder="+55 11 99999-9999"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={() => setEditModal(null)}
                                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={saveEditUser}
                                disabled={editSaving}
                                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                {editSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {t('common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modules Modal */}
            {modulesModal && (
                <div className="fixed inset-0 modal-backdrop backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-card-static rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                            <div>
                                <h3 className="font-semibold text-foreground">{t('users.modules')}</h3>
                                <p className="text-xs text-muted-foreground">{modulesModal.name || modulesModal.email}</p>
                            </div>
                            <button onClick={() => setModulesModal(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('users.extraModules')}</p>
                            {ALL_SELLABLE_MODULES.map((mod) => (
                                <label key={mod} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={modalExtra.includes(mod)}
                                        onChange={() => toggleExtraModule(mod)}
                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{t(`modules.${mod}`)}</span>
                                    {modalDisabled.includes(mod) && (
                                        <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full ml-auto">{t('common.inactive')}</span>
                                    )}
                                </label>
                            ))}
                            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{t('users.disabledModules')}</p>
                                {ALL_SELLABLE_MODULES.map((mod) => (
                                    <label key={`dis-${mod}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={modalDisabled.includes(mod)}
                                            onChange={() => toggleDisabledModule(mod)}
                                            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{t(`modules.${mod}`)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={() => setModulesModal(null)}
                                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={saveModules}
                                disabled={moduleSaving}
                                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                {moduleSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {t('users.saveModules')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;
