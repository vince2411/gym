import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Dumbbell, 
  TrendingUp, 
  Sparkles, 
  User, 
  LogOut,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { logout, user, isOffline } = useAuth();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Mis Rutinas', path: '/workouts', icon: Dumbbell },
    { name: 'Progreso', path: '/progress', icon: TrendingUp },
    { name: 'AI Coach', path: '/ai-coach', icon: Sparkles },
    { name: 'Perfil', path: '/profile', icon: User }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={toggleSidebar}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 
        bg-charcoal-950 border-r border-slate-800/40 text-slate-300
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:h-screen
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-slate-800/40 bg-charcoal-950/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-accent-neon to-accent-cyan rounded-xl shadow-lg shadow-accent-neon/10">
              <Dumbbell className="w-6 h-6 text-black stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">GymTrack<span className="text-accent-neon font-extrabold">Pro</span></span>
            </div>
          </div>
          
          {/* Close button on mobile */}
          <button 
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) toggleSidebar();
              }}
              className={({ isActive }) => `
                flex items-center justify-between px-4 py-3.5 rounded-xl font-medium text-sm
                transition-all duration-300 group
                ${isActive 
                  ? 'bg-slate-800/40 text-accent-neon border-l-4 border-accent-neon shadow-inner shadow-accent-neon/5' 
                  : 'hover:bg-slate-900 hover:text-white'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3.5">
                    <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-accent-neon' : 'text-slate-400 group-hover:text-white'}`} />
                    <span>{item.name}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform duration-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 ${isActive ? 'text-accent-neon opacity-100' : 'text-slate-500'}`} />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Offline Badge */}
        {isOffline && (
          <div className="mx-4 my-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-center">
            <span className="text-xs font-semibold text-yellow-400 tracking-wider uppercase block">Modo Offline / Demo</span>
            <span className="text-[10px] text-yellow-500/80 block mt-0.5">Usando Almacenamiento Local</span>
          </div>
        )}

        {/* User Profile Card & Sign Out */}
        <div className="p-4 border-t border-slate-800/40 bg-slate-950/40">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800/20 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-800 text-accent-neon font-bold text-sm">
              {user?.displayName ? user.displayName.slice(0,2).toUpperCase() : 'GP'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.displayName || 'Usuario'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-semibold text-sm transition-all duration-300"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
