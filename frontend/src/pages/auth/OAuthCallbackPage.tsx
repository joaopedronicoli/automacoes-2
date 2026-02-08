import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { setUser } from '../../store/authSlice';
import { setToken } from '../../lib/auth';
import api from '../../services/api';
import { Loader2 } from 'lucide-react';

const OAuthCallbackPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [searchParams] = useSearchParams();
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    const [timedOut, setTimedOut] = useState(false);

    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const token = searchParams.get('token');

    useEffect(() => {
        // Google Auth OAuth callback (login/register)
        if (token) {
            setToken(token);
            api.get('/auth/me').then(({ data }) => {
                dispatch(setUser(data));
                navigate('/', { replace: true });
            }).catch(() => {
                navigate('/login', { replace: true });
            });
            return;
        }

        // Google Sheets OAuth callback
        if (platform === 'google-sheets') {
            if (status === 'success') {
                navigate('/broadcast', { replace: true });
            } else {
                navigate('/broadcast?error=google-sheets-failed', { replace: true });
            }
            return;
        }

        // Default behavior for other platforms (e.g. Facebook login)
        if (isAuthenticated) {
            navigate('/accounts', { replace: true });
        }
    }, [isAuthenticated, navigate, dispatch, platform, status, token]);

    useEffect(() => {
        const timer = setTimeout(() => setTimedOut(true), 10000);
        return () => clearTimeout(timer);
    }, []);

    if (timedOut && !isAuthenticated) {
        return (
            <div className="h-screen flex items-center justify-center flex-col gap-4">
                <p className="text-gray-500">Tempo esgotado. Tente novamente.</p>
                <button
                    onClick={() => navigate('/login', { replace: true })}
                    className="text-primary hover:underline font-medium"
                >
                    Voltar ao login
                </button>
            </div>
        );
    }

    return (
        <div className="h-screen flex items-center justify-center flex-col gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-gray-500">Concluindo conexao...</span>
        </div>
    );
};

export default OAuthCallbackPage;
