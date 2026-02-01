import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Session } from '@supabase/supabase-js';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

function mapSupabaseUser(session: Session): User {
    const u = session.user;
    const meta = u.user_metadata ?? {};
    return {
        id: u.id,
        email: u.email ?? '',
        firstName: meta.first_name ?? meta.firstName ?? '',
        lastName: meta.last_name ?? meta.lastName ?? '',
    };
}

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setSession: (state, action: PayloadAction<Session | null>) => {
            if (action.payload) {
                state.user = mapSupabaseUser(action.payload);
                state.isAuthenticated = true;
            } else {
                state.user = null;
                state.isAuthenticated = false;
            }
            state.isLoading = false;
        },
        logout: (state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.isLoading = false;
        },
    },
});

export const { setSession, logout } = authSlice.actions;
export default authSlice.reducer;
