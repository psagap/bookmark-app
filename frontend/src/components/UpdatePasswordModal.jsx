import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Lock, Loader2, ArrowRight, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';

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

const UpdatePasswordModal = ({ isOpen, onClose, onSuccess, requireCurrentPassword = false }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [verifiedCurrentPassword, setVerifiedCurrentPassword] = useState(false);

    const passwordStrength = getPasswordStrength(password);
    const passwordsMatch = password && confirmPassword && password === confirmPassword;
    const passwordsMismatch = confirmPassword && password !== confirmPassword;

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setCurrentPassword('');
            setPassword('');
            setConfirmPassword('');
            setError(null);
            setMessage(null);
            setVerifiedCurrentPassword(false);
            setShowCurrentPassword(false);
            setShowPassword(false);
            setShowConfirmPassword(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleVerifyCurrentPassword = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Get the current user's email
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) {
                throw new Error('Could not get user email');
            }

            // Try to sign in with the current password to verify it
            const { error } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword,
            });

            if (error) {
                throw new Error('Current password is incorrect');
            }

            setVerifiedCurrentPassword(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (passwordStrength.score < 2) {
            setError('Please choose a stronger password.');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            setMessage('Password updated successfully!');
            setTimeout(() => {
                onSuccess?.();
                onClose();
            }, 1500);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Show current password verification step first if required
    const showCurrentPasswordStep = requireCurrentPassword && !verifiedCurrentPassword;

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
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-serif text-amber-100 mb-2">
                            {showCurrentPasswordStep ? 'Verify Your Identity' : 'Set New Password'}
                        </h2>
                        <p className="text-amber-500/60 text-sm">
                            {showCurrentPasswordStep
                                ? 'Enter your current password to continue'
                                : 'Choose a strong password for your account'}
                        </p>
                    </div>

                    {/* Step 1: Verify Current Password (if required) */}
                    {showCurrentPasswordStep ? (
                        <form onSubmit={handleVerifyCurrentPassword} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-amber-500/80 uppercase tracking-wider ml-1">Current Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/40 group-focus-within:text-amber-500 transition-colors" />
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        autoComplete="current-password"
                                        className="w-full bg-vintage-navy-dark border border-amber-900/40 rounded-xl py-3 pl-10 pr-12 text-amber-100 placeholder:text-amber-500/20 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                                        placeholder="••••••••"
                                        required
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-amber-500/40 hover:text-amber-500 transition-colors"
                                    >
                                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !currentPassword}
                                className="w-full mt-6 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-medium py-3 rounded-xl shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Verify & Continue
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        /* Step 2: Set New Password */
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}
                            {message && (
                                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-200 text-sm flex items-center gap-2">
                                    <Check className="w-4 h-4 flex-shrink-0" />
                                    {message}
                                </div>
                            )}

                            {/* New Password */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-amber-500/80 uppercase tracking-wider ml-1">New Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/40 group-focus-within:text-amber-500 transition-colors" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="new-password"
                                        className="w-full bg-vintage-navy-dark border border-amber-900/40 rounded-xl py-3 pl-10 pr-12 text-amber-100 placeholder:text-amber-500/20 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                                        placeholder="••••••••"
                                        required
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-amber-500/40 hover:text-amber-500 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                {/* Password Strength */}
                                {password && (
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

                            {/* Confirm Password */}
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

                            <button
                                type="submit"
                                disabled={loading || !passwordsMatch || passwordStrength.score < 2}
                                className="w-full mt-6 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-medium py-3 rounded-xl shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Update Password
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UpdatePasswordModal;

