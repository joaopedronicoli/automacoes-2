import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, Zap } from 'lucide-react';

const RegisterPage = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        setError('');

        try {
            const { error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        first_name: data.firstName,
                        last_name: data.lastName,
                    },
                },
            });

            if (authError) throw authError;
            navigate('/login?registered=true');
        } catch (err: any) {
            setError(err.message || 'Falha ao criar conta.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-dark via-brand to-brand-light px-4 py-8">
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
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Criar Conta</h2>
                        <p className="text-gray-500 mt-1 text-sm">Comece a automatizar suas redes sociais</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                <input
                                    type="text"
                                    {...register('firstName', { required: 'Obrigatorio' })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                                    placeholder="Joao"
                                />
                                {errors.firstName && <span className="text-xs text-red-500 mt-1">{errors.firstName.message as string}</span>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sobrenome</label>
                                <input
                                    type="text"
                                    {...register('lastName', { required: 'Obrigatorio' })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                                    placeholder="Silva"
                                />
                                {errors.lastName && <span className="text-xs text-red-500 mt-1">{errors.lastName.message as string}</span>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                            <input
                                type="email"
                                {...register('email', { required: 'E-mail e obrigatorio' })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                                placeholder="voce@exemplo.com"
                            />
                            {errors.email && <span className="text-xs text-red-500 mt-1">{errors.email.message as string}</span>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                            <input
                                type="password"
                                {...register('password', { required: 'Senha e obrigatoria', minLength: { value: 6, message: 'Minimo 6 caracteres' } })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                                placeholder="••••••••"
                            />
                            {errors.password && <span className="text-xs text-red-500 mt-1">{errors.password.message as string}</span>}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-brand-dark to-brand text-white py-3 rounded-xl hover:from-brand hover:to-brand-light transition-all flex items-center justify-center disabled:opacity-70 font-medium shadow-lg shadow-brand/25"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Cadastrar'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-600">
                        Ja tem uma conta?{' '}
                        <Link to="/login" className="text-brand hover:text-brand-dark font-medium transition-colors">
                            Entrar
                        </Link>
                    </div>
                </div>

                <p className="text-center text-white/50 text-xs mt-6">
                    Ao criar sua conta, voce concorda com nossos Termos de Uso
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
