import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';

const UsagePolicyPage = () => {
    const { t, i18n } = useTranslation();
    const isPt = i18n.language?.startsWith('pt');

    return (
        <div className="max-w-3xl mx-auto py-4">
            <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="w-7 h-7 text-indigo-500" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t('usagePolicy.title')}
                    </h1>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                        {t('usagePolicy.lastUpdated')}: 07/02/2026
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 md:p-8 space-y-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {isPt ? (
                    <>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">1. Termos Gerais</h2>
                            <p>Ao acessar e utilizar a plataforma Jolu.ai, o usuário concorda com os termos e condições descritos nesta Política de Uso. A Jolu.ai reserva-se o direito de modificar estes termos a qualquer momento, notificando os usuários sobre alterações significativas.</p>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">2. Uso Aceitável</h2>
                            <p>A plataforma deve ser utilizada exclusivamente para fins lícitos. O usuário compromete-se a:</p>
                            <ul className="list-disc ml-5 mt-2 space-y-1">
                                <li>Não utilizar a plataforma para envio de spam ou mensagens não solicitadas</li>
                                <li>Respeitar as políticas das plataformas integradas (Meta, WhatsApp, YouTube, TikTok)</li>
                                <li>Não tentar acessar contas ou dados de outros usuários</li>
                                <li>Não utilizar automações para práticas abusivas ou que violem leis vigentes</li>
                                <li>Manter suas credenciais de acesso em sigilo</li>
                            </ul>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">3. Contas e Acesso</h2>
                            <p>Cada conta é pessoal e intransferível. O usuário é responsável por todas as atividades realizadas com suas credenciais. Em caso de acesso não autorizado, o usuário deve notificar imediatamente a equipe Jolu.ai.</p>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">4. Automações e Integrações</h2>
                            <p>As automações criadas na plataforma devem estar em conformidade com as políticas de cada rede social conectada. A Jolu.ai não se responsabiliza por suspensões ou penalidades aplicadas pelas plataformas terceiras devido ao uso inadequado das automações pelo usuário.</p>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">5. Limitações de Responsabilidade</h2>
                            <p>A Jolu.ai fornece a plataforma "como está", sem garantias de disponibilidade ininterrupta. Não nos responsabilizamos por:</p>
                            <ul className="list-disc ml-5 mt-2 space-y-1">
                                <li>Perdas decorrentes de interrupções temporárias do serviço</li>
                                <li>Alterações nas APIs de plataformas terceiras que afetem funcionalidades</li>
                                <li>Danos resultantes do uso inadequado da plataforma pelo usuário</li>
                            </ul>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">6. Planos e Pagamentos</h2>
                            <p>Os planos de assinatura são cobrados mensalmente. O cancelamento pode ser realizado a qualquer momento e terá efeito ao final do período já pago. Reembolsos seguem a política vigente no momento da contratação.</p>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">7. Suspensão e Encerramento</h2>
                            <p>A Jolu.ai reserva-se o direito de suspender ou encerrar contas que violem esta política, sem aviso prévio em casos graves. O usuário será notificado e terá a oportunidade de contestar em casos menos severos.</p>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">8. Contato</h2>
                            <p>Para dúvidas sobre esta política, entre em contato pelo e-mail: <strong>suporte@jolu.ai</strong></p>
                        </section>
                    </>
                ) : (
                    <>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">1. General Terms</h2>
                            <p>By accessing and using the Jolu.ai platform, the user agrees to the terms and conditions described in this Usage Policy. Jolu.ai reserves the right to modify these terms at any time, notifying users of significant changes.</p>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">2. Acceptable Use</h2>
                            <p>The platform must be used exclusively for lawful purposes. The user agrees to:</p>
                            <ul className="list-disc ml-5 mt-2 space-y-1">
                                <li>Not use the platform for sending spam or unsolicited messages</li>
                                <li>Respect the policies of integrated platforms (Meta, WhatsApp, YouTube, TikTok)</li>
                                <li>Not attempt to access other users' accounts or data</li>
                                <li>Not use automations for abusive practices or those that violate applicable laws</li>
                                <li>Keep access credentials confidential</li>
                            </ul>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">3. Accounts and Access</h2>
                            <p>Each account is personal and non-transferable. The user is responsible for all activities carried out with their credentials. In case of unauthorized access, the user must immediately notify the Jolu.ai team.</p>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">4. Automations and Integrations</h2>
                            <p>Automations created on the platform must comply with the policies of each connected social network. Jolu.ai is not responsible for suspensions or penalties applied by third-party platforms due to improper use of automations by the user.</p>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">5. Limitation of Liability</h2>
                            <p>Jolu.ai provides the platform "as is", without guarantees of uninterrupted availability. We are not responsible for:</p>
                            <ul className="list-disc ml-5 mt-2 space-y-1">
                                <li>Losses resulting from temporary service interruptions</li>
                                <li>Changes in third-party platform APIs that affect functionality</li>
                                <li>Damages resulting from improper use of the platform by the user</li>
                            </ul>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">6. Plans and Payments</h2>
                            <p>Subscription plans are billed monthly. Cancellation can be made at any time and will take effect at the end of the already paid period. Refunds follow the policy in effect at the time of subscription.</p>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">7. Suspension and Termination</h2>
                            <p>Jolu.ai reserves the right to suspend or terminate accounts that violate this policy, without prior notice in severe cases. The user will be notified and have the opportunity to contest in less severe cases.</p>
                        </section>
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">8. Contact</h2>
                            <p>For questions about this policy, contact us at: <strong>support@jolu.ai</strong></p>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default UsagePolicyPage;
