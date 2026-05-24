import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Dumbbell, Mail, Lock, User, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

const Login = () => {
  const { user, login, signup, isOffline } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);
  const [isRegister, setIsRegister] = useState(false);
  
  // Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  // Loading & Error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        // Sign up
        await signup(email, password);
        // We'll update the display name if offline or online
        // In real auth, updateProfile is called after creation, we handle it in context sync
      } else {
        // Log in
        await login(email, password);
      }
    } catch (err) {
      console.error(err);
      // Clean up firebase error message
      let msg = err.message || 'Ocurrió un error inesperado.';
      if (msg.includes('auth/user-not-found') || msg.includes('user-not-found')) {
        msg = 'No existe ningún usuario registrado con este correo.';
      } else if (msg.includes('auth/wrong-password') || msg.includes('wrong-password')) {
        msg = 'La contraseña ingresada es incorrecta.';
      } else if (msg.includes('auth/email-already-in-use') || msg.includes('email-already-in-use')) {
        msg = 'Este correo electrónico ya está en uso.';
      } else if (msg.includes('auth/weak-password') || msg.includes('weak-password')) {
        msg = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (msg.includes('auth/invalid-email') || msg.includes('invalid-email')) {
        msg = 'El correo electrónico ingresado no es válido.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill demo credentials for testing
  const handleQuickLogin = async () => {
    setEmail('alex@gymtrack.pro');
    setPassword('123456');
    setError(null);
    setLoading(true);
    try {
      await login('alex@gymtrack.pro', '123456');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al iniciar sesión demo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal-950 px-4 py-12 relative overflow-hidden font-sans">
      {/* Decorative Gradient Background Blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-accent-neon/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-cyan/10 rounded-full blur-3xl" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 sm:p-10 shadow-2xl">
        {/* Logo Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-gradient-to-br from-accent-neon to-accent-cyan rounded-2xl shadow-xl shadow-accent-neon/10 mb-4 animate-bounce">
            <Dumbbell className="w-8 h-8 text-black stroke-[2.5]" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            GymTrack<span className="text-accent-neon">Pro</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1.5 text-center">
            {isRegister 
              ? 'Únete gratis y comienza a registrar tu progreso inteligente' 
              : 'Bienvenido de vuelta. Prepárate para aplastar tus metas'
            }
          </p>
        </div>

        {isOffline && !isRegister && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded bg-yellow-500/20 flex items-center justify-center text-yellow-400 mt-0.5">
                💡
              </div>
              <div className="flex-1 text-xs">
                <span className="font-bold text-yellow-400 block">Modo Local Activado</span>
                <span className="text-slate-300">Puedes registrarte o iniciar sesión. Tus datos se guardarán en este dispositivo.</span>
                <button
                  type="button"
                  onClick={handleQuickLogin}
                  className="mt-2.5 px-3 py-1.5 w-full bg-yellow-500 text-black hover:bg-yellow-400 rounded-xl font-bold transition-all duration-300"
                >
                  Acceso Rápido
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm font-semibold">{error}</p>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Juan Pérez"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent-neon focus:ring-1 focus:ring-accent-neon transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Correo Electrónico</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                required
                placeholder="nombre@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent-neon focus:ring-1 focus:ring-accent-neon transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent-neon focus:ring-1 focus:ring-accent-neon transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3.5 bg-gradient-to-r from-accent-neon to-accent-cyan text-black hover:opacity-90 disabled:opacity-50 font-bold rounded-xl shadow-lg shadow-accent-neon/15 flex items-center justify-center gap-2 transition-all"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>{isRegister ? 'Registrarse' : 'Iniciar Sesión'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Toggle Register/Login */}
        <div className="mt-8 pt-6 border-t border-slate-800/40 text-center">
          <p className="text-xs sm:text-sm text-slate-400">
            {isRegister ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta aún?'}
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="ml-1.5 text-accent-neon hover:underline font-bold transition-all"
            >
              {isRegister ? 'Inicia Sesión' : 'Regístrate Gratis'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
