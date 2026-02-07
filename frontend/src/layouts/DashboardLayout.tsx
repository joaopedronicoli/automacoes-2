import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Zap,
    MessageSquareText,
    FileText,
    LogOut,
    Menu,
    X,
    Phone,
    Sun,
    Moon,
    MessageCircle,
    UserCircle,
    MessagesSquare,
    Sparkles,
    Shield,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { clearToken } from '../lib/auth';
import { RootState } from '../store/store';
import { useTheme } from '../contexts/ThemeContext';

const SidebarItem = ({ icon: Icon, label, path, active, onClick }: any) => (
    <Link
        to={path}
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active
                ? 'bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
    >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="truncate">{label}</span>
    </Link>
);

const DashboardLayout = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.auth.user);
    const { theme, toggleTheme } = useTheme();

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

    const navItems = [
        { icon: LayoutDashboard, label: 'Painel', path: '/' },
        { icon: Users, label: 'Contas', path: '/accounts' },
        { icon: MessageCircle, label: 'Inbox', path: '/inbox' },
        { icon: UserCircle, label: 'Contatos', path: '/contacts' },
        { icon: MessageSquareText, label: 'Publicações', path: '/posts' },
        { icon: MessagesSquare, label: 'Comentários', path: '/comments' },
        { icon: Zap, label: 'Automações', path: '/automations' },
        { icon: Phone, label: 'Broadcast', path: '/broadcast' },
        { icon: FileText, label: 'Logs', path: '/logs' },
    ];

    const isAdmin = (user as any)?.role === 'admin';

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
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
                    w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full
                `}
            >
                {/* Logo */}
                <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 h-16">
                    <Link
                        to="/"
                        className="font-bold text-xl text-gray-900 dark:text-gray-100 flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                    >
                        <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="truncate bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">Jolu.ai</span>
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
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Administração</span>
                            </div>
                            <SidebarItem
                                icon={Shield}
                                label="Usuários"
                                path="/admin/users"
                                active={location.pathname === '/admin/users'}
                                onClick={closeSidebar}
                            />
                        </>
                    )}
                </nav>

                {/* User Section */}
                <div className="p-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-sm font-medium text-white flex-shrink-0">
                                {user?.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="text-sm min-w-0">
                                <p className="font-medium truncate text-gray-900 dark:text-gray-100">
                                    {user?.name || 'Usuário'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
                            title="Sair"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 h-14 flex items-center justify-between px-4 flex-shrink-0">
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

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-gray-500 dark:text-gray-400 transition-colors"
                        title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-5 h-5" />
                        ) : (
                            <Moon className="w-5 h-5" />
                        )}
                    </button>
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
