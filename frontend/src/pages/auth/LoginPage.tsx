import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, Mail, CheckCircle, Zap } from 'lucide-react';

const LoginPage = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchParams] = useSearchParams();
    const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (searchParams.get('registered') === 'true') {
            setShowRegistrationSuccess(true);
        }
    }, [searchParams]);

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        setError('');

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (authError) throw authError;
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Falha ao entrar. Verifique suas credenciais.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-dark via-brand to-brand-light dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
            <div className="max-w-md w-full">
                {/* Logo/Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4">
                        <Zap className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Automacoes</h1>
                    <p className="text-white/70 mt-1">Gerencie suas redes sociais</p>
                </div>

                {/* Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Bem-vindo de Volta</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Entre para gerenciar suas automacoes</p>
                    </div>

                    {/* Registration Success Message */}
                    {showRegistrationSuccess && (
                        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300 p-4 rounded-xl mb-6">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium">Cadastro realizado com sucesso!</p>
                                    <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                                        Enviamos um e-mail de confirmacao para o seu endereco.
                                        Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
                                    </p>
                                    <div className="flex items-center gap-2 mt-2 text-sm text-green-600 dark:text-green-400">
                                        <Mail className="w-4 h-4" />
                                        <span>Verifique tambem a pasta de spam</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha</label>
                            <input
                                type="password"
                                {...register('password', { required: 'Senha e obrigatoria' })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all text-gray-900 dark:text-gray-100"
                                placeholder="••••••••"
                            />
                            {errors.password && <span className="text-xs text-red-500 mt-1">{errors.password.message as string}</span>}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-brand-dark to-brand text-white py-3 rounded-xl hover:from-brand hover:to-brand-light transition-all flex items-center justify-center disabled:opacity-70 font-medium shadow-lg shadow-brand/25"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                        Nao tem uma conta?{' '}
                        <Link to="/register" className="text-brand dark:text-blue-400 hover:text-brand-dark font-medium transition-colors">
                            Cadastre-se
                        </Link>
                    </div>
                </div>

                <p className="text-center text-white/50 text-xs mt-6">
                    Ao entrar, voce concorda com nossos Termos de Uso
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
