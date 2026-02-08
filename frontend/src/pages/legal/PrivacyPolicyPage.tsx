import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';

const PrivacyPolicyPage = () => {
    const { t, i18n } = useTranslation();
    const isPt = i18n.language?.startsWith('pt');

    return (
        <div className="max-w-3xl mx-auto py-4">
            <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="w-7 h-7 text-indigo-500" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t('privacyPolicy.title')}
                    </h1>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                        {t('privacyPolicy.lastUpdated')}: 07/02/2026
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 md:p-8 space-y-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {isPt ? (
                    <>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">1. Dados Coletados</h2>
                            <p>A Jolu.ai coleta os seguintes tipos de dados:</p>
                            <ul className="list-disc ml-5 mt-2 space-y-1">
                                <li><strong>Dados de cadastro:</strong> nome, e-mail, telefone e senha (armazenada de forma criptografada)</li>
                                <li><strong>Dados de uso:</strong> logs de atividade, automações executadas e interações com a plataforma</li>
                                <li><strong>Dados de integrações:</strong> tokens de acesso e informações das contas de redes sociais conectadas</li>
                                <li><strong>Dados de pagamento:</strong> processados de forma segura por provedores terceiros (ex: Stripe)</li>
                            </ul>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">2. Uso dos Dados</h2>
                            <p>Os dados coletados são utilizados para:</p>
                            <ul className="list-disc ml-5 mt-2 space-y-1">
                                <li>Fornecer e manter os serviços da plataforma</li>
                                <li>Executar automações e integrações configuradas pelo usuário</li>
                                <li>Enviar notificações relevantes sobre o serviço</li>
                                <li>Melhorar a experiência do usuário e desenvolver novas funcionalidades</li>
                                <li>Cumprir obrigações legais</li>
                            </ul>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">3. Compartilhamento de Dados</h2>
                            <p>A Jolu.ai não vende dados pessoais. Os dados podem ser compartilhados apenas com:</p>
                            <ul className="list-disc ml-5 mt-2 space-y-1">
                                <li>Plataformas integradas (Meta, WhatsApp, etc.) conforme necessário para as funcionalidades contratadas</li>
                                <li>Provedores de pagamento para processamento de transações</li>
                                <li>Autoridades competentes quando exigido por lei</li>
                            </ul>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">4. Segurança</h2>
                            <p>Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo:</p>
                            <ul className="list-disc ml-5 mt-2 space-y-1">
                                <li>Criptografia de senhas (bcrypt)</li>
                                <li>Comunicação via HTTPS</li>
                                <li>Tokens de autenticação JWT com expiração</li>
                                <li>Controle de acesso por permissões e roles</li>
                            </ul>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">5. Direitos do Usuário</h2>
                            <p>Em conformidade com a LGPD, o usuário tem direito a:</p>
                            <ul className="list-disc ml-5 mt-2 space-y-1">
                                <li>Acessar seus dados pessoais</li>
                                <li>Solicitar correção de dados incorretos</li>
                                <li>Solicitar a exclusão de seus dados</li>
                                <li>Revogar consentimento para o tratamento de dados</li>
                                <li>Solicitar portabilidade dos dados</li>
                            </ul>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">6. Cookies e Armazenamento Local</h2>
                            <p>Utilizamos localStorage para armazenar preferências do usuário (tema, idioma) e tokens de autenticação. Não utilizamos cookies de rastreamento de terceiros.</p>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">7. Retenção de Dados</h2>
                            <p>Os dados pessoais são mantidos enquanto a conta estiver ativa. Após o encerramento da conta, os dados serão excluídos em até 30 dias, exceto quando a retenção for necessária por obrigação legal.</p>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">8. Contato</h2>
                            <p>Para exercer seus direitos ou esclarecer dúvidas sobre privacidade, entre em contato: <strong>privacidade@jolu.ai</strong></p>
                        </section>
                    </>
                ) : (
                    <>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">1. Data Collected</h2>
                            <p>Jolu.ai collects the following types of data:</p>
                            <ul className="list-disc ml-5 mt-2 space-y-1">
                                <li><strong>Registration data:</strong> name, email, phone, and password (stored encrypted)</li>
                                <li><strong>Usage data:</strong> activity logs, executed automations, and platform interactions</li>
                                <li><strong>Integration data:</strong> access tokens and connected social media account information</li>
                                <li><strong>Payment data:</strong> securely processed by third-party providers (e.g., Stripe)</li>
                            </ul>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">2. Use of Data</h2>
                            <p>The collected data is used to:</p>
                            <ul className="list-disc ml-5 mt-2 space-y-1">
                                <li>Provide and maintain platform services</li>
                                <li>Execute automations and integrations configured by the user</li>
                                <li>Send relevant service notifications</li>
                                <li>Improve user experience and develop new features</li>
                                <li>Comply with legal obligations</li>
                            </ul>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">3. Data Sharing</h2>
                            <p>Jolu.ai does not sell personal data. Data may only be shared with:</p>
                            <ul className="list-disc ml-5 mt-2 space-y-1">
                                <li>Integrated platforms (Meta, WhatsApp, etc.) as necessary for contracted features</li>
                                <li>Payment providers for transaction processing</li>
                                <li>Competent authorities when required by law</li>
                            </ul>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">4. Security</h2>
                            <p>We adopt technical and organizational measures to protect your data, including:</p>
                            <ul className="list-disc ml-5 mt-2 space-y-1">
                                <li>Password encryption (bcrypt)</li>
                                <li>HTTPS communication</li>
                                <li>JWT authentication tokens with expiration</li>
                                <li>Access control through permissions and roles</li>
                            </ul>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">5. User Rights</h2>
                            <p>In compliance with applicable data protection laws, users have the right to:</p>
                            <ul className="list-disc ml-5 mt-2 space-y-1">
                                <li>Access their personal data</li>
                                <li>Request correction of incorrect data</li>
                                <li>Request deletion of their data</li>
                                <li>Revoke consent for data processing</li>
                                <li>Request data portability</li>
                            </ul>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">6. Cookies and Local Storage</h2>
                            <p>We use localStorage to store user preferences (theme, language) and authentication tokens. We do not use third-party tracking cookies.</p>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">7. Data Retention</h2>
                            <p>Personal data is kept as long as the account is active. After account closure, data will be deleted within 30 days, except when retention is necessary for legal obligations.</p>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">8. Contact</h2>
                            <p>To exercise your rights or clarify privacy questions, contact us at: <strong>privacy@jolu.ai</strong></p>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default PrivacyPolicyPage;
