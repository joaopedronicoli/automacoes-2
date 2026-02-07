import { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useModuleAccess } from '../hooks/useModuleAccess';
import { useTranslation } from 'react-i18next';

interface ModuleGateProps {
    moduleKey: string;
    children: ReactNode;
}

export default function ModuleGate({ moduleKey, children }: ModuleGateProps) {
    const { hasModule } = useModuleAccess();
    const { t } = useTranslation();

    if (hasModule(moduleKey)) {
        return <>{children}</>;
    }

    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('modules.blocked')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
                {t('modules.blockedDescription')}
            </p>
        </div>
    );
}
