import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

const BASE_MODULES = ['dashboard', 'accounts', 'profile', 'logs'];

export function useModuleAccess() {
    const user = useSelector((state: RootState) => state.auth.user);

    const isAdmin = user?.role === 'admin';

    const hasModule = (key: string): boolean => {
        if (BASE_MODULES.includes(key)) return true;
        if (isAdmin) return true;
        if (!user?.activeModules) return false;
        return user.activeModules.includes(key);
    };

    return { hasModule, isAdmin };
}
