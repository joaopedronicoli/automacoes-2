import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Loader2, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';

const ResetPasswordPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const { register, handleSubmit, formState: { errors }, watch } = useForm();

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        setError('');

        try {
            await api.post('/auth/reset-password', {
                token,
                newPassword: data.password,
            });
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Falha ao redefinir senha. O link pode ter expirado.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--gradient-subtle)' }}>
                <div className="max-w-md w-full">
                    <div className="glass-card-static rounded-2xl animate-fade-in-up p-8 text-center">
                        <p className="text-red-600 dark:text-red-400 mb-4">Link de redefinição inválido ou expirado.</p>
                        <Link
                            to="/forgot-password"
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium transition-colors"
                        >
                            Solicitar novo link
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--gradient-subtle)' }}>
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <img src="/logo-icon.png" alt="Jolu.ai" className="w-14 h-14 rounded-2xl object-cover mx-auto mb-3 dark:hidden" />
                    <img src="/logo-icon-dark.png" alt="Jolu.ai" className="w-14 h-14 rounded-2xl object-cover mx-auto mb-3 hidden dark:block" />
                    <h1 className="text-2xl font-bold text-foreground">Nova Senha</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Defina sua nova senha</p>
                </div>

                <div className="glass-card-static rounded-2xl animate-fade-in-up p-8">
                    {success ? (
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
                                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h2 className="text-lg font-bold text-foreground mb-2">Senha redefinida!</h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Sua senha foi alterada com sucesso. Agora você pode fazer login.
                            </p>
                            <Link
                                to="/login"
                                className="inline-flex items-center justify-center w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all font-medium shadow-lg shadow-indigo-500/25"
                            >
                                Ir para o login
                            </Link>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl mb-4">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nova senha</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            {...register('password', { required: 'Senha é obrigatória', minLength: { value: 6, message: 'Mínimo 6 caracteres' } })}
                                            className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.08)] transition-all text-foreground placeholder:text-gray-400"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {errors.password && <span className="text-xs text-red-500 mt-1">{errors.password.message as string}</span>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirmar senha</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            {...register('confirmPassword', {
                                                required: 'Confirme a senha',
                                                validate: (val: string) => val === watch('password') || 'As senhas não coincidem',
                                            })}
                                            className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.08)] transition-all text-foreground placeholder:text-gray-400"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {errors.confirmPassword && <span className="text-xs text-red-500 mt-1">{errors.confirmPassword.message as string}</span>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all flex items-center justify-center disabled:opacity-70 font-medium shadow-lg shadow-indigo-500/25 btn-glow"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Redefinir senha'}
                                </button>
                            </form>

                            <div className="mt-6 text-center">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
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

export default ResetPasswordPage;
