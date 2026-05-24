import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { aiService } from '../services/ai';
import { User, Shield, Database, Save, Loader2, CheckCircle2, Ruler, Weight, Calendar } from 'lucide-react';

const Profile = () => {
  const { user, updateProfileData, isOffline } = useAuth();
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [height, setHeight] = useState(user?.height || '');
  const [weight, setWeight] = useState(user?.weight || '');
  const [age, setAge] = useState(user?.age || '');
  const [goal, setGoal] = useState(user?.goal || 'Definición Muscular');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      // 1. Generate progression advice dynamically using the global Groq key
      const advice = await aiService.generateProgressionAdvice(null, {
        height: parseFloat(height),
        weight: parseFloat(weight),
        age: parseInt(age),
        goal
      });

      // 2. Save inputs and calculated advice
      await updateProfileData({
        displayName,
        height: parseFloat(height) || 0,
        weight: parseFloat(weight) || 0,
        age: parseInt(age) || 0,
        goal,
        aiAdvice: advice
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError('Error al actualizar el perfil. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-charcoal-900 min-h-[calc(100vh-80px)] text-slate-100 font-sans max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-white">Mi Perfil</h2>
        <p className="text-sm text-slate-400">Gestiona tu información física y objetivos de progresión</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card details */}
        <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent-neon to-accent-cyan p-0.5 shadow-xl shadow-accent-neon/10 mb-4">
            <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center text-white text-3xl font-black">
              {displayName ? displayName.slice(0, 2).toUpperCase() : 'GP'}
            </div>
          </div>
          <h3 className="text-lg font-black text-white">{displayName || 'Usuario'}</h3>
          <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
          <span className="mt-4 px-3 py-1 bg-accent-neon/10 text-accent-neon border border-accent-neon/20 rounded-full text-xs font-bold uppercase tracking-wider">
            Socio Premium
          </span>

          <div className="w-full border-t border-slate-800/40 mt-6 pt-6 text-left space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-accent-cyan" />
                Base de datos
              </span>
              <span className={`font-semibold ${isOffline ? 'text-yellow-400' : 'text-emerald-400'}`}>
                {isOffline ? 'Offline (Local)' : 'Firestore Cloud'}
              </span>
            </div>
          </div>
        </div>

        {/* Configurations Form */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent-neon" />
            Configuración Corporal y de Progreso
          </h3>

          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p className="text-sm font-semibold">Configuración y plan de progresión actualizados con éxito.</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400">
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Nombre para mostrar
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="ej. Alex Smith"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent-neon transition-all"
                />
              </div>
            </div>

            {/* Physical Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5 text-accent-cyan" />
                  Estatura (cm)
                </label>
                <input
                  type="number"
                  required
                  placeholder="ej. 175"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="block w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent-neon transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Weight className="w-3.5 h-3.5 text-accent-neon" />
                  Peso actual (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="ej. 75.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="block w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent-neon transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-450" />
                  Edad (años)
                </label>
                <input
                  type="number"
                  required
                  placeholder="ej. 25"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="block w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-550 focus:outline-none focus:border-accent-neon transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Objetivo Fitness / Progresión
              </label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="block w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-accent-neon transition-all"
              >
                <option value="Definición Muscular">Definición Muscular (Pérdida de grasa conservando músculo)</option>
                <option value="Ganancia Muscular">Ganancia Muscular / Volumen (Superávit controlado)</option>
                <option value="Pérdida de Peso">Pérdida de Peso / Déficit Calórico</option>
                <option value="Recomposición Corporal">Recomposición Corporal (Normocaloría)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-accent-neon text-black hover:opacity-90 disabled:opacity-50 font-extrabold rounded-xl shadow-lg shadow-accent-neon/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
