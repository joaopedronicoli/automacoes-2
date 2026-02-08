import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../../store/authSlice';
import { setToken } from '../../lib/auth';
import api from '../../services/api';
import { Loader2, Mail, CheckCircle, Phone, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type LoginMode = 'password' | 'otp';

const LoginPage = () => {
    const { t } = useTranslation();
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
                setError(t('login.incorrectPassword'));
            } else {
                setError(message || t('login.loginFailed'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const onRequestOtp = async (data: any) => {
        setIsLoading(true);
        setError('');

        try {
            const { data: res } = await api.post('/auth/otp', { email: data.email });
            if (res.whatsappSent === false) {
                setError(res.message || t('login.otpNotSent'));
            } else {
                setOtpSent(true);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || t('login.otpFailed'));
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
            setError(err.response?.data?.message || t('login.otpInvalid'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 relative overflow-hidden">
                {/* Background video */}
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                >
                    <source src="/hero-video.mp4" type="video/mp4" />
                </video>
                {/* Dark overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-900/60 via-indigo-900/50 to-blue-900/60" />
                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    <div className="flex items-center gap-3">
                        <img src="/logo-icon.png" alt="Jolu.ai" className="w-10 h-10 rounded-xl object-cover" />
                        <span className="text-2xl font-bold text-white">Jolu.ai</span>
                    </div>
                    <div className="space-y-6">
                        <h1 className="text-4xl font-bold text-white leading-tight">
                            {t('login.heroTitle').split('\n').map((line, i) => (<span key={i}>{line}{i < 2 && <br />}</span>))}
                        </h1>
                        <p className="text-white/70 text-lg max-w-md">
                            {t('login.heroSubtitle')}
                        </p>
                        <div className="flex gap-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-white">10x</div>
                                <div className="text-white/60 text-sm">{t('login.stat10x')}</div>
                            </div>
                            <div className="w-px bg-white/20" />
                            <div className="text-center">
                                <div className="text-3xl font-bold text-white">24/7</div>
                                <div className="text-white/60 text-sm">{t('login.stat247')}</div>
                            </div>
                            <div className="w-px bg-white/20" />
                            <div className="text-center">
                                <div className="text-3xl font-bold text-white">100%</div>
                                <div className="text-white/60 text-sm">{t('login.stat100')}</div>
                            </div>
                        </div>
                    </div>
                    <p className="text-white/40 text-sm">{t('login.footer')}</p>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 flex items-center justify-center px-4 py-8" style={{ background: 'var(--gradient-subtle)' }}>
                <div className="max-w-md w-full">
                    {/* Mobile Logo */}
                    <div className="text-center mb-8 lg:hidden">
                        <img src="/logo-icon.png" alt="Jolu.ai" className="w-14 h-14 rounded-2xl object-cover mx-auto mb-3" />
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Jolu.ai</h1>
                    </div>

                    {/* Card */}
                    <div className="glass-card-static rounded-2xl p-8 animate-fade-in-up">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('login.welcomeBack')}</h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('login.enterAccount')}</p>
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
                                {t('login.emailAndPassword')}
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
                                {t('login.whatsappOtp')}
                            </button>
                        </div>

                        {/* Registration Success */}
                        {showRegistrationSuccess && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl mb-6">
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium">{t('login.registrationSuccess')}</p>
                                        <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                                            {t('login.registrationSuccessMsg')}
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
                                            to={`/forgot-password${passwordForm.getValues('email') ? `?email=${encodeURIComponent(passwordForm.getValues('email'))}` : ''}`}
                                            className="text-indigo-600 dark:text-indigo-400 hover:underline text-left text-xs font-medium"
                                        >
                                            {t('login.resetPassword')}
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => { setMode('otp'); setError(''); setIsPasswordError(false); }}
                                            className="text-indigo-600 dark:text-indigo-400 hover:underline text-left text-xs font-medium"
                                        >
                                            {t('login.loginViaWhatsapp')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Password Login */}
                        {mode === 'password' && (
                            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('common.email')}</label>
                                    <input
                                        type="email"
                                        {...passwordForm.register('email', { required: t('login.emailRequired') })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.08)] transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                                        placeholder="voce@exemplo.com"
                                    />
                                    {passwordForm.formState.errors.email && <span className="text-xs text-red-500 mt-1">{passwordForm.formState.errors.email.message as string}</span>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('common.password')}</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            {...passwordForm.register('password', { required: t('login.passwordRequired') })}
                                            className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.08)] transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
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
                                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all flex items-center justify-center disabled:opacity-70 font-medium shadow-lg shadow-indigo-500/25 btn-glow"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('login.login')}
                                </button>

                                <div className="text-right">
                                    <Link
                                        to={`/forgot-password${passwordForm.getValues('email') ? `?email=${encodeURIComponent(passwordForm.getValues('email'))}` : ''}`}
                                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                    >
                                        {t('login.forgotPassword')}
                                    </Link>
                                </div>
                            </form>
                        )}

                        {/* OTP Login */}
                        {mode === 'otp' && !otpSent && (
                            <form onSubmit={otpForm.handleSubmit(onRequestOtp)} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('common.email')}</label>
                                    <input
                                        type="email"
                                        {...otpForm.register('email', { required: t('login.emailRequired') })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.08)] transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                                        placeholder="voce@exemplo.com"
                                    />
                                    {otpForm.formState.errors.email && <span className="text-xs text-red-500 mt-1">{otpForm.formState.errors.email.message as string}</span>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3 rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all flex items-center justify-center disabled:opacity-70 font-medium shadow-lg shadow-green-500/25"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('login.sendOtpCode')}
                                </button>
                            </form>
                        )}

                        {/* OTP Verify */}
                        {mode === 'otp' && otpSent && (
                            <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-4">
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-3 rounded-xl mb-2">
                                    <p className="text-sm">{t('login.otpSentMessage')}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('common.email')}</label>
                                    <input
                                        type="email"
                                        {...otpForm.register('email')}
                                        className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100"
                                        readOnly
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('login.otpCode')}</label>
                                    <input
                                        type="text"
                                        {...otpForm.register('otp', { required: t('login.codeRequired') })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.08)] transition-all text-gray-900 dark:text-gray-100 text-center text-lg tracking-widest placeholder:text-gray-400"
                                        placeholder="000000"
                                        autoFocus
                                    />
                                    {otpForm.formState.errors.otp && <span className="text-xs text-red-500 mt-1">{otpForm.formState.errors.otp.message as string}</span>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all flex items-center justify-center disabled:opacity-70 font-medium shadow-lg shadow-indigo-500/25 btn-glow"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('login.verifyAndLogin')}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setOtpSent(false); setError(''); }}
                                    className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                >
                                    {t('login.resendCode')}
                                </button>
                            </form>
                        )}

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-gray-600" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500">
                                    {t('auth.orContinueWith')}
                                </span>
                            </div>
                        </div>

                        {/* Google Login */}
                        <button
                            type="button"
                            onClick={() => { window.location.href = '/api/auth/google'; }}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all font-medium text-gray-700 dark:text-gray-200 shadow-sm"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            {t('auth.loginWithGoogle')}
                        </button>

                        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                            {t('login.noAccount')}{' '}
                            <Link to="/register" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium transition-colors">
                                {t('login.register')}
                            </Link>
                        </div>
                    </div>

                    <p className="text-center text-gray-400 dark:text-gray-500 text-xs mt-6">
                        {t('login.termsAgreement')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
