export enum AppModule {
    INBOX = 'inbox',
    CONTACTS = 'contacts',
    POSTS = 'posts',
    COMMENTS = 'comments',
    AUTOMATIONS = 'automations',
    BROADCAST = 'broadcast',
    JOLU_AI = 'jolu_ai',
}

export const BASE_MODULES = ['dashboard', 'accounts', 'profile', 'logs'];

export const ALL_SELLABLE_MODULES: AppModule[] = [
    AppModule.INBOX,
    AppModule.CONTACTS,
    AppModule.POSTS,
    AppModule.COMMENTS,
    AppModule.AUTOMATIONS,
    AppModule.BROADCAST,
    AppModule.JOLU_AI,
];
