import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ForgotPasswordPage = () => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);
    const [searchParams] = useSearchParams();
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: { email: searchParams.get('email') || '' },
    });

    const [sentVia, setSentVia] = useState('');

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        setError('');

        try {
            const { data: res } = await api.post('/auth/forgot-password', { email: data.email });
            if (res.sent) {
                setSentVia(res.via || '');
                setSent(true);
            } else {
                setError(res.message || t('forgotPassword.failedToSend'));
            }
        } catch (err: any) {
            setError(err.response?.data?.message || t('forgotPassword.requestFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <img src="/logo-icon.png" alt="Jolu.ai" className="w-14 h-14 rounded-2xl object-cover mx-auto mb-3" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('forgotPassword.title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('forgotPassword.subtitle')}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 p-8">
                    {sent ? (
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
                                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{t('forgotPassword.checkMessages')}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                {sentVia === 'whatsapp'
                                    ? t('forgotPassword.sentViaWhatsapp')
                                    : t('forgotPassword.sentViaEmail')}
                            </p>
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                {t('forgotPassword.backToLogin')}
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('forgotPassword.forgotTitle')}</h2>
                                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                                    {t('forgotPassword.forgotSubtitle')}
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl mb-4">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('common.email')}</label>
                                    <input
                                        type="email"
                                        {...register('email', { required: t('login.emailRequired') })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                                        placeholder="voce@exemplo.com"
                                    />
                                    {errors.email && <span className="text-xs text-red-500 mt-1">{errors.email.message as string}</span>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all flex items-center justify-center disabled:opacity-70 font-medium shadow-lg shadow-indigo-500/25"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('forgotPassword.sendResetLink')}
                                </button>
                            </form>

                            <div className="mt-6 text-center">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    {t('forgotPassword.backToLogin')}
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
