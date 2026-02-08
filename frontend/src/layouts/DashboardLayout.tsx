import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Zap,
    MessageSquareText,
    LogOut,
    Menu,
    X,
    Sun,
    Moon,
    MessageCircle,
    UserCircle,
    MessagesSquare,
    Shield,
    MessageSquareMore,
    Bot,
    Lock,
    ChevronUp,
    ScrollText,
    Globe,
    User,
    ShieldCheck,
    CreditCard,
    BarChart3,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { clearToken } from '../lib/auth';
import { RootState } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useModuleAccess } from '../hooks/useModuleAccess';

const SidebarItem = ({ icon: Icon, label, path, active, onClick, locked }: any) => {
    const { t } = useTranslation();
    if (locked) {
        return (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60">
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{label}</span>
                <span className="ml-auto flex items-center gap-1 text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded-full">
                    <Lock className="w-2.5 h-2.5" />
                    {t('common.comingSoon')}
                </span>
            </div>
        );
    }
    return (
        <Link
            to={path}
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${active
                    ? 'bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium shadow-sm border-l-[3px] border-indigo-500'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-500/5 hover:text-gray-900 dark:hover:text-gray-200 hover:translate-x-0.5'
                }`}
        >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">{label}</span>
        </Link>
    );
};

const DashboardLayout = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.auth.user);
    const { theme, setTheme } = useTheme();
    const { t, i18n } = useTranslation();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) {
                setSidebarOpen(true);
            } else {
                setSidebarOpen(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (isMobile) {
            setSidebarOpen(false);
        }
    }, [location.pathname, isMobile]);

    // Close user menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };

        if (showUserMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showUserMenu]);

    const handleLogout = () => {
        clearToken();
        dispatch(logout());
        window.location.href = '/login';
    };

    const closeSidebar = () => {
        if (isMobile) {
            setSidebarOpen(false);
        }
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'pt' ? 'en' : 'pt';
        i18n.changeLanguage(newLang);
    };

    const cycleTheme = () => {
        if (theme === 'light') setTheme('dark');
        else setTheme('light');
    };

    const getThemeIcon = () => {
        if (theme === 'light') return <Moon className="w-4 h-4" />;
        return <Sun className="w-4 h-4" />;
    };

    const getThemeLabel = () => {
        if (theme === 'light') return t('userMenu.darkMode');
        return t('userMenu.lightMode');
    };

    const { hasModule, isAdmin } = useModuleAccess();

    const navItems = [
        { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/', moduleKey: 'dashboard' },
        { icon: Users, label: t('nav.accounts'), path: '/accounts', moduleKey: 'accounts' },
        { icon: MessageCircle, label: t('nav.inbox'), path: '/inbox', moduleKey: 'inbox' },
        { icon: UserCircle, label: t('nav.contacts'), path: '/contacts', moduleKey: 'contacts' },
        { icon: MessageSquareText, label: t('nav.posts'), path: '/posts', moduleKey: 'posts' },
        { icon: MessagesSquare, label: t('nav.comments'), path: '/comments', moduleKey: 'comments' },
        { icon: Zap, label: t('nav.automations'), path: '/automations', moduleKey: 'automations' },
        { icon: MessageSquareMore, label: t('nav.broadcast'), path: '/broadcast', moduleKey: 'broadcast' },
        { icon: Bot, label: t('nav.joluAi'), path: '/jolu-ai', moduleKey: 'jolu_ai' },
    ].map((item) => ({
        ...item,
        locked: !hasModule(item.moduleKey),
    }));

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--gradient-subtle)' }}>
            {/* Mobile Overlay */}
            {isMobile && isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    ${isMobile
                        ? `fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
                        : 'relative'
                    }
                    w-64 sidebar-glass flex flex-col h-full
                `}
            >
                {/* Logo */}
                <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
                    <Link
                        to="/"
                        className="flex items-center hover:opacity-80 transition-opacity"
                    >
                        <img src="/logo-full.png" alt="Jolu.ai" className="h-[5.5rem] object-contain dark:hidden" />
                        <img src="/logo-full-dark.png" alt="Jolu.ai" className="h-[5.5rem] object-contain hidden dark:block" />
                    </Link>
                    {isMobile && (
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <SidebarItem
                            key={item.path}
                            {...item}
                            active={location.pathname === item.path}
                            onClick={closeSidebar}
                        />
                    ))}

                    {/* Admin Section */}
                    {isAdmin && (
                        <>
                            <div className="my-3 border-t border-gray-100 dark:border-gray-700" />
                            <div className="px-3 mb-1">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('nav.admin')}</span>
                            </div>
                            <SidebarItem
                                icon={Shield}
                                label={t('nav.users')}
                                path="/admin/users"
                                active={location.pathname === '/admin/users'}
                                onClick={closeSidebar}
                            />
                            <SidebarItem
                                icon={CreditCard}
                                label={t('nav.plans')}
                                path="/admin/plans"
                                active={location.pathname === '/admin/plans'}
                                onClick={closeSidebar}
                            />
                            <SidebarItem
                                icon={BarChart3}
                                label={t('nav.subscriptions')}
                                path="/admin/subscriptions"
                                active={location.pathname === '/admin/subscriptions'}
                                onClick={closeSidebar}
                            />
                        </>
                    )}
                </nav>

                {/* User Section with Menu */}
                <div className="p-3 border-t border-gray-100 dark:border-gray-700 relative" ref={menuRef}>
                    {/* Dropdown Menu */}
                    {showUserMenu && (
                        <div className="absolute bottom-full left-3 right-3 mb-2 glass-card-static rounded-xl overflow-hidden z-50">
                            {/* Profile */}
                            <button
                                onClick={() => { navigate('/profile'); setShowUserMenu(false); closeSidebar(); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-500/5 transition-colors"
                            >
                                <User className="w-4 h-4" />
                                {t('userMenu.profile')}
                            </button>

                            {/* Logs */}
                            <button
                                onClick={() => { navigate('/logs'); setShowUserMenu(false); closeSidebar(); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-500/5 transition-colors"
                            >
                                <ScrollText className="w-4 h-4" />
                                {t('userMenu.logs')}
                            </button>

                            {/* My Subscription */}
                            <button
                                onClick={() => { navigate('/subscription'); setShowUserMenu(false); closeSidebar(); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-500/5 transition-colors"
                            >
                                <CreditCard className="w-4 h-4" />
                                {t('userMenu.mySubscription')}
                            </button>

                            <div className="border-t border-gray-100 dark:border-gray-700" />

                            {/* Theme Cycle */}
                            <button
                                onClick={cycleTheme}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-500/5 transition-colors"
                            >
                                {getThemeIcon()}
                                {getThemeLabel()}
                            </button>

                            {/* Language Toggle */}
                            <button
                                onClick={toggleLanguage}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-500/5 transition-colors"
                            >
                                <Globe className="w-4 h-4" />
                                {t('userMenu.language')}: {i18n.language === 'pt' ? t('userMenu.portuguese') : t('userMenu.english')}
                            </button>

                            <div className="border-t border-gray-100 dark:border-gray-700" />

                            {/* Usage Policy */}
                            <button
                                onClick={() => { navigate('/usage-policy'); setShowUserMenu(false); closeSidebar(); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-500/5 transition-colors"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                {t('userMenu.usagePolicy')}
                            </button>

                            {/* Privacy Policy */}
                            <button
                                onClick={() => { navigate('/privacy-policy'); setShowUserMenu(false); closeSidebar(); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-500/5 transition-colors"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                {t('userMenu.privacyPolicy')}
                            </button>

                            <div className="border-t border-gray-100 dark:border-gray-700" />

                            {/* Logout */}
                            <button
                                onClick={() => { handleLogout(); setShowUserMenu(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                {t('userMenu.logout')}
                            </button>
                        </div>
                    )}

                    {/* User Card (clickable) */}
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-violet-500/5 to-indigo-500/5 hover:from-violet-500/10 hover:to-indigo-500/10 transition-all"
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-sm font-medium text-white flex-shrink-0">
                                {user?.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="text-sm min-w-0 text-left">
                                <p className="font-medium truncate text-gray-900 dark:text-gray-100">
                                    {user?.name || t('common.user')}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                            </div>
                        </div>
                        <ChevronUp className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${showUserMenu ? '' : 'rotate-180'}`} />
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="glass-card-static !rounded-none !border-x-0 !border-t-0 h-14 flex items-center justify-between px-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        {isMobile && (
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/')}
                            className="font-semibold text-gray-800 dark:text-gray-200 text-sm md:text-base hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                            Jolu.ai
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
