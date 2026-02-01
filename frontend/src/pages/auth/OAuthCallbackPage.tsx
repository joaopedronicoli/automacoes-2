import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { Loader2 } from 'lucide-react';

const OAuthCallbackPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/accounts', { replace: true });
        }
    }, [isAuthenticated, navigate]);

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
