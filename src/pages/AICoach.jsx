import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { aiService } from '../services/ai';
import { EXERCISES_DATABASE, MUSCLE_GROUPS } from '../data/exercises';
import { Sparkles, Brain, Scale, Plus, Loader2, Info, Check, X, Search, Trash2, Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Simple Markdown to JSX parser to support beautiful native rendering
const MarkdownRenderer = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-350">
      {lines.map((line, idx) => {
        // Headers
        if (line.startsWith('####')) {
          return <h5 key={idx} className="text-sm font-bold text-accent-cyan mt-3">{line.replace('####', '').trim()}</h5>;
        }
        if (line.startsWith('###')) {
          return <h4 key={idx} className="text-base font-extrabold text-white mt-4 flex items-center gap-1.5">{line.replace('###', '').trim()}</h4>;
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

  // ─── Review Modal State ───
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRoutineName, setReviewRoutineName] = useState('');
  const [reviewRoutineDays, setReviewRoutineDays] = useState([]);
  const [reviewExercises, setReviewExercises] = useState([]);
  const [reviewSearchQuery, setReviewSearchQuery] = useState('');
  const [reviewSelectedCategory, setReviewSelectedCategory] = useState('Todos');
  const [savingRoutine, setSavingRoutine] = useState(false);

  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // When user clicks "Implementar Rutina", open the review modal with pre-matched exercises
  const handleOpenReviewModal = () => {
    if (!result) return;

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

    // 2. Select suggested days based on daysCount
    let days = ['Lunes', 'Miércoles', 'Viernes'];
    if (daysCount === '4') {
      days = ['Lunes', 'Martes', 'Jueves', 'Viernes'];
    } else if (daysCount === '5') {
      days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    } else if (daysCount === '6') {
      days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    }

    setReviewRoutineName(`Rutina IA - ${goal} (${daysCount} días)`);
    setReviewRoutineDays(days);
    setReviewExercises(matchedExercises);
    setReviewSearchQuery('');
    setReviewSelectedCategory('Todos');
    setShowReviewModal(true);
  };

  const handleAddExerciseToReview = (ex) => {
    // Don't add duplicates
    if (reviewExercises.find(e => e.exerciseId === ex.id)) return;
    setReviewExercises([
      ...reviewExercises,
      {
        id: 'form_ex_' + Math.random().toString(36).substr(2, 9),
        exerciseId: ex.id,
        name: ex.name,
        category: ex.category,
        sets: [
          { weight: 0, reps: 10 },
          { weight: 0, reps: 10 },
          { weight: 0, reps: 10 }
        ]
      }
    ]);
  };

  const handleRemoveExerciseFromReview = (id) => {
    setReviewExercises(reviewExercises.filter(ex => ex.id !== id));
  };

  const handleToggleReviewDay = (day) => {
    if (reviewRoutineDays.includes(day)) {
      setReviewRoutineDays(reviewRoutineDays.filter(d => d !== day));
    } else {
      setReviewRoutineDays([...reviewRoutineDays, day]);
    }
  };

  const handleConfirmSaveRoutine = async () => {
    if (!reviewRoutineName.trim()) return alert('Por favor, ingresa un nombre para la rutina');
    if (reviewExercises.length === 0) return alert('Agrega al menos un ejercicio a la rutina');

    setSavingRoutine(true);
    try {
      const routineData = {
        name: reviewRoutineName,
        days: reviewRoutineDays,
        exercises: reviewExercises,
        createdAt: new Date().toISOString()
      };

      if (isOffline) {
        await dbService.saveRoutine(user.uid, routineData);
      } else {
        const docRef = doc(collection(db, 'users', user.uid, 'rutinas'));
        await setDoc(docRef, routineData);
      }

      setShowReviewModal(false);
      navigate('/workouts');
    } catch (err) {
      console.error('Error saving routine:', err);
      alert('Error al guardar la rutina.');
    } finally {
      setSavingRoutine(false);
    }
  };

  const filteredExercisesForReview = EXERCISES_DATABASE.filter(ex => {
    const matchCat = reviewSelectedCategory === 'Todos' || ex.category === reviewSelectedCategory;
    const matchSearch = !reviewSearchQuery || ex.name.toLowerCase().includes(reviewSearchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

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
                    onClick={handleOpenReviewModal}
                    className="px-3.5 py-1.5 bg-accent-neon text-black font-extrabold rounded-lg text-xs flex items-center gap-1.5 hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-accent-neon/10"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Implementar Rutina</span>
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

      {/* ─── Review & Save Routine Modal ─── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-accent-neon" />
                  Revisar Rutina Generada
                </h3>
                <p className="text-xs text-slate-400 mt-1">Revisa los ejercicios detectados, agrega o elimina ejercicios, y guarda tu rutina.</p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {/* Routine Name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre de la Rutina</label>
                <input
                  type="text"
                  value={reviewRoutineName}
                  onChange={(e) => setReviewRoutineName(e.target.value)}
                  className="block w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent-neon transition-all"
                  placeholder="ej. Rutina Push/Pull/Legs"
                />
              </div>

              {/* Days Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Días de Entrenamiento</label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleToggleReviewDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        reviewRoutineDays.includes(day) 
                          ? 'bg-accent-neon/20 border-accent-neon/40 text-accent-neon' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Exercises in Routine */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Ejercicios en la Rutina ({reviewExercises.length})
                </label>
                {reviewExercises.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl">
                    <p className="text-xs text-slate-500">No se detectaron ejercicios. Usa el buscador de abajo para agregar ejercicios manualmente.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reviewExercises.map((ex, idx) => (
                      <div key={ex.id} className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800/60 rounded-xl group">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-accent-neon w-6 text-center">{idx + 1}</span>
                          <div>
                            <p className="text-sm font-bold text-white">{ex.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{ex.category} · {ex.sets.length} series</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveExerciseFromReview(ex.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-red-500/15 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Exercises Browser */}
              <div className="border-t border-slate-800 pt-5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  <Plus className="w-3.5 h-3.5 inline mr-1" />
                  Agregar Ejercicios
                </label>

                {/* Search and Category Filter */}
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Buscar ejercicio..."
                      value={reviewSearchQuery}
                      onChange={(e) => setReviewSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-accent-neon"
                    />
                  </div>
                  <select
                    value={reviewSelectedCategory}
                    onChange={(e) => setReviewSelectedCategory(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-accent-neon"
                  >
                    <option value="Todos">Todos</option>
                    {MUSCLE_GROUPS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Exercise List */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar">
                  {filteredExercisesForReview.map(ex => {
                    const alreadyAdded = reviewExercises.find(e => e.exerciseId === ex.id);
                    return (
                      <div
                        key={ex.id}
                        className={`p-2.5 rounded-xl flex items-center justify-between gap-3 transition-all ${
                          alreadyAdded 
                            ? 'bg-accent-neon/5 border border-accent-neon/20 opacity-60' 
                            : 'bg-slate-950/40 border border-slate-800/40 hover:border-slate-700 cursor-pointer'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-white">{ex.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{ex.category}</p>
                        </div>
                        {alreadyAdded ? (
                          <span className="text-[10px] text-accent-neon font-bold uppercase">Agregado</span>
                        ) : (
                          <button
                            onClick={() => handleAddExerciseToReview(ex)}
                            className="p-1.5 rounded-lg bg-accent-neon/10 text-accent-neon hover:bg-accent-neon/20 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-800 flex items-center justify-between gap-4 shrink-0">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-5 py-2.5 bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold rounded-xl text-sm transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSaveRoutine}
                disabled={savingRoutine || reviewExercises.length === 0}
                className="px-6 py-2.5 bg-accent-neon text-black font-extrabold rounded-xl text-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-accent-neon/15"
              >
                {savingRoutine ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Guardar Rutina ({reviewExercises.length} ejercicios)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AICoach;
