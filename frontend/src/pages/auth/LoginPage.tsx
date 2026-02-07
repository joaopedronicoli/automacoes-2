import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../../store/authSlice';
import { setToken } from '../../lib/auth';
import api from '../../services/api';
import { Loader2, Mail, CheckCircle, Zap, Phone } from 'lucide-react';

type LoginMode = 'password' | 'otp';

const LoginPage = () => {
    const [mode, setMode] = useState<LoginMode>('password');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isPasswordError, setIsPasswordError] = useState(false);
    const [searchParams] = useSearchParams();
    const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const passwordForm = useForm();
    const otpForm = useForm();

    useEffect(() => {
        if (searchParams.get('registered') === 'true') {
            setShowRegistrationSuccess(true);
        }
    }, [searchParams]);

    const onPasswordSubmit = async (data: any) => {
        setIsLoading(true);
        setError('');
        setIsPasswordError(false);

        try {
            const { data: res } = await api.post('/auth/login', {
                email: data.email,
                password: data.password,
            });

            setToken(res.token);
            dispatch(setUser(res.user));
            navigate('/');
        } catch (err: any) {
            const status = err.response?.status;
            const message = err.response?.data?.message || '';
            if (status === 401 || message.toLowerCase().includes('senha') || message.toLowerCase().includes('credenciais')) {
                setIsPasswordError(true);
                setError('Senha incorreta. Verifique e tente novamente.');
            } else {
                setError(message || 'Falha ao entrar. Tente novamente.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const onRequestOtp = async (data: any) => {
        setIsLoading(true);
        setError('');

        try {
            await api.post('/auth/otp', { email: data.email });
            setOtpSent(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Falha ao enviar código OTP.');
        } finally {
            setIsLoading(false);
        }
    };

    const onVerifyOtp = async (data: any) => {
        setIsLoading(true);
        setError('');

        try {
            const { data: res } = await api.post('/auth/otp/verify', {
                email: data.email,
                otp: data.otp,
            });

            setToken(res.token);
            dispatch(setUser(res.user));
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Código OTP inválido.');
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

                    {/* Tabs */}
                    <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                        <button
                            type="button"
                            onClick={() => { setMode('password'); setError(''); setOtpSent(false); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                mode === 'password'
                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400'
                            }`}
                        >
                            <Mail className="w-4 h-4" />
                            E-mail e Senha
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('otp'); setError(''); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                mode === 'otp'
                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400'
                            }`}
                        >
                            <Phone className="w-4 h-4" />
                            WhatsApp (OTP)
                        </button>
                    </div>

                    {/* Registration Success Message */}
                    {showRegistrationSuccess && (
                        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300 p-4 rounded-xl mb-6">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium">Cadastro realizado com sucesso!</p>
                                    <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                                        Agora voce pode fazer login com suas credenciais.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl mb-4">
                            <p>{error}</p>
                            {isPasswordError && (
                                <div className="mt-2 flex flex-col gap-1">
                                    <button
                                        type="button"
                                        onClick={() => { setMode('otp'); setError(''); setIsPasswordError(false); }}
                                        className="text-brand dark:text-blue-400 hover:underline text-left text-xs font-medium"
                                    >
                                        Entrar via WhatsApp (OTP)
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Password Login */}
                    {mode === 'password' && (
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
                                <input
                                    type="email"
                                    {...passwordForm.register('email', { required: 'E-mail e obrigatorio' })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all text-gray-900 dark:text-gray-100"
                                    placeholder="voce@exemplo.com"
                                />
                                {passwordForm.formState.errors.email && <span className="text-xs text-red-500 mt-1">{passwordForm.formState.errors.email.message as string}</span>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha</label>
                                <input
                                    type="password"
                                    {...passwordForm.register('password', { required: 'Senha e obrigatoria' })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all text-gray-900 dark:text-gray-100"
                                    placeholder="••••••••"
                                />
                                {passwordForm.formState.errors.password && <span className="text-xs text-red-500 mt-1">{passwordForm.formState.errors.password.message as string}</span>}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-brand-dark to-brand text-white py-3 rounded-xl hover:from-brand hover:to-brand-light transition-all flex items-center justify-center disabled:opacity-70 font-medium shadow-lg shadow-brand/25"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
                            </button>
                        </form>
                    )}

                    {/* OTP Login */}
                    {mode === 'otp' && !otpSent && (
                        <form onSubmit={otpForm.handleSubmit(onRequestOtp)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
                                <input
                                    type="email"
                                    {...otpForm.register('email', { required: 'E-mail e obrigatorio' })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all text-gray-900 dark:text-gray-100"
                                    placeholder="voce@exemplo.com"
                                />
                                {otpForm.formState.errors.email && <span className="text-xs text-red-500 mt-1">{otpForm.formState.errors.email.message as string}</span>}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl hover:from-green-500 hover:to-green-400 transition-all flex items-center justify-center disabled:opacity-70 font-medium shadow-lg shadow-green-500/25"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar código via WhatsApp'}
                            </button>
                        </form>
                    )}

                    {/* OTP Verify */}
                    {mode === 'otp' && otpSent && (
                        <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-4">
                            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300 p-3 rounded-xl mb-2">
                                <p className="text-sm">Código enviado para seu WhatsApp. Verifique suas mensagens.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
                                <input
                                    type="email"
                                    {...otpForm.register('email')}
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100"
                                    readOnly
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código OTP</label>
                                <input
                                    type="text"
                                    {...otpForm.register('otp', { required: 'Código e obrigatorio' })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all text-gray-900 dark:text-gray-100 text-center text-lg tracking-widest"
                                    placeholder="000000"
                                    autoFocus
                                />
                                {otpForm.formState.errors.otp && <span className="text-xs text-red-500 mt-1">{otpForm.formState.errors.otp.message as string}</span>}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-brand-dark to-brand text-white py-3 rounded-xl hover:from-brand hover:to-brand-light transition-all flex items-center justify-center disabled:opacity-70 font-medium shadow-lg shadow-brand/25"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verificar e Entrar'}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setOtpSent(false); setError(''); }}
                                className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                            >
                                Reenviar código
                            </button>
                        </form>
                    )}

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
