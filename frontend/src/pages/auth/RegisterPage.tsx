import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../../store/authSlice';
import { setToken } from '../../lib/auth';
import api from '../../services/api';
import { Loader2, Sparkles, Eye, EyeOff } from 'lucide-react';

const RegisterPage = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        setError('');

        try {
            const { data: res } = await api.post('/auth/register', {
                name: `${data.firstName} ${data.lastName}`.trim(),
                email: data.email,
                password: data.password,
                ...(data.phone && { phone: data.phone }),
            });

            setToken(res.token);
            dispatch(setUser(res.user));
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Falha ao criar conta.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
            <div className="max-w-md w-full">
                {/* Logo/Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl mb-3">
                        <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Jolu.ai</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Automação inteligente para redes sociais</p>
                </div>

                {/* Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 p-8">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Criar Conta</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Comece a automatizar suas redes sociais</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nome</label>
                                <input
                                    type="text"
                                    {...register('firstName', { required: 'Obrigatório' })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                                    placeholder="João"
                                />
                                {errors.firstName && <span className="text-xs text-red-500 mt-1">{errors.firstName.message as string}</span>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Sobrenome</label>
                                <input
                                    type="text"
                                    {...register('lastName', { required: 'Obrigatório' })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                                    placeholder="Silva"
                                />
                                {errors.lastName && <span className="text-xs text-red-500 mt-1">{errors.lastName.message as string}</span>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">E-mail</label>
                            <input
                                type="email"
                                {...register('email', { required: 'E-mail é obrigatório' })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                                placeholder="voce@exemplo.com"
                            />
                            {errors.email && <span className="text-xs text-red-500 mt-1">{errors.email.message as string}</span>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Senha</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    {...register('password', { required: 'Senha é obrigatória', minLength: { value: 6, message: 'Mínimo 6 caracteres' } })}
                                    className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Telefone (opcional)</label>
                            <input
                                type="tel"
                                {...register('phone')}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                                placeholder="+55 11 99999-9999"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all flex items-center justify-center disabled:opacity-70 font-medium shadow-lg shadow-indigo-500/25"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Cadastrar'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                        Já tem uma conta?{' '}
                        <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium transition-colors">
                            Entrar
                        </Link>
                    </div>
                </div>

                <p className="text-center text-gray-400 dark:text-gray-500 text-xs mt-6">
                    Ao criar sua conta, você concorda com nossos Termos de Uso
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
