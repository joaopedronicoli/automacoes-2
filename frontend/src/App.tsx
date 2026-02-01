import { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './store/store';
import { setSession } from './store/authSlice';
import { supabase } from './lib/supabase';
import { Loader2 } from 'lucide-react';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import AccountsPage from './pages/accounts/AccountsPage';
import PostsPage from './pages/posts/PostsPage';
import AutomationsPage from './pages/automations/AutomationsPage';
import AutomationBuilderPage from './pages/automations/AutomationBuilderPage';
import LogsPage from './pages/logs/LogsPage';
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage';

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
        supabase.auth.getSession().then(({ data: { session } }) => {
            dispatch(setSession(session));
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            dispatch(setSession(session));
        });

        return () => subscription.unsubscribe();
    }, [dispatch]);

    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

            {/* Protected Routes */}
            <Route element={<PrivateRoute />}>
                <Route element={<DashboardLayout />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/accounts" element={<AccountsPage />} />
                    <Route path="/posts" element={<PostsPage />} />
                    <Route path="/automations" element={<AutomationsPage />} />
                    <Route path="/automations/new" element={<AutomationBuilderPage />} />
                    <Route path="/logs" element={<LogsPage />} />
                </Route>
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
