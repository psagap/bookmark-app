import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { X, Mail, Lock, Loader2, ArrowRight, Eye, EyeOff, Check, AlertCircle, ArrowLeft } from 'lucide-react';

// Password strength calculator
const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score: 2, label: 'Medium', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-green-500' };
};

const AuthModal = ({ isOpen, onClose }) => {
    const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    const { signIn, signUp, signInWithGoogle, signInWithApple, resetPassword } = useAuth();

    const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
    const passwordsMatch = password && confirmPassword && password === confirmPassword;
    const passwordsMismatch = confirmPassword && password !== confirmPassword;

    const isLogin = mode === 'login';
    const isSignup = mode === 'signup';
    const isForgot = mode === 'forgot';

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        if (isSignup && password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (isSignup && passwordStrength.score < 2) {
            setError('Please choose a stronger password.');
            return;
        }

        setLoading(true);

        try {
            if (isForgot) {
                const { error } = await resetPassword(email);
                if (error) throw error;
                setMessage('Check your email for a password reset link!');
            } else if (isLogin) {
                const { error } = await signIn({ email, password });
                if (error) throw error;
                onClose();
            } else {
                const { error, data } = await signUp({ email, password });
                if (error) throw error;
                if (data?.user && !data?.session) {
                    setMessage('Check your email for the confirmation link!');
                } else {
                    onClose();
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthLogin = async (provider) => {
        setLoading(true);
        setError(null);
        try {
            if (provider === 'google') {
                await signInWithGoogle();
            } else if (provider === 'apple') {
                await signInWithApple();
            }
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const switchMode = (newMode) => {
        setMode(newMode);
        setError(null);
        setMessage(null);
        setConfirmPassword('');
    };

    const getTitle = () => {
        if (isForgot) return 'Reset Password';
        if (isSignup) return 'Join the Club';
        return 'Welcome Back';
    };

    const getSubtitle = () => {
        if (isForgot) return 'Enter your email to receive a reset link';
        if (isSignup) return 'Create an account to get started';
        return 'Sign in to access your collection';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-vintage-navy-light border border-amber-900/30 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-amber-500/60 hover:text-amber-500 hover:bg-amber-500/10 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="p-8">
                    {/* Back button for forgot password */}
                    {isForgot && (
                        <button
                            onClick={() => switchMode('login')}
                            className="flex items-center gap-1 text-amber-500/60 hover:text-amber-400 text-sm mb-4 transition-colors"
                        >
                            <ArrowLeft size={16} />
                            Back to login
                        </button>
                    )}

                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-serif text-amber-100 mb-2">
                            {getTitle()}
                        </h2>
                        <p className="text-amber-500/60 text-sm">
                            {getSubtitle()}
                        </p>
                    </div>

                    {/* OAuth Buttons - hide for forgot password */}
                    {!isForgot && (
                        <>
                            <div className="space-y-3 mb-6">
                                <button
                                    onClick={() => handleOAuthLogin('google')}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-gray-50 text-gray-800 font-medium rounded-xl transition-all disabled:opacity-50"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Continue with Google
                                </button>
                                <button
                                    onClick={() => handleOAuthLogin('apple')}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-black hover:bg-gray-900 text-white font-medium rounded-xl transition-all disabled:opacity-50"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                                    </svg>
                                    Continue with Apple
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="flex-1 h-px bg-amber-900/30" />
                                <span className="text-amber-500/40 text-xs uppercase tracking-wider">or</span>
                                <div className="flex-1 h-px bg-amber-900/30" />
                            </div>
                        </>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}
                        {message && (
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-200 text-sm">
                                {message}
                            </div>
                        )}

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-amber-500/80 uppercase tracking-wider ml-1">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/40 group-focus-within:text-amber-500 transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    className="w-full bg-vintage-navy-dark border border-amber-900/40 rounded-xl py-3 pl-10 pr-4 text-amber-100 placeholder:text-amber-500/20 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                                    placeholder="nomad@example.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password - hide for forgot password */}
                        {!isForgot && (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-amber-500/80 uppercase tracking-wider ml-1">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/40 group-focus-within:text-amber-500 transition-colors" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete={isLogin ? 'current-password' : 'new-password'}
                                        className="w-full bg-vintage-navy-dark border border-amber-900/40 rounded-xl py-3 pl-10 pr-12 text-amber-100 placeholder:text-amber-500/20 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-amber-500/40 hover:text-amber-500 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                {/* Password Strength (Sign Up only) */}
                                {isSignup && password && (
                                    <div className="space-y-1 mt-2">
                                        <div className="flex gap-1">
                                            {[1, 2, 3].map((level) => (
                                                <div
                                                    key={level}
                                                    className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength.score >= level ? passwordStrength.color : 'bg-amber-900/30'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-xs text-amber-500/60">
                                            Password strength: <span className={passwordStrength.score >= 2 ? 'text-green-400' : 'text-red-400'}>{passwordStrength.label}</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Confirm Password (Sign Up only) */}
                        {isSignup && (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-amber-500/80 uppercase tracking-wider ml-1">Confirm Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/40 group-focus-within:text-amber-500 transition-colors" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        autoComplete="new-password"
                                        className={`w-full bg-vintage-navy-dark border rounded-xl py-3 pl-10 pr-12 text-amber-100 placeholder:text-amber-500/20 focus:outline-none focus:ring-1 transition-all ${passwordsMismatch
                                            ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/50'
                                            : passwordsMatch
                                                ? 'border-green-500/50 focus:border-green-500/50 focus:ring-green-500/50'
                                                : 'border-amber-900/40 focus:border-amber-500/50 focus:ring-amber-500/50'
                                            }`}
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-amber-500/40 hover:text-amber-500 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {passwordsMatch && (
                                    <p className="text-xs text-green-400 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Passwords match
                                    </p>
                                )}
                                {passwordsMismatch && (
                                    <p className="text-xs text-red-400 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> Passwords do not match
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Forgot Password Link - only show on login */}
                        {isLogin && (
                            <div className="text-right">
                                <button
                                    type="button"
                                    onClick={() => switchMode('forgot')}
                                    className="text-amber-500/60 hover:text-amber-400 text-sm transition-colors"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || (isSignup && (!passwordsMatch || passwordStrength.score < 2))}
                            className="w-full mt-6 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-medium py-3 rounded-xl shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {isForgot ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Create Account'}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Mode Switching - hide for forgot password */}
                    {!isForgot && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={() => switchMode(isLogin ? 'signup' : 'login')}
                                className="text-amber-500/60 hover:text-amber-400 text-sm transition-colors"
                            >
                                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
