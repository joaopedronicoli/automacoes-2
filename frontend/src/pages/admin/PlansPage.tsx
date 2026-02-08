import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import api from '../../services/api';
import { Loader2, CreditCard, Plus, Trash2, X, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ALL_SELLABLE_MODULES = ['inbox', 'contacts', 'posts', 'comments', 'automations', 'broadcast', 'jolu_ai'];

interface Plan {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    modules: string[];
    isActive: boolean;
    sortOrder: number;
}

const PlansPage = () => {
    const { t } = useTranslation();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const navigate = useNavigate();

    const emptyPlan: Omit<Plan, 'id'> = {
        name: '',
        slug: '',
        description: '',
        price: 0,
        modules: [],
        isActive: true,
        sortOrder: 0,
    };

    const [formData, setFormData] = useState<Omit<Plan, 'id'>>(emptyPlan);

    useEffect(() => {
        if (currentUser && currentUser.role !== 'admin') {
            navigate('/');
        }
    }, [currentUser, navigate]);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const { data } = await api.get('/admin/plans');
            setPlans(data);
        } catch (err: any) {
            setError(err.response?.data?.message || t('adminPlans.loadFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    const openCreate = () => {
        setFormData({ ...emptyPlan, sortOrder: plans.length });
        setEditingPlan(null);
        setIsCreating(true);
    };

    const openEdit = (plan: Plan) => {
        setFormData({
            name: plan.name,
            slug: plan.slug,
            description: plan.description || '',
            price: plan.price,
            modules: plan.modules,
            isActive: plan.isActive,
            sortOrder: plan.sortOrder,
        });
        setEditingPlan(plan);
        setIsCreating(true);
    };

    const closeModal = () => {
        setIsCreating(false);
        setEditingPlan(null);
        setFormData(emptyPlan);
    };

    const toggleModule = (mod: string) => {
        setFormData((prev) => ({
            ...prev,
            modules: prev.modules.includes(mod)
                ? prev.modules.filter((m) => m !== mod)
                : [...prev.modules, mod],
        }));
    };

    const handleSave = async () => {
        if (!formData.name || !formData.slug) {
            setError(t('adminPlans.nameSlugRequired'));
            return;
        }
        setSaving(true);
        try {
            if (editingPlan) {
                const { data } = await api.patch(`/admin/plans/${editingPlan.id}`, formData);
                setPlans((prev) => prev.map((p) => (p.id === editingPlan.id ? data : p)));
            } else {
                const { data } = await api.post('/admin/plans', formData);
                setPlans((prev) => [...prev, data]);
            }
            closeModal();
        } catch (err: any) {
            setError(err.response?.data?.message || t('adminPlans.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const deletePlan = async (id: string) => {
        try {
            await api.delete(`/admin/plans/${id}`);
            setPlans((prev) => prev.filter((p) => p.id !== id));
            setDeleteConfirm(null);
        } catch (err: any) {
            setError(err.response?.data?.message || t('adminPlans.deleteFailed'));
        }
    };

    const toggleActive = async (plan: Plan) => {
        try {
            const { data } = await api.patch(`/admin/plans/${plan.id}`, { isActive: !plan.isActive });
            setPlans((prev) => prev.map((p) => (p.id === plan.id ? data : p)));
        } catch (err: any) {
            setError(err.response?.data?.message || t('adminPlans.saveFailed'));
        }
    };

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
                        <CreditCard className="w-6 h-6 text-indigo-500" />
                        {t('adminPlans.title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        {t('adminPlans.subtitle')}
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    {t('adminPlans.createPlan')}
                </button>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl">
                    {error}
                    <button onClick={() => setError('')} className="ml-2 underline">{t('common.close')}</button>
                </div>
            )}

            {plans.length === 0 ? (
                <div className="text-center py-16">
                    <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">{t('adminPlans.noPlans')}</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {plans
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((plan) => (
                            <div
                                key={plan.id}
                                className={`bg-white dark:bg-gray-800 rounded-xl border ${
                                    plan.isActive
                                        ? 'border-gray-200 dark:border-gray-700'
                                        : 'border-gray-200 dark:border-gray-700 opacity-60'
                                } p-5`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <GripVertical className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                                    {plan.name}
                                                </h3>
                                                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                                                    {plan.slug}
                                                </span>
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        plan.isActive
                                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                                    }`}
                                                >
                                                    {plan.isActive ? t('common.active') : t('common.inactive')}
                                                </span>
                                            </div>
                                            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                                                R$ {Number(plan.price).toFixed(2)}<span className="text-xs font-normal text-gray-400">/{t('adminPlans.month')}</span>
                                            </p>
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {plan.modules.map((mod) => (
                                                    <span
                                                        key={mod}
                                                        className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs"
                                                    >
                                                        {t(`modules.${mod}`)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => toggleActive(plan)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                plan.isActive
                                                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                                                    : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                                            }`}
                                        >
                                            {plan.isActive ? t('adminPlans.deactivate') : t('adminPlans.activate')}
                                        </button>
                                        <button
                                            onClick={() => openEdit(plan)}
                                            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            {t('common.edit')}
                                        </button>
                                        {deleteConfirm === plan.id ? (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => deletePlan(plan.id)}
                                                    className="px-2 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700"
                                                >
                                                    {t('common.confirm')}
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className="px-2 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-lg"
                                                >
                                                    {t('common.no')}
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirm(plan.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                {editingPlan ? t('adminPlans.editPlan') : t('adminPlans.createPlan')}
                            </h3>
                            <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('adminPlans.planName')}
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                                    placeholder="Ex: Pro"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('adminPlans.slug')}
                                </label>
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                                    placeholder="ex: pro"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('adminPlans.price')} (R$)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('adminPlans.order')}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.sortOrder}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('adminPlans.modules')}
                                </label>
                                <div className="space-y-2">
                                    {ALL_SELLABLE_MODULES.map((mod) => (
                                        <label key={mod} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.modules.includes(mod)}
                                                onChange={() => toggleModule(mod)}
                                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{t(`modules.${mod}`)}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('adminPlans.active')}</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {t('adminPlans.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlansPage;
