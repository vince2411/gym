import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Calendar, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ toggleSidebar }) => {
  const { user } = useAuth();
  const location = useLocation();

  // Function to compute title and breadcrumbs based on route path
  const getRouteDetails = () => {
    const path = location.pathname;
    switch (path) {
      case '/':
        return { title: 'Dashboard', category: 'General' };
      case '/workouts':
        return { title: 'Mis Rutinas', category: 'Entrenamiento' };
      case '/progress':
        return { title: 'Progreso y Estadísticas', category: 'Analítica' };
      case '/ai-coach':
        return { title: 'AI Coach', category: 'Recomendaciones' };
      case '/profile':
        return { title: 'Mi Perfil', category: 'Ajustes' };
      default:
        return { title: 'GymTrack Pro', category: 'Aplicación' };
    }
  };

  const { title, category } = getRouteDetails();

  const formattedDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="h-20 px-6 lg:px-8 border-b border-slate-800/40 bg-charcoal-950/80 backdrop-blur flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {/* Toggle Button for mobile */}
        <button 
          onClick={toggleSidebar}
          className="p-2 -ml-2 rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white lg:hidden transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Page Title & Breadcrumbs */}
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 tracking-wide uppercase">
            <span>{category}</span>
            <span>/</span>
            <span className="text-accent-neon font-bold">{title}</span>
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight mt-0.5">{title}</h1>
        </div>
        <div className="sm:hidden">
          <h1 className="text-base font-bold text-white tracking-tight">{title}</h1>
        </div>
      </div>

      {/* Right Side Info */}
      <div className="flex items-center gap-4 lg:gap-6">
        {/* Date Display */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800/20 text-xs font-medium text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-accent-cyan" />
          <span>{formattedDate}</span>
        </div>

        {/* User Quick Info */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white leading-tight">{user?.displayName || 'Usuario'}</p>
            <p className="text-[10px] text-accent-neon font-medium leading-none mt-0.5">Socio Premium</p>
          </div>
          
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-neon to-accent-cyan p-0.5 shadow-lg shadow-accent-neon/5">
            <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center text-white text-xs font-bold">
              {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : <User className="w-4 h-4 text-slate-400" />}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
