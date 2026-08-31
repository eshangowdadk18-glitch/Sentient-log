import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await api.register({ email, password });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 selection:bg-white/30">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px]"
      >
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-xl shadow-2xl">
            <Activity className="h-6 w-6 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-center text-zinc-100 mb-2">Create an account</h2>
        <p className="text-zinc-500 text-center mb-8">Sign up for SentientLog</p>
        
        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm text-center">
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-400">Email</label>
            <input
              type="email"
              required
              className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sentientlog.com"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-400">Password</label>
            <input
              type="password"
              required
              className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-zinc-200 text-black font-medium py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        
        <p className="text-zinc-500 text-center mt-8 text-sm">
          Already have an account? <Link to="/login" className="text-zinc-300 hover:text-white transition-colors underline decoration-white/30 underline-offset-4">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
