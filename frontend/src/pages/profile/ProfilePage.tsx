import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { setUser } from '../../store/authSlice';
import api from '../../services/api';
import { Loader2, User, Lock, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ProfilePage = () => {
    const { t } = useTranslation();
    const user = useSelector((state: RootState) => state.auth.user);
    const dispatch = useDispatch();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setPhone((user as any).phone || '');
        }
    }, [user]);

    const handleSave = async () => {
        setMessage(null);

        if (newPassword && newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: t('profile.passwordMismatch') });
            return;
        }

        if (newPassword && newPassword.length < 6) {
            setMessage({ type: 'error', text: t('profile.passwordMinLength') });
            return;
        }

        setIsSaving(true);

        try {
            const payload: any = { name, phone };
            if (newPassword) {
                payload.currentPassword = currentPassword;
                payload.newPassword = newPassword;
            }

            const { data } = await api.patch('/auth/profile', payload);
            dispatch(setUser(data));

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            if (newPassword) {
                setMessage({ type: 'success', text: t('profile.passwordChangeSuccess') });
            } else {
                setMessage({ type: 'success', text: t('profile.updateSuccess') });
            }
        } catch (err: any) {
            setMessage({
                type: 'error',
                text: err.response?.data?.message || t('profile.updateError'),
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="page-header-accent animate-fade-in-up">
                <h1 className="text-2xl font-bold text-foreground">{t('profile.title')}</h1>
                <p className="text-muted-foreground">{t('profile.subtitle')}</p>
            </div>

            {message && (
                <div
                    className={`p-4 rounded-xl text-sm ${
                        message.type === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                    }`}
                >
                    {message.text}
                </div>
            )}

            {/* Personal Info */}
            <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
                        <User className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                        {t('profile.personalInfo')}
                    </h2>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            {t('profile.nameLabel')}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-foreground"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            {t('profile.emailLabel')}
                        </label>
                        <input
                            type="email"
                            value={user?.email || ''}
                            readOnly
                            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-muted-foreground cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {t('profile.emailReadonly')}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            {t('profile.phoneLabel')}
                        </label>
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder={t('profile.phonePlaceholder')}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-foreground placeholder:text-gray-400"
                        />
                    </div>
                </div>
            </div>

            {/* Change Password */}
            <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                        <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                        {t('profile.changePassword')}
                    </h2>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            {t('profile.currentPassword')}
                        </label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-foreground"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            {t('profile.newPassword')}
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-foreground"
                        />
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {t('profile.passwordMinLength')}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            {t('profile.confirmPassword')}
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-foreground"
                        />
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-70 font-medium shadow-lg shadow-indigo-500/25"
            >
                {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <Save className="w-5 h-5" />
                )}
                {isSaving ? t('profile.saving') : t('profile.saveChanges')}
            </button>
        </div>
    );
};

export default ProfilePage;
