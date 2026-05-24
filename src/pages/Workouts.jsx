import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { EXERCISES_DATABASE, MUSCLE_GROUPS } from '../data/exercises';
import { 
  Plus, 
  Trash2, 
  Play, 
  Check, 
  X, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Dumbbell, 
  Sparkles,
  Info,
  Clock
} from 'lucide-react';

const Workouts = () => {
  const { user, isOffline, dbService } = useAuth();
  
  // App States
  const [routines, setRoutines] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation / Modal States
  const [isCreating, setIsCreating] = useState(false);
  const [activeSession, setActiveSession] = useState(null); // Active routine instance being logged
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Exercises States
  const [customExercises, setCustomExercises] = useState([]);
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customExName, setCustomExName] = useState('');
  const [customExCategory, setCustomExCategory] = useState('Pecho');
  const [customExDesc, setCustomExDesc] = useState('');

  // Routine Form States
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineDays, setNewRoutineDays] = useState([]);
  const [newRoutineExercises, setNewRoutineExercises] = useState([]); // [{ exerciseId, name, category, sets: [{weight, reps}] }]

  // Active Logging States
  const [loggedSets, setLoggedSets] = useState({}); // { [exIndex_setIndex]: { weight, reps, completed } }
  
  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  useEffect(() => {
    fetchData();
  }, [user, isOffline]);

  const fetchData = async () => {
    if (!user) return;
    try {
      if (isOffline) {
        const r = await dbService.getRoutines(user.uid);
        const h = await dbService.getProgressHistory(user.uid);
        const c = await dbService.getCustomExercises(user.uid);
        setRoutines(r);
        setHistory(h);
        setCustomExercises(c);
      } else {
        const rSnap = await getDocs(collection(db, 'users', user.uid, 'rutinas'));
        setRoutines(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const hSnap = await getDocs(collection(db, 'users', user.uid, 'historial_progreso'));
        setHistory(hSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const cSnap = await getDocs(collection(db, 'users', user.uid, 'ejercicios_personalizados'));
        setCustomExercises(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (err) {
      console.error('Error fetching workouts data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomExercise = async (e) => {
    e.preventDefault();
    if (!customExName.trim()) return alert('Por favor, ingresa un nombre para el ejercicio');

    const exData = {
      id: 'custom_' + Math.random().toString(36).substr(2, 9),
      name: customExName,
      category: customExCategory,
      description: customExDesc || 'Ejercicio personalizado creado por el usuario.'
    };

    try {
      if (isOffline) {
        const newEx = await dbService.saveCustomExercise(user.uid, exData);
        setCustomExercises([...customExercises, newEx]);
      } else {
        const docRef = await addDoc(collection(db, 'users', user.uid, 'ejercicios_personalizados'), exData);
        setCustomExercises([...customExercises, { id: docRef.id, ...exData }]);
      }
      setCustomExName('');
      setCustomExDesc('');
      setShowAddCustomModal(false);
    } catch (err) {
      console.error(err);
      alert('Error al guardar el ejercicio personalizado');
    }
  };

  // Routine Creation Functions
  const handleToggleDay = (day) => {
    if (newRoutineDays.includes(day)) {
      setNewRoutineDays(newRoutineDays.filter(d => d !== day));
    } else {
      setNewRoutineDays([...newRoutineDays, day]);
    }
  };

  const handleAddExerciseToForm = (ex) => {
    const defaultSet = { weight: 20, reps: 10 };
    setNewRoutineExercises([
      ...newRoutineExercises,
      {
        id: 'form_ex_' + Math.random().toString(36).substr(2, 9),
        exerciseId: ex.id,
        name: ex.name,
        category: ex.category,
        sets: [defaultSet, { ...defaultSet }, { ...defaultSet }]
      }
    ]);
  };

  const handleRemoveExerciseFromForm = (id) => {
    setNewRoutineExercises(newRoutineExercises.filter(ex => ex.id !== id));
  };

  const handleSetChange = (exId, setIndex, field, value) => {
    setNewRoutineExercises(newRoutineExercises.map(ex => {
      if (ex.id === exId) {
        const updatedSets = [...ex.sets];
        updatedSets[setIndex] = {
          ...updatedSets[setIndex],
          [field]: parseFloat(value) || 0
        };
        return { ...ex, sets: updatedSets };
      }
      return ex;
    }));
  };

  const handleAddSetToFormEx = (exId) => {
    setNewRoutineExercises(newRoutineExercises.map(ex => {
      if (ex.id === exId) {
        const lastSet = ex.sets[ex.sets.length - 1] || { weight: 20, reps: 10 };
        return { ...ex, sets: [...ex.sets, { ...lastSet }] };
      }
      return ex;
    }));
  };

  const handleRemoveSetFromFormEx = (exId, index) => {
    setNewRoutineExercises(newRoutineExercises.map(ex => {
      if (ex.id === exId) {
        const updatedSets = [...ex.sets];
        updatedSets.splice(index, 1);
        return { ...ex, sets: updatedSets };
      }
      return ex;
    }));
  };

  const handleSaveRoutine = async () => {
    if (!newRoutineName.trim()) return alert('Por favor, ingresa un nombre para la rutina');
    if (newRoutineExercises.length === 0) return alert('Agrega al menos un ejercicio a tu rutina');

    const routineData = {
      name: newRoutineName,
      days: newRoutineDays,
      exercises: newRoutineExercises,
      createdAt: new Date().toISOString()
    };

    try {
      if (isOffline) {
        await dbService.saveRoutine(user.uid, routineData);
      } else {
        const docRef = doc(collection(db, 'users', user.uid, 'rutinas'));
        await setDoc(docRef, routineData);
      }
      setIsCreating(false);
      resetRoutineForm();
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error al guardar rutina');
    }
  };

  const resetRoutineForm = () => {
    setNewRoutineName('');
    setNewRoutineDays([]);
    setNewRoutineExercises([]);
  };

  const handleDeleteRoutine = async (routineId) => {
    if (!confirm('¿Estás seguro de eliminar esta rutina?')) return;
    try {
      if (isOffline) {
        await dbService.deleteRoutine(user.uid, routineId);
      } else {
        await deleteDoc(doc(db, 'users', user.uid, 'rutinas', routineId));
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Active Workout Session Functions
  const handleStartWorkout = (routine) => {
    setActiveSession(routine);
    // Initialize logging states at 0 to start fresh
    const initialLogged = {};
    routine.exercises.forEach((ex, exIndex) => {
      ex.sets.forEach((set, setIndex) => {
        initialLogged[`${exIndex}_${setIndex}`] = {
          weight: 0,
          reps: 0,
          completed: false
        };
      });
    });
    setLoggedSets(initialLogged);
  };

  const handleActiveSetChange = (exIndex, setIndex, field, value) => {
    setLoggedSets({
      ...loggedSets,
      [`${exIndex}_${setIndex}`]: {
        ...loggedSets[`${exIndex}_${setIndex}`],
        [field]: parseFloat(value) || 0
      }
    });
  };

  const handleToggleSetComplete = (exIndex, setIndex) => {
    const key = `${exIndex}_${setIndex}`;
    setLoggedSets({
      ...loggedSets,
      [key]: {
        ...loggedSets[key],
        completed: !loggedSets[key].completed
      }
    });
  };

  const handleAddSetToActive = (exIndex) => {
    // Find how many sets are logged for this exercise
    const keys = Object.keys(loggedSets).filter(k => k.startsWith(`${exIndex}_`));
    const nextSetIndex = keys.length;
    
    // Find last set values
    const lastKey = `${exIndex}_${nextSetIndex - 1}`;
    const lastSet = loggedSets[lastKey] || { weight: 20, reps: 10 };

    setLoggedSets({
      ...loggedSets,
      [`${exIndex}_${nextSetIndex}`]: {
        weight: lastSet.weight,
        reps: lastSet.reps,
        completed: false
      }
    });
  };

  const handleFinishWorkout = async () => {
    if (!activeSession) return;
    
    // Aggregate logged sets
    const logDate = new Date().toISOString().split('T')[0];
    const completedSets = [];
    let totalVolume = 0;

    activeSession.exercises.forEach((ex, exIndex) => {
      const keys = Object.keys(loggedSets).filter(k => k.startsWith(`${exIndex}_`));
      keys.forEach((key, sIdx) => {
        const logged = loggedSets[key];
        if (logged.completed) {
          completedSets.push({
            exerciseId: ex.exerciseId,
            name: ex.name,
            weight: logged.weight,
            reps: logged.reps,
            volume: logged.weight * logged.reps
          });
          totalVolume += logged.weight * logged.reps;
        }
      });
    });

    if (completedSets.length === 0) {
      if (!confirm('No has marcado ninguna serie como completada. ¿Seguro que deseas salir sin guardar?')) {
        return;
      }
      setActiveSession(null);
      return;
    }

    try {
      // Save each exercise entry in progress history
      for (const item of completedSets) {
        const logEntry = {
          date: logDate,
          exerciseId: item.exerciseId,
          name: item.name,
          weight: item.weight,
          reps: item.reps,
          volume: item.volume,
          routineName: activeSession.name
        };

        if (isOffline) {
          await dbService.logProgress(user.uid, logEntry);
        } else {
          await addDoc(collection(db, 'users', user.uid, 'historial_progreso'), logEntry);
        }
      }

      alert('¡Entrenamiento guardado con éxito! Gran trabajo.');
      setActiveSession(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error al registrar el entrenamiento');
    }
  };

  // Get previous performance stats for an exercise
  const getPreviousPerformance = (exerciseId) => {
    const matches = history
      .filter(h => h.exerciseId === exerciseId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (matches.length === 0) return null;
    
    // Group duplicates or return the most recent date entries
    const latestDate = matches[0].date;
    const sameDayLogs = matches.filter(m => m.date === latestDate);
    
    return {
      date: latestDate,
      sets: sameDayLogs.map(s => ({ weight: s.weight, reps: s.reps }))
    };
  };

  // Filtering for exercises list inside routine creator (includes both default and custom exercises)
  const allExercises = [...customExercises, ...EXERCISES_DATABASE];

  const filteredExercises = allExercises.filter(ex => {
    const matchesCategory = selectedCategory === 'Todos' || ex.category === selectedCategory;
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-charcoal-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-t-accent-neon border-slate-800 rounded-full animate-spin" />
          <p className="text-slate-400 font-medium text-sm">Cargando rutinas...</p>
        </div>
      </div>
    );
  }

  // --- RENDERING ROUTINE CREATOR ---
  if (isCreating) {
    return (
      <div className="p-6 lg:p-8 space-y-6 bg-charcoal-900 min-h-[calc(100vh-80px)] text-slate-100 font-sans">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Creador de Rutina</h2>
            <p className="text-sm text-slate-400">Diseña tu plan de entrenamiento semanal</p>
          </div>
          <button 
            onClick={() => { setIsCreating(false); resetRoutineForm(); }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Cancelar</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left panel - Routine Form */}
          <div className="lg:col-span-3 space-y-6">
            <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre de Rutina</label>
                <input 
                  type="text"
                  placeholder="ej. Fuerza Superior A, Pierna Hipertrofia"
                  value={newRoutineName}
                  onChange={(e) => setNewRoutineName(e.target.value)}
                  className="block w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent-neon transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Días Sugeridos</label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map(day => {
                    const active = newRoutineDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          active 
                            ? 'bg-accent-neon text-black border-accent-neon' 
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Selected Exercises List */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ejercicios Seleccionados ({newRoutineExercises.length})</h3>
              
              {newRoutineExercises.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-slate-950/20 border border-dashed border-slate-850">
                  <Dumbbell className="w-10 h-10 text-slate-650 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm font-semibold">No has agregado ejercicios todavía</p>
                  <p className="text-slate-500 text-xs mt-1">Selecciona ejercicios del panel derecho para armar tu rutina.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {newRoutineExercises.map((formEx, index) => (
                    <div key={formEx.id} className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded uppercase tracking-wider">{formEx.category}</span>
                          <h4 className="text-base font-bold text-white mt-1">{formEx.name}</h4>
                        </div>
                        <button 
                          onClick={() => handleRemoveExerciseFromForm(formEx.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Sets parameters */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-3 text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
                          <span className="col-span-2">Serie</span>
                          <span className="col-span-5">Carga (kg)</span>
                          <span className="col-span-4">Reps</span>
                          <span className="col-span-1"></span>
                        </div>

                        {formEx.sets.map((set, setIndex) => (
                          <div key={setIndex} className="grid grid-cols-12 gap-3 items-center">
                            <span className="col-span-2 text-sm text-slate-400 font-bold pl-2">{setIndex + 1}</span>
                            <input 
                              type="number"
                              value={set.weight === 0 ? '' : set.weight}
                              placeholder="0"
                              onChange={(e) => handleSetChange(formEx.id, setIndex, 'weight', e.target.value)}
                              className="col-span-5 px-3 py-1.5 bg-slate-900 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:border-accent-neon"
                            />
                            <input 
                              type="number"
                              value={set.reps === 0 ? '' : set.reps}
                              placeholder="0"
                              onChange={(e) => handleSetChange(formEx.id, setIndex, 'reps', e.target.value)}
                              className="col-span-4 px-3 py-1.5 bg-slate-900 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:border-accent-neon"
                            />
                            <button 
                              onClick={() => handleRemoveSetFromFormEx(formEx.id, setIndex)}
                              className="col-span-1 text-slate-500 hover:text-red-450 flex justify-center"
                              disabled={formEx.sets.length <= 1}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        <button
                          onClick={() => handleAddSetToFormEx(formEx.id)}
                          className="mt-2 text-xs font-bold text-accent-neon hover:underline flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Agregar Serie</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {newRoutineExercises.length > 0 && (
              <button
                onClick={handleSaveRoutine}
                className="w-full py-4 bg-gradient-to-r from-accent-neon to-accent-cyan text-black font-extrabold rounded-2xl shadow-xl shadow-accent-neon/15 flex items-center justify-center gap-2 hover:opacity-95 transition-all"
              >
                <Check className="w-5 h-5" />
                <span>Guardar Rutina Completa</span>
              </button>
            )}
          </div>

          {/* Right panel - Exercises Selection Database */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur flex flex-col max-h-[700px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Base de Ejercicios</h3>
              <button 
                type="button"
                onClick={() => setShowAddCustomModal(true)}
                className="px-2 py-1 bg-accent-neon/10 hover:bg-accent-neon text-accent-neon hover:text-black rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all"
              >
                <Plus className="w-3 h-3" />
                <span>+ Crear</span>
              </button>
            </div>
            
            {/* Search Box */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Buscar ejercicio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-neon"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 custom-scrollbar shrink-0">
              <button
                onClick={() => setSelectedCategory('Todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border shrink-0 transition-colors ${
                  selectedCategory === 'Todos'
                    ? 'bg-accent-cyan text-black border-accent-cyan'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                Todos
              </button>
              {MUSCLE_GROUPS.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border shrink-0 transition-colors ${
                    selectedCategory === cat
                      ? 'bg-accent-cyan text-black border-accent-cyan'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
              {filteredExercises.map(ex => (
                <div key={ex.id} className="p-3 bg-slate-900/60 border border-slate-850 hover:border-slate-700 rounded-xl flex items-center justify-between gap-3 group transition-all">
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded uppercase tracking-wider">{ex.category}</span>
                    <h5 className="text-xs sm:text-sm font-bold text-white mt-1 truncate">{ex.name}</h5>
                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{ex.description}</p>
                  </div>
                  <button
                    onClick={() => handleAddExerciseToForm(ex)}
                    className="p-1.5 rounded-lg bg-accent-neon/10 text-accent-neon hover:bg-accent-neon hover:text-black transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {filteredExercises.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No se encontraron ejercicios.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Custom Exercise Modal Overlay */}
        {showAddCustomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-base font-black text-white flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-accent-neon" />
                  Crear Ejercicio Personalizado
                </h4>
                <button onClick={() => setShowAddCustomModal(false)} className="text-slate-550 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCustomExercise} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre del Ejercicio</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Sentadilla Hacka"
                    value={customExName}
                    onChange={(e) => setCustomExName(e.target.value)}
                    className="block w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-neon"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Grupo Muscular</label>
                  <select
                    value={customExCategory}
                    onChange={(e) => setCustomExCategory(e.target.value)}
                    className="block w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-neon"
                  >
                    {MUSCLE_GROUPS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Descripción / Técnica (Opcional)</label>
                  <textarea
                    placeholder="ej. Sentadilla en máquina para enfocar cuádriceps..."
                    value={customExDesc}
                    onChange={(e) => setCustomExDesc(e.target.value)}
                    rows={3}
                    className="block w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-neon"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-850">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomModal(false)}
                    className="px-4 py-2 bg-slate-850 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-accent-neon text-black font-extrabold rounded-xl text-xs shadow-lg shadow-accent-neon/10"
                  >
                    Guardar Ejercicio
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- RENDERING ACTIVE WORKOUT SESSION ---
  if (activeSession) {
    return (
      <div className="p-6 lg:p-8 space-y-6 bg-charcoal-900 min-h-[calc(100vh-80px)] text-slate-100 font-sans">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-accent-neon tracking-wide uppercase">
              <Clock className="w-4 h-4 animate-pulse" />
              <span>Entrenamiento en Curso</span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1">{activeSession.name}</h2>
          </div>
          <button 
            onClick={handleFinishWorkout}
            className="px-5 py-2.5 bg-accent-neon text-black font-extrabold rounded-xl shadow-lg shadow-accent-neon/10 hover:opacity-90 text-sm transition-all"
          >
            Finalizar Sesión
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Active Exercises List */}
          <div className="xl:col-span-2 space-y-5">
            {activeSession.exercises.map((ex, exIndex) => {
              const prevPerf = getPreviousPerformance(ex.exerciseId);
              
              return (
                <div key={exIndex} className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column - Exercise Details & Inputs */}
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <span className="text-[10px] font-bold text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded uppercase tracking-wider">{ex.category}</span>
                      <h4 className="text-lg font-black text-white mt-1.5">{ex.name}</h4>
                    </div>

                    <div className="space-y-3">
                      {/* Set header */}
                      <div className="grid grid-cols-12 gap-3 text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
                        <span className="col-span-2 text-center">Set</span>
                        <span className="col-span-4">Carga (kg)</span>
                        <span className="col-span-4">Reps</span>
                        <span className="col-span-2 text-center">Check</span>
                      </div>

                      {/* Active set forms */}
                      {Object.keys(loggedSets)
                        .filter(k => k.startsWith(`${exIndex}_`))
                        .map((key, sIdx) => {
                          const logged = loggedSets[key];
                          return (
                            <div 
                              key={key} 
                              className={`grid grid-cols-12 gap-3 items-center p-1.5 rounded-lg border transition-all ${
                                logged.completed 
                                  ? 'bg-accent-neon/5 border-accent-neon/30 text-accent-neon' 
                                  : 'bg-slate-900/60 border-slate-850'
                              }`}
                            >
                              <span className="col-span-2 text-center text-sm font-bold text-slate-400">{sIdx + 1}</span>
                              <input 
                                type="number"
                                disabled={logged.completed}
                                value={logged.weight === 0 ? '' : logged.weight}
                                placeholder="0"
                                onChange={(e) => handleActiveSetChange(exIndex, sIdx, 'weight', e.target.value)}
                                className="col-span-4 px-2 py-1 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-center text-white focus:outline-none focus:border-accent-neon"
                              />
                              <input 
                                type="number"
                                disabled={logged.completed}
                                value={logged.reps === 0 ? '' : logged.reps}
                                placeholder="0"
                                onChange={(e) => handleActiveSetChange(exIndex, sIdx, 'reps', e.target.value)}
                                className="col-span-4 px-2 py-1 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-center text-white focus:outline-none focus:border-accent-neon"
                              />
                              <button
                                onClick={() => handleToggleSetComplete(exIndex, sIdx)}
                                className={`col-span-2 py-1.5 rounded-lg border flex items-center justify-center transition-all ${
                                  logged.completed
                                    ? 'bg-accent-neon text-black border-accent-neon'
                                    : 'bg-slate-950/60 text-slate-500 border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                <Check className="w-4 h-4 stroke-[3]" />
                              </button>
                            </div>
                          );
                        })}
                      
                      <button
                        onClick={() => handleAddSetToActive(exIndex)}
                        className="text-xs font-bold text-accent-neon hover:underline flex items-center gap-1 mt-2 pl-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar Serie</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Column - Previous Performance Panel */}
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-850 flex flex-col justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                        <Info className="w-3.5 h-3.5 text-accent-cyan" />
                        Historial Reciente
                      </h5>
                      
                      {prevPerf ? (
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1 mb-2">
                            <span>Última Sesión:</span>
                            <span className="text-accent-cyan">{prevPerf.date}</span>
                          </p>
                          <div className="space-y-1.5">
                            {prevPerf.sets.map((set, sIdx) => (
                              <div key={sIdx} className="flex justify-between text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-850/30">
                                <span className="font-semibold text-slate-500">Serie {sIdx + 1}:</span>
                                <span className="font-bold text-slate-300">{set.weight} kg x {set.reps} reps</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-slate-500 text-xs">
                          Sin registros previos para este ejercicio.
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/40 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Progresión sugerida</span>
                      <span className="text-accent-neon font-bold">Sobrecarga Progresiva</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick info status block on side */}
          <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Detalles de Sesión</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Ejercicios:</span>
                <span className="font-bold text-white">{activeSession.exercises.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Series Guardadas:</span>
                <span className="font-bold text-accent-neon">
                  {Object.values(loggedSets).filter(s => s.completed).length} / {Object.keys(loggedSets).length}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl text-xs text-slate-400 leading-relaxed">
              <span className="font-bold text-white block mb-1">💡 Consejos de GymTrack Pro:</span>
              Marca el check verde cuando termines cada serie para registrar correctamente tu volumen de entrenamiento.
            </div>
            
            <button
              onClick={() => {
                if (confirm('¿Estás seguro de cancelar esta sesión de entrenamiento? No se guardará tu progreso.')) {
                  setActiveSession(null);
                }
              }}
              className="w-full py-2.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-400 font-bold rounded-xl text-xs sm:text-sm transition-all"
            >
              Cancelar Entrenamiento
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING ROUTINES LIST (DEFAULT STATE) ---
  return (
    <div className="p-6 lg:p-8 space-y-6 bg-charcoal-900 min-h-[calc(100vh-80px)] text-slate-100 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Rutinas de Entrenamiento</h2>
          <p className="text-sm text-slate-400">Organiza y entrena con planes personalizados</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-accent-neon text-black font-extrabold rounded-xl shadow-lg shadow-accent-neon/10 hover:opacity-90 text-xs sm:text-sm flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Crear Rutina</span>
        </button>
      </div>

      {routines.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-slate-950/20 border border-dashed border-slate-850 max-w-xl mx-auto mt-8">
          <Dumbbell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white">No tienes rutinas creadas</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            Las rutinas te permiten registrar de forma rápida tus series, repeticiones y cargas durante tus entrenamientos para analizar tu fuerza en tiempo real.
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="mt-6 px-5 py-2.5 bg-accent-neon text-black font-extrabold rounded-xl shadow-lg shadow-accent-neon/10 text-xs sm:text-sm transition-all"
          >
            Crear tu Primera Rutina
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routines.map((routine) => (
            <div 
              key={routine.id}
              className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur flex flex-col justify-between hover:border-slate-700 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-black text-white group-hover:text-accent-neon transition-colors">{routine.name}</h3>
                  <button 
                    onClick={() => handleDeleteRoutine(routine.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {routine.days.map(d => (
                    <span key={d} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-[10px] font-bold text-slate-400">{d}</span>
                  ))}
                </div>

                <div className="space-y-2 mb-6">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ejercicios ({routine.exercises.length})</p>
                  <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                    {routine.exercises.slice(0, 4).map((ex, idx) => (
                      <li key={idx} className="truncate">{ex.name}</li>
                    ))}
                    {routine.exercises.length > 4 && (
                      <li className="list-none text-[10px] text-accent-cyan font-bold italic mt-1">Y {routine.exercises.length - 4} ejercicios más...</li>
                    )}
                  </ul>
                </div>
              </div>

              <button
                onClick={() => handleStartWorkout(routine)}
                className="w-full py-3 bg-slate-900 hover:bg-accent-neon hover:text-black text-white font-extrabold rounded-xl border border-slate-800 hover:border-accent-neon shadow-lg flex items-center justify-center gap-2 transition-all duration-300"
              >
                <Play className="w-3.5 h-3.5 fill-current stroke-none" />
                <span>Comenzar Entrenamiento</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Custom Exercise Modal Overlay */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-black text-white flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-accent-neon" />
                Crear Ejercicio Personalizado
              </h4>
              <button onClick={() => setShowAddCustomModal(false)} className="text-slate-550 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomExercise} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre del Ejercicio</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Sentadilla Hacka"
                  value={customExName}
                  onChange={(e) => setCustomExName(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-neon"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Grupo Muscular</label>
                <select
                  value={customExCategory}
                  onChange={(e) => setCustomExCategory(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-neon"
                >
                  {MUSCLE_GROUPS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Descripción / Técnica (Opcional)</label>
                <textarea
                  placeholder="ej. Sentadilla en máquina para enfocar cuádriceps..."
                  value={customExDesc}
                  onChange={(e) => setCustomExDesc(e.target.value)}
                  rows={3}
                  className="block w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-neon"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-4 py-2 bg-slate-850 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent-neon text-black font-extrabold rounded-xl text-xs shadow-lg shadow-accent-neon/10"
                >
                  Guardar Ejercicio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workouts;
