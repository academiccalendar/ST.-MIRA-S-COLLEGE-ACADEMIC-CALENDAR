import React, { useState } from 'react';
import { X, User, Lock, Mail, Phone, Building2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Department, UserSession } from '../types';
import { loginUser, registerUser } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  departments: Department[];
  onClose: () => void;
  onSuccess: (user: UserSession) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  departments,
  onClose,
  onSuccess
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState<number>(departments[0]?.id || 1);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!email || !password) {
          throw new Error('Please fill in both email and password');
        }
        const res = await loginUser(email, password);
        onSuccess(res.user);
        onClose();
      } else {
        if (!firstName || !lastName || !email || !password || !departmentId) {
          throw new Error('Please fill in all required registration fields');
        }
        const res = await registerUser({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          password,
          department_id: Number(departmentId),
          phone: phone.trim()
        });
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
          </div>

          <h3 className="text-xl font-bold font-serif">
            {mode === 'login' ? 'Faculty & Admin Login' : 'Register Faculty Account'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login'
              ? 'Sign in with your institutional credentials to manage calendar events.'
              : 'Create your teacher account to submit departmental academic schedules.'}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Joshi"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Institutional Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="teacher@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {mode === 'register' && (
            <>
              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Department Assignment
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="+1 555-0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow transition disabled:opacity-50 mt-2"
          >
            <span>{isLoading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Register Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Toggle Register / Login */}
          <div className="text-center pt-2 border-t border-slate-100">
            {mode === 'login' ? (
              <p className="text-xs text-slate-500">
                New faculty member?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Create an account
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>

        </form>

      </div>
    </div>
  );
};
