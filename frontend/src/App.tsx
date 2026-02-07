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
                        <Route path="/posts" element={<PostsPage />} />
                        <Route path="/automations" element={<AutomationsPage />} />
                        <Route path="/automations/new" element={<AutomationBuilderPage />} />
                        <Route path="/broadcast" element={<BroadcastPage />} />
                        <Route path="/inbox" element={<InboxPage />} />
                        <Route path="/contacts" element={<ContactsPage />} />
                        <Route path="/comments" element={<CommentsPage />} />
                        <Route path="/logs" element={<LogsPage />} />
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
