import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../../store/authSlice';
import { setToken } from '../../lib/auth';
import api from '../../services/api';
import { Loader2, Mail, CheckCircle, Phone, Eye, EyeOff, Sparkles } from 'lucide-react';

type LoginMode = 'password' | 'otp';

const LoginPage = () => {
    const [mode, setMode] = useState<LoginMode>('password');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isPasswordError, setIsPasswordError] = useState(false);
    const [searchParams] = useSearchParams();
    const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
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
        <div className="min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-400/10 rounded-full blur-3xl" />
                </div>
                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-white">Jolu.ai</span>
                    </div>
                    <div className="space-y-6">
                        <h1 className="text-4xl font-bold text-white leading-tight">
                            Automatize suas<br />redes sociais com<br />inteligência
                        </h1>
                        <p className="text-white/70 text-lg max-w-md">
                            Gerencie comentários, mensagens, broadcast e automações em uma única plataforma.
                        </p>
                        <div className="flex gap-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-white">10x</div>
                                <div className="text-white/60 text-sm">Mais rápido</div>
                            </div>
                            <div className="w-px bg-white/20" />
                            <div className="text-center">
                                <div className="text-3xl font-bold text-white">24/7</div>
                                <div className="text-white/60 text-sm">Automações ativas</div>
                            </div>
                            <div className="w-px bg-white/20" />
                            <div className="text-center">
                                <div className="text-3xl font-bold text-white">100%</div>
                                <div className="text-white/60 text-sm">Automatizado</div>
                            </div>
                        </div>
                    </div>
                    <p className="text-white/40 text-sm">Jolu.ai — Automação inteligente para redes sociais</p>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
                <div className="max-w-md w-full">
                    {/* Mobile Logo */}
                    <div className="text-center mb-8 lg:hidden">
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl mb-3">
                            <Sparkles className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Jolu.ai</h1>
                    </div>

                    {/* Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 p-8">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Bem-vindo de volta</h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Entre na sua conta Jolu.ai</p>
                        </div>

                        {/* Tabs */}
                        <div className="flex mb-6 bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1">
                            <button
                                type="button"
                                onClick={() => { setMode('password'); setError(''); setOtpSent(false); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    mode === 'password'
                                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                <Phone className="w-4 h-4" />
                                WhatsApp (OTP)
                            </button>
                        </div>

                        {/* Registration Success */}
                        {showRegistrationSuccess && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl mb-6">
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium">Cadastro realizado com sucesso!</p>
                                        <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                                            Agora você pode fazer login com suas credenciais.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl mb-4">
                                <p>{error}</p>
                                {isPasswordError && (
                                    <div className="mt-2 flex flex-col gap-1.5">
                                        <Link
                                            to="/forgot-password"
                                            className="text-indigo-600 dark:text-indigo-400 hover:underline text-left text-xs font-medium"
                                        >
                                            Redefinir senha
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => { setMode('otp'); setError(''); setIsPasswordError(false); }}
                                            className="text-indigo-600 dark:text-indigo-400 hover:underline text-left text-xs font-medium"
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">E-mail</label>
                                    <input
                                        type="email"
                                        {...passwordForm.register('email', { required: 'E-mail é obrigatório' })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                                        placeholder="voce@exemplo.com"
                                    />
                                    {passwordForm.formState.errors.email && <span className="text-xs text-red-500 mt-1">{passwordForm.formState.errors.email.message as string}</span>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Senha</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            {...passwordForm.register('password', { required: 'Senha é obrigatória' })}
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
                                    {passwordForm.formState.errors.password && <span className="text-xs text-red-500 mt-1">{passwordForm.formState.errors.password.message as string}</span>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all flex items-center justify-center disabled:opacity-70 font-medium shadow-lg shadow-indigo-500/25"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
                                </button>

                                <div className="text-right">
                                    <Link
                                        to="/forgot-password"
                                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                    >
                                        Esqueci minha senha
                                    </Link>
                                </div>
                            </form>
                        )}

                        {/* OTP Login */}
                        {mode === 'otp' && !otpSent && (
                            <form onSubmit={otpForm.handleSubmit(onRequestOtp)} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">E-mail</label>
                                    <input
                                        type="email"
                                        {...otpForm.register('email', { required: 'E-mail é obrigatório' })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                                        placeholder="voce@exemplo.com"
                                    />
                                    {otpForm.formState.errors.email && <span className="text-xs text-red-500 mt-1">{otpForm.formState.errors.email.message as string}</span>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3 rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all flex items-center justify-center disabled:opacity-70 font-medium shadow-lg shadow-green-500/25"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar código via WhatsApp'}
                                </button>
                            </form>
                        )}

                        {/* OTP Verify */}
                        {mode === 'otp' && otpSent && (
                            <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-4">
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-3 rounded-xl mb-2">
                                    <p className="text-sm">Código enviado para seu WhatsApp. Verifique suas mensagens.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">E-mail</label>
                                    <input
                                        type="email"
                                        {...otpForm.register('email')}
                                        className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100"
                                        readOnly
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Código OTP</label>
                                    <input
                                        type="text"
                                        {...otpForm.register('otp', { required: 'Código é obrigatório' })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-gray-900 dark:text-gray-100 text-center text-lg tracking-widest placeholder:text-gray-400"
                                        placeholder="000000"
                                        autoFocus
                                    />
                                    {otpForm.formState.errors.otp && <span className="text-xs text-red-500 mt-1">{otpForm.formState.errors.otp.message as string}</span>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all flex items-center justify-center disabled:opacity-70 font-medium shadow-lg shadow-indigo-500/25"
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
                            Não tem uma conta?{' '}
                            <Link to="/register" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium transition-colors">
                                Cadastre-se
                            </Link>
                        </div>
                    </div>

                    <p className="text-center text-gray-400 dark:text-gray-500 text-xs mt-6">
                        Ao entrar, você concorda com nossos Termos de Uso
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
