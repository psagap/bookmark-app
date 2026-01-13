import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

// Extension ID for Chrome extension communication
// The extension will listen for messages from the web page
const EXTENSION_SESSION_KEY = 'bookmark_extension_session';

/**
 * Sync session to browser extension via localStorage
 * The extension's content script can read this from the page
 */
const syncSessionToExtension = (session) => {
    try {
        if (session) {
            // Store session data that extension needs
            const extensionSession = {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at,
                user: {
                    id: session.user.id,
                    email: session.user.email,
                }
            };
            localStorage.setItem(EXTENSION_SESSION_KEY, JSON.stringify(extensionSession));

            // Also dispatch a custom event for the content script
            window.dispatchEvent(new CustomEvent('supabase-session-update', {
                detail: { session: extensionSession }
            }));
        } else {
            localStorage.removeItem(EXTENSION_SESSION_KEY);
            window.dispatchEvent(new CustomEvent('supabase-session-update', {
                detail: { session: null }
            }));
        }
    } catch (error) {
        console.warn('Could not sync session to extension:', error);
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active sessions and sets the user
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            syncSessionToExtension(session);
            setLoading(false);
        };

        checkSession();

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            syncSessionToExtension(session);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const value = {
        signUp: (data) => supabase.auth.signUp({
            ...data,
            options: {
                emailRedirectTo: window.location.origin,
                ...(data?.options || {}),
            },
        }),
        signIn: (data) => supabase.auth.signInWithPassword(data),
        signOut: () => supabase.auth.signOut(),
        signInWithGoogle: () => supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        }),
        signInWithApple: () => supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: {
                redirectTo: window.location.origin
            }
        }),
        resetPassword: (email) => supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`
        }),
        user,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
