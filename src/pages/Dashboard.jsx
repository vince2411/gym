import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  Trophy, 
  Flame, 
  Activity, 
  TrendingUp, 
  Play, 
  Calendar,
  Dumbbell,
  Brain
} from 'lucide-react';

const Dashboard = () => {
  const { user, isOffline, dbService } = useAuth();
  const navigate = useNavigate();
  
  const [routines, setRoutines] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        if (isOffline) {
          // Fetch from localStorage mock helpers
          const r = await dbService.getRoutines(user.uid);
          const h = await dbService.getProgressHistory(user.uid);
          setRoutines(r);
          setHistory(h);
        } else {
          // Fetch from Firestore
          const rSnap = await getDocs(collection(db, 'users', user.uid, 'rutinas'));
          const rList = rSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          const hSnap = await getDocs(
            query(collection(db, 'users', user.uid, 'historial_progreso'), orderBy('date', 'desc'))
          );
          const hList = hSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          setRoutines(rList);
          setHistory(hList);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isOffline]);

  // Aggregate stats dynamically based on actual logs
  const totalVolume = history.reduce((sum, item) => sum + (item.volume || 0), 0);
  
  // PRs counted as unique exercises logged successfully
  const prsCount = new Set(history.map(item => item.exerciseId)).size;

  // Active streak calculated from history logs
  const getActiveStreak = () => {
    if (history.length === 0) return 0;
    const uniqueDates = [...new Set(history.map(item => item.date))].sort((a, b) => new Date(b) - new Date(a));
    if (uniqueDates.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const latestDate = new Date(uniqueDates[0]);
    latestDate.setHours(0, 0, 0, 0);

    const oneDayMs = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((today - latestDate) / oneDayMs);

    // If latest log is older than 1 day (today or yesterday), streak is 0
    if (diffDays > 1) return 0;

    streak = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const d1 = new Date(uniqueDates[i]);
      const d2 = new Date(uniqueDates[i + 1]);
      const diff = Math.round((d1 - d2) / oneDayMs);
      if (diff === 1) {
        streak++;
      } else if (diff > 1) {
        break;
      }
    }
    return streak;
  };
  
  const activeStreak = getActiveStreak();

  // Bar Chart Data (Quick Progress Snap: sessions per month) - Dynamic
  const getMonthlyData = () => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const counts = { Ene: 0, Feb: 0, Mar: 0, Abr: 0, May: 0, Jun: 0 };
    history.forEach(log => {
      const logDate = new Date(log.date);
      const logMonth = logDate.getMonth();
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const name = monthNames[logMonth];
      if (counts[name] !== undefined) {
        counts[name]++;
      }
    });
    return months.map(m => ({ name: m, Sesiones: counts[m] }));
  };
  
  const monthlyData = getMonthlyData();

  // Line Chart Data (Weekly Attendance) - Dynamic
  const getWeeklyAttendanceData = () => {
    const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const counts = { Dom: 0, Lun: 0, Mar: 0, Mie: 0, Jue: 0, Vie: 0, Sab: 0 };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    history.forEach(log => {
      const logDate = new Date(log.date);
      if (logDate >= oneWeekAgo) {
        const dayName = days[logDate.getDay()];
        counts[dayName] = (counts[dayName] || 0) + (log.volume || 0);
      }
    });

    return days.map(d => ({ day: d, Nivel: counts[d] }));
  };
  
  const attendanceData = getWeeklyAttendanceData();

  // Pick today's routine or fallback
  const getTodayRoutine = () => {
    if (routines.length === 0) return null;
    return routines[0];
  };

  const todayRoutine = getTodayRoutine();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-charcoal-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-t-accent-neon border-slate-800 rounded-full animate-spin" />
          <p className="text-slate-400 font-medium text-sm">Cargando tu panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 bg-charcoal-900 min-h-[calc(100vh-80px)] text-slate-100 font-sans">
      {/* Welcome Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ¡Hola de nuevo, {user?.displayName || 'Campeón'}!
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Listo para el entrenamiento de hoy. Vamos a superar tus marcas.
          </p>
        </div>
      </div>

      {/* Profile completion notice */}
      {(!user?.height || !user?.weight) && (
        <div className="p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-500/10 text-yellow-400 rounded-xl mt-0.5 sm:mt-0">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Completa tus datos de progresión</h4>
              <p className="text-xs text-slate-450 mt-0.5">Ingresa tu estatura, peso y objetivo fitness en tu Perfil para activar tu plan de progresión por IA en el dashboard.</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/profile')} 
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold rounded-xl text-xs transition-colors self-end sm:self-center shrink-0 cursor-pointer"
          >
            Configurar Perfil
          </button>
        </div>
      )}

      {/* AI Fitness Advice Card */}
      {user?.height && user?.weight && (
        <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-accent-neon uppercase tracking-wider">
            <Brain className="w-4 h-4" />
            <span>Plan de Progresión Personalizado (AI Coach)</span>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-400 font-bold border-b border-slate-800/40 pb-3">
              <span className="bg-slate-900 px-2.5 py-1 rounded-lg">Estatura: {user.height} cm</span>
              <span className="bg-slate-900 px-2.5 py-1 rounded-lg">Peso: {user.weight} kg</span>
              <span className="bg-slate-900 px-2.5 py-1 rounded-lg">Edad: {user.age} años</span>
              <span className="bg-accent-neon/10 text-accent-neon border border-accent-neon/20 px-2.5 py-1 rounded-lg">
                Objetivo: {user.goal || 'General'}
              </span>
            </div>
            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium whitespace-pre-line pt-1">
              {user.aiAdvice ? (
                user.aiAdvice
              ) : (
                <span className="italic text-slate-500">
                  Por favor, ve al Perfil y guarda tus cambios para generar las sugerencias de progresión por la IA.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Stat Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-accent-neon/10 text-accent-neon">
            <Flame className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Racha Activa</p>
            <h4 className="text-2xl font-black text-white mt-0.5">{activeStreak} <span className="text-xs font-medium text-slate-400">días seguidos</span></h4>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-accent-cyan/10 text-accent-cyan">
            <Trophy className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Récords Personales (PR)</p>
            <h4 className="text-2xl font-black text-white mt-0.5">{prsCount} <span className="text-xs font-medium text-slate-400">logrados</span></h4>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Activity className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Volumen Acumulado</p>
            <h4 className="text-2xl font-black text-white mt-0.5">
              {totalVolume.toLocaleString('es-ES')} <span className="text-xs font-medium text-slate-400">kg total</span>
            </h4>
          </div>
        </div>
      </div>

      {/* Main Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Workout Scheduler Panel */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur flex flex-col justify-between relative overflow-hidden group min-h-[220px]">
          {/* Decorative neon slash block */}
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-accent-neon transform skew-x-12 translate-x-8 opacity-20 lg:opacity-100 group-hover:scale-105 transition-transform duration-500" />
          
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 tracking-wide uppercase">
              <Calendar className="w-4 h-4 text-accent-neon" />
              <span>Entrenamiento Programado</span>
            </div>
            
            {todayRoutine ? (
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{todayRoutine.name}</h3>
                <p className="text-sm text-slate-400 mt-1.5 flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-accent-cyan" />
                  {todayRoutine.exercises ? todayRoutine.exercises.length : 0} Ejercicios vinculados • Días: {todayRoutine.days.join(', ')}
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Sin Rutinas Activas</h3>
                <p className="text-sm text-slate-400 mt-1">Crea una rutina personalizada para comenzar a medir tu progreso.</p>
              </div>
            )}
          </div>

          <div className="relative z-10 mt-6">
            <button
              onClick={() => navigate('/workouts')}
              className="px-6 py-3 bg-accent-neon hover:bg-accent-neon/90 text-black font-extrabold rounded-xl shadow-lg shadow-accent-neon/15 flex items-center gap-2.5 transition-all duration-300"
            >
              <Play className="w-4 h-4 fill-black stroke-none" />
              <span>{todayRoutine ? 'Comenzar Entrenamiento' : 'Configurar Rutinas'}</span>
            </button>
          </div>
        </div>

        {/* Quick Progress Snap Chart */}
        <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent-cyan" />
                Progreso Rápido (Historial)
              </h4>
            </div>
            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '10px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    itemStyle={{ color: '#a3e635' }}
                  />
                  <Bar dataKey="Sesiones" fill="#a3e635" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Attendance Line Chart Card */}
      <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 backdrop-blur space-y-4">
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent-neon" />
            Asistencia Semanal (Intensidad / Volumen)
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">Volumen y regularidad estimados por día entrenado.</p>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={attendanceData}>
              <defs>
                <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a3e635" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#a3e635" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '10px' }}
                labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                itemStyle={{ color: '#a3e635' }}
              />
              <Area type="monotone" dataKey="Nivel" stroke="#a3e635" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLevel)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
