import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Loader2, ArrowLeft, Zap, CheckCircle } from 'lucide-react';

const ForgotPasswordPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm();

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        setError('');

        try {
            await api.post('/auth/forgot-password', { email: data.email });
            setSent(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Falha ao solicitar redefinicao de senha.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-dark via-brand to-brand-light dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4">
                        <Zap className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Redefinir Senha</h1>
                    <p className="text-white/70 mt-1">Enviaremos um link de redefinicao via WhatsApp</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
                    {sent ? (
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Verifique seu WhatsApp</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Se o email estiver cadastrado, voce recebera um link para redefinir sua senha via WhatsApp.
                            </p>
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 text-brand dark:text-blue-400 hover:text-brand-dark font-medium transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Voltar ao login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Esqueceu sua senha?</h2>
                                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                                    Informe seu email e enviaremos um link de redefinicao
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl mb-4">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
                                    <input
                                        type="email"
                                        {...register('email', { required: 'E-mail e obrigatorio' })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all text-gray-900 dark:text-gray-100"
                                        placeholder="voce@exemplo.com"
                                    />
                                    {errors.email && <span className="text-xs text-red-500 mt-1">{errors.email.message as string}</span>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-brand-dark to-brand text-white py-3 rounded-xl hover:from-brand hover:to-brand-light transition-all flex items-center justify-center disabled:opacity-70 font-medium shadow-lg shadow-brand/25"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar link de redefinicao'}
                                </button>
                            </form>

                            <div className="mt-6 text-center">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Voltar ao login
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
