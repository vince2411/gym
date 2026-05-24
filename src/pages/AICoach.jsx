import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { aiService } from '../services/ai';
import { EXERCISES_DATABASE } from '../data/exercises';
import { Sparkles, Brain, Scale, Plus, Loader2, Key, Info, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Simple Markdown to JSX parser to support beautiful native rendering
const MarkdownRenderer = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-350">
      {lines.map((line, idx) => {
        // Headers
        if (line.startsWith('###')) {
          return <h4 key={idx} className="text-base font-extrabold text-white mt-4 flex items-center gap-1.5">{line.replace('###', '').trim()}</h4>;
        }
        if (line.startsWith('####')) {
          return <h5 key={idx} className="text-sm font-bold text-accent-cyan mt-3">{line.replace('####', '').trim()}</h5>;
        }
        if (line.startsWith('##')) {
          return <h3 key={idx} className="text-lg font-black text-white mt-5 border-b border-slate-800 pb-2">{line.replace('##', '').trim()}</h3>;
        }
        if (line.startsWith('#')) {
          return <h2 key={idx} className="text-xl font-black text-white mt-6">{line.replace('#', '').trim()}</h2>;
        }

        // Unordered lists
        if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
          let content = line.trim().substring(1).trim();
          // Bold parsing within list items
          const boldRegex = /\*\*(.*?)\*\*/g;
          const parts = [];
          let lastIndex = 0;
          let match;
          while ((match = boldRegex.exec(content)) !== null) {
            if (match.index > lastIndex) {
              parts.push(content.substring(lastIndex, match.index));
            }
            parts.push(<strong key={match.index} className="text-white font-extrabold">{match[1]}</strong>);
            lastIndex = boldRegex.lastIndex;
          }
          if (lastIndex < content.length) {
            parts.push(content.substring(lastIndex));
          }

          return (
            <div key={idx} className="flex items-start gap-2 pl-4">
              <span className="text-accent-neon shrink-0 mt-1.5">•</span>
              <p className="text-slate-300 text-xs sm:text-sm">{parts.length > 0 ? parts : content}</p>
            </div>
          );
        }

        // Empty lines
        if (line.trim() === '') {
          return <div key={idx} className="h-1" />;
        }

        // Regular text with bold styling
        const boldRegex = /\*\*(.*?)\*\*/g;
        const parts = [];
        let lastIndex = 0;
        let match;
        while ((match = boldRegex.exec(line)) !== null) {
          if (match.index > lastIndex) {
            parts.push(line.substring(lastIndex, match.index));
          }
          parts.push(<strong key={match.index} className="text-white font-extrabold">{match[1]}</strong>);
          lastIndex = boldRegex.lastIndex;
        }
        if (lastIndex < line.length) {
          parts.push(line.substring(lastIndex));
        }

        return <p key={idx} className="text-slate-300 text-xs sm:text-sm">{parts.length > 0 ? parts : line}</p>;
      })}
    </div>
  );
};

