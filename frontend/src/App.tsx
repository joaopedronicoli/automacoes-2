import { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './store/store';
import { setUser } from './store/authSlice';
import { getToken, clearToken } from './lib/auth';
import api from './services/api';
import { Loader2 } from 'lucide-react';
import { ThemeProvider } from './contexts/ThemeContext';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardLayout from './layouts/DashboardLayout';
import ModuleGate from './components/ModuleGate';
import DashboardPage from './pages/dashboard/DashboardPage';
import AccountsPage from './pages/accounts/AccountsPage';
import PostsPage from './pages/posts/PostsPage';
import AutomationsPage from './pages/automations/AutomationsPage';
import AutomationBuilderPage from './pages/automations/AutomationBuilderPage';
import LogsPage from './pages/logs/LogsPage';
import BroadcastPage from './pages/broadcast/BroadcastPage';
import InboxPage from './pages/inbox/InboxPage';
import ContactsPage from './pages/contacts/ContactsPage';
import CommentsPage from './pages/comments/CommentsPage';
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage';
import UsersPage from './pages/admin/UsersPage';
import ProfilePage from './pages/profile/ProfilePage';

const PrivateRoute = () => {
    const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
    const dispatch = useDispatch();

    useEffect(() => {
        const token = getToken();
        if (!token) {
            dispatch(setUser(null));
            return;
        }

        api.get('/auth/me')
            .then(({ data }) => {
                dispatch(setUser(data));
            })
            .catch(() => {
                clearToken();
                dispatch(setUser(null));
            });
    }, [dispatch]);

    return (
        <ThemeProvider>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

                {/* Protected Routes */}
                <Route element={<PrivateRoute />}>
                    <Route element={<DashboardLayout />}>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/accounts" element={<AccountsPage />} />
                        <Route path="/inbox" element={<ModuleGate moduleKey="inbox"><InboxPage /></ModuleGate>} />
                        <Route path="/contacts" element={<ModuleGate moduleKey="contacts"><ContactsPage /></ModuleGate>} />
                        <Route path="/posts" element={<ModuleGate moduleKey="posts"><PostsPage /></ModuleGate>} />
                        <Route path="/comments" element={<ModuleGate moduleKey="comments"><CommentsPage /></ModuleGate>} />
                        <Route path="/automations" element={<ModuleGate moduleKey="automations"><AutomationsPage /></ModuleGate>} />
                        <Route path="/automations/new" element={<ModuleGate moduleKey="automations"><AutomationBuilderPage /></ModuleGate>} />
                        <Route path="/broadcast" element={<ModuleGate moduleKey="broadcast"><BroadcastPage /></ModuleGate>} />
                        <Route path="/logs" element={<LogsPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/admin/users" element={<UsersPage />} />
                    </Route>
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </ThemeProvider>
    );
}

export default App;
