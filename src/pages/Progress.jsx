import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { EXERCISES_DATABASE } from '../data/exercises';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  Award, 
  Percent, 
  Calendar,
  Dumbbell,
  ShieldAlert
} from 'lucide-react';

const Progress = () => {
  const { user, isOffline, dbService } = useAuth();
  
  const [history, setHistory] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selected exercise for volume trend
  const [selectedExId, setSelectedExId] = useState('press-banca');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        if (isOffline) {
          const h = await dbService.getProgressHistory(user.uid);
          const r = await dbService.getRoutines(user.uid);
          setHistory(h);
          setRoutines(r);
        } else {
          const hSnap = await getDocs(collection(db, 'users', user.uid, 'historial_progreso'));
          setHistory(hSnap.docs.map(doc => doc.data()));
          
          const rSnap = await getDocs(collection(db, 'users', user.uid, 'rutinas'));
          setRoutines(rSnap.docs.map(doc => doc.data()));
        }
      } catch (err) {
        console.error('Error fetching progress logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isOffline]);

  // 1. Get unique exercises that have been logged
  const loggedExerciseIds = [...new Set(history.map(item => item.exerciseId))];
  const loggedExercises = EXERCISES_DATABASE.filter(ex => loggedExerciseIds.includes(ex.id));

  // 2. Prepare Line Chart Data for the selected exercise
  const getLineChartData = () => {
    const exerciseLogs = history
      .filter(item => item.exerciseId === selectedExId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group logs by date to compute daily volume
    const dailyVolume = {};
    exerciseLogs.forEach(log => {
      const dateStr = log.date;
      if (!dailyVolume[dateStr]) {
        dailyVolume[dateStr] = {
          date: dateStr,
          Volume: 0,
          MaxWeight: 0
        };
      }
      // volume = weight * reps
      dailyVolume[dateStr].Volume += (log.weight * log.reps);
      if (log.weight > dailyVolume[dateStr].MaxWeight) {
        dailyVolume[dateStr].MaxWeight = log.weight;
      }
    });

    return Object.values(dailyVolume);
  };

  const chartData = getLineChartData();

  // 3. Compute stats for selected exercise
  const getExerciseStats = () => {
    if (chartData.length === 0) return { maxWeight: 0, maxVolume: 0, gainPercent: 0 };
    
    const volumes = chartData.map(d => d.Volume);
    const weights = chartData.map(d => d.MaxWeight);
    const maxVolume = Math.max(...volumes);
    const maxWeight = Math.max(...weights);

    // Calculate strength gain percentage (from first session max weight to latest max weight)
    const firstWeight = chartData[0].MaxWeight;
    const latestWeight = chartData[chartData.length - 1].MaxWeight;
    const gainPercent = firstWeight > 0 ? ((latestWeight - firstWeight) / firstWeight) * 100 : 0;

    return {
      maxWeight,
      maxVolume,
      gainPercent: gainPercent.toFixed(1)
    };
  };

  const { maxWeight, maxVolume, gainPercent } = getExerciseStats();

  // 4. Prepare Radar Chart Data (Muscle group distribution in routines)
  const getRadarData = () => {
    const counts = {};
    
    // Count exercises by category
    routines.forEach(r => {
      if (r.exercises) {
        r.exercises.forEach(ex => {
          counts[ex.category] = (counts[ex.category] || 0) + 1;
        });
      }
    });

    // Default categories if empty
    const categories = ['Pecho', 'Espalda', 'Tríceps', 'Hombro', 'Bíceps', 'Cuádriceps', 'Femorales', 'Abdominales'];
    
    return categories.map(cat => ({
      subject: cat,
      Carga: counts[cat] || 0,
      fullMark: 5
    }));
  };

  const radarData = getRadarData();

  // 5. Prepare Consistency Pie Chart Data (Trained vs Planned Days)
  const getPieData = () => {
    const uniqueDates = [...new Set(history.map(item => item.date))];
    const daysTrained = uniqueDates.length;
    const targetDays = 12; // meta: 12 entrenamientos sugeridos en 3 semanas
    const daysMissed = Math.max(0, targetDays - daysTrained);

    return [
      { name: 'Días Entrenados', value: daysTrained },
      { name: 'Días Faltantes', value: daysTrained === 0 ? 12 : daysMissed }
    ];
  };

  const pieData = getPieData();
  const PIE_COLORS = ['#a3e635', '#1e293b'];

  const selectedExerciseDetails = EXERCISES_DATABASE.find(ex => ex.id === selectedExId) || EXERCISES_DATABASE[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-charcoal-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-t-accent-neon border-slate-800 rounded-full animate-spin" />
          <p className="text-slate-400 font-medium text-sm">Cargando tus estadísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 bg-charcoal-900 min-h-[calc(100vh-80px)] text-slate-100 font-sans">
      
      {/* Top Selector Grid */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Seguimiento de Progreso</h2>
          <p className="text-sm text-slate-400">Visualiza tu crecimiento de fuerza y volumen acumulado</p>
        </div>
        
        {/* Exercise selector dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">Filtrar Ejercicio:</label>
          <select
            value={selectedExId}
            onChange={(e) => setSelectedExId(e.target.value)}
            className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-accent-neon transition-all"
          >
            {loggedExercises.length > 0 ? (
              loggedExercises.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))
            ) : (
              EXERCISES_DATABASE.slice(0, 5).map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name} (Sin Logs)</option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* 1. Volume over time chart (Line Chart) */}
        <div className="xl:col-span-2 p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur space-y-4">
          <div>
            <span className="text-[10px] font-bold text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded uppercase tracking-wider">
              {selectedExerciseDetails.category}
            </span>
            <h3 className="text-lg font-black text-white mt-1.5">Volumen Semanal: {selectedExerciseDetails.name}</h3>
            <p className="text-xs text-slate-400">Total de kilos levantados (Carga x Repeticiones) por sesión de entrenamiento.</p>
          </div>

          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '10px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    itemStyle={{ color: '#a3e635' }}
                  />
                  <Line type="monotone" dataKey="Volume" name="Volumen Total (kg)" stroke="#a3e635" strokeWidth={3} dot={{ fill: '#a3e635', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl p-6 text-center">
                <Dumbbell className="w-10 h-10 text-slate-650 mb-2" />
                <p className="text-xs text-slate-400 font-bold">No hay logs registrados para este ejercicio.</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Realiza un entrenamiento en "Mis Rutinas" y marca series completadas.</p>
              </div>
            )}
          </div>
        </div>

        {/* 2. Stats summary cards for the selected exercise */}
        <div className="flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur flex items-center gap-4 flex-1">
            <div className="p-3.5 rounded-xl bg-accent-neon/10 text-accent-neon shrink-0">
              <Award className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Carga Máxima Lograda</p>
              <h4 className="text-2xl font-black text-white mt-0.5">{maxWeight} <span className="text-xs font-medium text-slate-400">kg</span></h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Récord personal absoluto en una repetición.</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur flex items-center gap-4 flex-1">
            <div className="p-3.5 rounded-xl bg-accent-cyan/10 text-accent-cyan shrink-0">
              <Percent className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ganancia de Fuerza Estimada</p>
              <h4 className="text-2xl font-black text-white mt-0.5">
                {parseFloat(gainPercent) > 0 ? `+${gainPercent}%` : '0.0%'}
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Incremento porcentual de carga desde la primera sesión.</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur flex items-center gap-4 flex-1">
            <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
              <TrendingUp className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Volumen Máximo por Sesión</p>
              <h4 className="text-2xl font-black text-white mt-0.5">{maxVolume.toLocaleString('es-ES')} <span className="text-xs font-medium text-slate-400">kg</span></h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Mayor volumen levantado en una sola sesión.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Row Charts: Radar + Pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Radar Chart: Muscle group balance */}
        <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur space-y-4">
          <div>
            <h3 className="text-base font-bold text-white uppercase tracking-wider">Balance Muscular (Distribución)</h3>
            <p className="text-xs text-slate-400">Cantidad de ejercicios por grupo muscular en tus rutinas actuales.</p>
          </div>

          <div className="h-60 w-full flex justify-center items-center">
            {routines.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={10} />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="#475569" fontSize={8} />
                  <Radar name="Ejercicios" dataKey="Carga" stroke="#a3e635" fill="#a3e635" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-500 text-xs py-8">
                Crea rutinas para analizar el balance muscular.
              </div>
            )}
          </div>
        </div>

        {/* Pie Chart: Workout Consistency */}
        <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur space-y-4">
          <div>
            <h3 className="text-base font-bold text-white uppercase tracking-wider">Regularidad de Entrenamientos</h3>
            <p className="text-xs text-slate-400">Días entrenados contra la meta programada de entrenamientos.</p>
          </div>

          <div className="h-60 w-full flex justify-center items-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '10px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
            {/* Center percentage label */}
            <div className="absolute top-[42%] left-[49%] transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-2xl font-black text-white block">
                {Math.round((pieData[0].value / (pieData[0].value + pieData[1].value)) * 100)}%
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Completado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Progress;
