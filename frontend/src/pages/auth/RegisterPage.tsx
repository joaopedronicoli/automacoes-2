import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

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
            navigate('/login');
        } catch (err: any) {
            setError(err.message || 'Falha ao criar conta.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Criar Conta</h1>
                    <p className="text-gray-500 mt-2">Comece a automatizar suas redes sociais</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4">
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
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="Joao"
                            />
                            {errors.firstName && <span className="text-xs text-red-500 mt-1">{errors.firstName.message as string}</span>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sobrenome</label>
                            <input
                                type="text"
                                {...register('lastName', { required: 'Obrigatorio' })}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="voce@exemplo.com"
                        />
                        {errors.email && <span className="text-xs text-red-500 mt-1">{errors.email.message as string}</span>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                        <input
                            type="password"
                            {...register('password', { required: 'Senha e obrigatoria', minLength: { value: 6, message: 'Minimo 6 caracteres' } })}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="••••••••"
                        />
                        {errors.password && <span className="text-xs text-red-500 mt-1">{errors.password.message as string}</span>}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center disabled:opacity-70"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Cadastrar'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm">
                    Ja tem uma conta?{' '}
                    <Link to="/login" className="text-primary hover:underline font-medium">
                        Entrar
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
