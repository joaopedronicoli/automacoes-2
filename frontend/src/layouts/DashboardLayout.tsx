import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Zap,
    MessageSquareText,
    FileText,
    LogOut,
    Menu,
    X,
    Phone
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { supabase } from '../lib/supabase';
import { RootState } from '../store/store';

const SidebarItem = ({ icon: Icon, label, path, active }: any) => (
    <Link
        to={path}
        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${active
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
    >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
    </Link>
);

const DashboardLayout = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();
    const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.auth.user);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        dispatch(logout());
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Painel', path: '/' },
        { icon: Users, label: 'Contas', path: '/accounts' },
        { icon: MessageSquareText, label: 'Publicacoes', path: '/posts' },
        { icon: Zap, label: 'Automacoes', path: '/automations' },
        { icon: Phone, label: 'Broadcast', path: '/broadcast' },
        { icon: FileText, label: 'Logs', path: '/logs' },
    ];

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <aside
                className={`${isSidebarOpen ? 'w-64' : 'w-20'
                    } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col fixed md:relative z-10 h-full`}
            >
                <div className="p-4 flex items-center justify-between border-b h-16">
                    <div className={`font-bold text-xl text-primary flex items-center gap-2 ${!isSidebarOpen && 'justify-center'}`}>
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                            A
                        </div>
                        {isSidebarOpen && <span>Automacoes</span>}
                    </div>
                    <button
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        className="p-1 hover:bg-gray-100 rounded-md md:hidden"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        isSidebarOpen ? (
                            <SidebarItem
                                key={item.path}
                                {...item}
                                active={location.pathname === item.path}
                            />
                        ) : (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex justify-center p-2 rounded-md ${location.pathname === item.path ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100'
                                    }`}
                                title={item.label}
                            >
                                <item.icon className="w-6 h-6" />
                            </Link>
                        )
                    ))}
                </nav>

                <div className="p-4 border-t">
                    {isSidebarOpen ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                                    {user?.firstName?.[0] || 'U'}
                                </div>
                                <div className="text-sm">
                                    <p className="font-medium truncate max-w-[100px]">{user?.firstName || 'Usuario'}</p>
                                    <p className="text-xs text-gray-500 truncate max-w-[100px]">Ativo</p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                                title="Sair"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleLogout}
                            className="w-full flex justify-center text-gray-400 hover:text-red-500"
                        >
                            <LogOut className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="bg-white border-b h-16 flex items-center justify-between px-6 md:hidden">
                    <button onClick={() => setSidebarOpen(true)}>
                        <Menu className="w-6 h-6 text-gray-600" />
                    </button>
                    <span className="font-semibold text-gray-800">Automacoes PELG</span>
                    <div className="w-6" />
                </header>

                <main className="flex-1 overflow-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