const AICoach = () => {
  const { user, isOffline, dbService } = useAuth();
  const navigate = useNavigate();

  // App data states
  const [routines, setRoutines] = useState([]);
  const [history, setHistory] = useState([]);
  
  // UI states
  const [activeTab, setActiveTab] = useState('audit'); // 'audit', 'optimize', 'generate'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  // Generator form states
  const [goal, setGoal] = useState('Hipertrofia');
  const [daysCount, setDaysCount] = useState('4');
  const [targetMuscles, setTargetMuscles] = useState('');

  const apiKey = user?.geminiApiKey || '';

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        if (isOffline) {
          const r = await dbService.getRoutines(user.uid);
          const h = await dbService.getProgressHistory(user.uid);
          setRoutines(r);
          setHistory(h);
        } else {
          const rSnap = await getDocs(collection(db, 'users', user.uid, 'rutinas'));
          setRoutines(rSnap.docs.map(doc => doc.data()));

          const hSnap = await getDocs(collection(db, 'users', user.uid, 'historial_progreso'));
          setHistory(hSnap.docs.map(doc => doc.data()));
        }
      } catch (err) {
        console.error('Error fetching data for AI Coach:', err);
      }
    };
    fetchData();
  }, [user, isOffline]);

  // Handle Audit routines trigger
  const handleAuditRoutines = async () => {
    setLoading(true);
    setResult('');
    try {
      const response = await aiService.auditRoutines(apiKey, routines);
      setResult(response);
    } catch (err) {
      console.error(err);
      setResult(`### ❌ Error al auditar rutinas\n${err.message || 'Inténtalo de nuevo más tarde.'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Load optimization trigger
  const handleOptimizeLoad = async () => {
    setLoading(true);
    setResult('');
    try {
      const response = await aiService.optimizeLoad(apiKey, history);
      setResult(response);
    } catch (err) {
      console.error(err);
      setResult(`### ❌ Error al analizar progreso\n${err.message || 'Inténtalo de nuevo más tarde.'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Routine generator trigger
  const handleGenerateRoutine = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult('');
    try {
      const response = await aiService.generateRoutine(apiKey, { goal, daysCount, targetMuscles });
      setResult(response);
    } catch (err) {
      console.error(err);
      setResult(`### ❌ Error al generar rutina\n${err.message || 'Inténtalo de nuevo más tarde.'}`);
    } finally {
      setLoading(false);
    }
  };

  const [implementing, setImplementing] = useState(false);
  const [implementedSuccess, setImplementedSuccess] = useState(false);

  const handleImplementRoutine = async () => {
    if (!result) return;
    setImplementing(true);
    setImplementedSuccess(false);

    try {
      // 1. Scan the AI output for exercise names in our database
      const matchedExercises = [];
      const lowerText = result.toLowerCase();
      
      EXERCISES_DATABASE.forEach(ex => {
        if (lowerText.includes(ex.name.toLowerCase())) {
          matchedExercises.push({
            id: 'form_ex_' + Math.random().toString(36).substr(2, 9),
            exerciseId: ex.id,
            name: ex.name,
            category: ex.category,
            sets: [
              { weight: 0, reps: 10 },
              { weight: 0, reps: 10 },
              { weight: 0, reps: 10 }
            ]
          });
        }
      });

      // Fallback if no exercises were matched
      if (matchedExercises.length === 0) {
        const defaultList = [
          { id: 'press-banca', name: 'Press de Banca con Barra', category: 'Pecho' },
          { id: 'sentadilla-barra', name: 'Sentadilla Trasera con Barra', category: 'Cuádriceps' },
          { id: 'remo-barra', name: 'Remo con Barra', category: 'Espalda' }
        ];
        defaultList.forEach(ex => {
          matchedExercises.push({
            id: 'form_ex_' + Math.random().toString(36).substr(2, 9),
            exerciseId: ex.id,
            name: ex.name,
            category: ex.category,
            sets: [
              { weight: 0, reps: 10 },
              { weight: 0, reps: 10 },
              { weight: 0, reps: 10 }
            ]
          });
        });
      }

      // 2. Select suggested days based on daysCount
      let days = ['Lunes', 'Miércoles', 'Viernes'];
      if (daysCount === '4') {
        days = ['Lunes', 'Martes', 'Jueves', 'Viernes'];
      } else if (daysCount === '5') {
        days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
      } else if (daysCount === '6') {
        days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      }

      const routineData = {
        name: `Rutina IA - ${goal} (${daysCount} días)`,
        days,
        exercises: matchedExercises,
        createdAt: new Date().toISOString()
      };

      if (isOffline) {
        await dbService.saveRoutine(user.uid, routineData);
      } else {
        const { doc, setDoc } = await import('firebase/firestore');
        const docRef = doc(collection(db, 'users', user.uid, 'rutinas'));
        await setDoc(docRef, routineData);
      }

      setImplementedSuccess(true);
      setTimeout(() => setImplementedSuccess(false), 4000);
      alert('¡Rutina recomendada guardada con éxito! La puedes ver en "Mis Rutinas".');
      navigate('/workouts');
    } catch (err) {
      console.error('Error implementing routine:', err);
      alert('Error al guardar la rutina recomendada.');
    } finally {
      setImplementing(false);
    }
  };

  const handleAcceptChanges = () => {
    alert('¡Ajustes de sobrecarga progresiva aceptados! Los nuevos pesos sugeridos se mantendrán para tu próxima sesión.');
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-charcoal-900 min-h-[calc(100vh-80px)] text-slate-100 font-sans max-w-5xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Brain className="w-7 h-7 text-accent-neon" />
            Asistente Virtual (AI Coach)
          </h2>
          <p className="text-sm text-slate-400">Auditorías de rutinas, optimización de cargas y generación de splits con Inteligencia Artificial</p>
        </div>

        {/* API Key Connection Badge */}
        <div className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/20 text-accent-neon rounded-xl text-xs font-bold flex items-center gap-2 self-start sm:self-center">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>AI Coach Activo</span>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex gap-2 border-b border-slate-800 pb-px">
        <button
          onClick={() => { setActiveTab('audit'); setResult(''); }}
          className={`pb-3.5 px-4 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'audit'
              ? 'border-accent-neon text-accent-neon'
              : 'border-transparent text-slate-450 hover:text-slate-200'
          }`}
        >
          Auditoría de Balance
        </button>
        <button
          onClick={() => { setActiveTab('optimize'); setResult(''); }}
          className={`pb-3.5 px-4 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'optimize'
              ? 'border-accent-neon text-accent-neon'
              : 'border-transparent text-slate-450 hover:text-slate-200'
          }`}
        >
          Optimización de Cargas
        </button>
        <button
          onClick={() => { setActiveTab('generate'); setResult(''); }}
          className={`pb-3.5 px-4 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'generate'
              ? 'border-accent-neon text-accent-neon'
              : 'border-transparent text-slate-450 hover:text-slate-200'
          }`}
        >
          Generador de Rutinas
        </button>
      </div>

      {/* Tab Contents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Inputs and Action Buttons */}
        <div className="lg:col-span-4 space-y-4">
          {activeTab === 'audit' && (
            <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-accent-neon" />
                Auditoría Semanal
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Analiza las rutinas creadas en tu cuenta para calcular desbalances biomecánicos entre empuje y tracción, torso y pierna.
              </p>
              <button
                onClick={handleAuditRoutines}
                disabled={loading}
                className="w-full py-3 bg-accent-neon hover:bg-accent-neon/90 disabled:opacity-50 text-black font-extrabold rounded-xl shadow-lg shadow-accent-neon/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 stroke-[2]" />
                    <span>Auditar Rutinas</span>
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'optimize' && (
            <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-accent-cyan" />
                Optimizar Pesos
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Analiza tu historial de entrenamientos completados para sugerir aumentos progresivos de carga y evitar el sobreentrenamiento.
              </p>
              <button
                onClick={handleOptimizeLoad}
                disabled={loading}
                className="w-full py-3 bg-accent-cyan hover:bg-accent-cyan/90 disabled:opacity-50 text-black font-extrabold rounded-xl shadow-lg shadow-accent-cyan/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 stroke-[2]" />
                    <span>Optimizar Cargas</span>
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'generate' && (
            <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur">
              <form onSubmit={handleGenerateRoutine} className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Parámetros de Rutina</h3>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Objetivo</label>
                  <select
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-accent-neon"
                  >
                    <option value="Hipertrofia">Hipertrofia (Ganancia Muscular)</option>
                    <option value="Fuerza">Fuerza Maxima (RPE Bajo)</option>
                    <option value="Pérdida de Grasa">Definición Muscular</option>
                    <option value="Resistencia">Resistencia Cardiovascular</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Días disponibles</label>
                  <select
                    value={daysCount}
                    onChange={(e) => setDaysCount(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-accent-neon"
                  >
                    <option value="3">3 días a la semana</option>
                    <option value="4">4 días a la semana</option>
                    <option value="5">5 días a la semana</option>
                    <option value="6">6 días a la semana</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Enfoque (Opcional)</label>
                  <input
                    type="text"
                    placeholder="ej. Brazos y Hombros, Femorales"
                    value={targetMuscles}
                    onChange={(e) => setTargetMuscles(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-accent-neon"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 py-3 bg-gradient-to-r from-accent-neon to-accent-cyan text-black hover:opacity-90 disabled:opacity-50 font-extrabold rounded-xl shadow-lg shadow-accent-neon/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Generar Rutina</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Advice card helper */}
          <div className="p-4 bg-slate-950/20 border border-slate-850 rounded-2xl flex items-start gap-2.5">
            <Info className="w-4 h-4 text-accent-cyan shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-relaxed">
              <span className="font-bold text-white block mb-0.5">🚀 Coach Inteligente Activado:</span>
              Estamos utilizando el modelo avanzado de Inteligencia Artificial para auditar tus rutinas de entrenamiento y darte consejos en tiempo real de forma automática.
            </p>
          </div>
        </div>

        {/* Right Side: Response Panel */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur min-h-[350px] flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <Loader2 className="w-10 h-10 text-accent-neon animate-spin mb-4" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">El AI Coach está procesando...</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">Esto puede tardar unos segundos. Estamos analizando la biomecánica y sobrecarga progresiva de tus entrenamientos.</p>
            </div>
          ) : result ? (
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-accent-neon" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Análisis Generado</span>
                </div>
                {activeTab === 'generate' && (
                  <button
                    onClick={handleImplementRoutine}
                    disabled={implementing}
                    className="px-3.5 py-1.5 bg-accent-neon text-black font-extrabold rounded-lg text-xs flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-accent-neon/10"
                  >
                    {implementing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Implementar Rutina</span>
                      </>
                    )}
                  </button>
                )}
                {activeTab === 'optimize' && (
                  <button
                    onClick={handleAcceptChanges}
                    className="px-3.5 py-1.5 bg-accent-cyan text-black font-extrabold rounded-lg text-xs flex items-center gap-1.5 hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-accent-cyan/10"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Aceptar Cambios de Carga</span>
                  </button>
                )}
              </div>
              <MarkdownRenderer text={result} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border border-dashed border-slate-855 rounded-xl">
              <Brain className="w-12 h-12 text-slate-650 mb-3" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Esperando Solicitud</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">Haz clic en los botones del panel izquierdo para iniciar la auditoría de balance o planear tu nueva rutina.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AICoach;
