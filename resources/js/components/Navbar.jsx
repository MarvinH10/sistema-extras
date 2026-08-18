import React from 'react';
import { Clock, Calendar, Users, Layers, Calculator, FileSpreadsheet, Sparkles, LogOut, User as UserIcon } from 'lucide-react';
import { logout } from '../services/api';

export default function Navbar({ activeTab, setActiveTab, currentUser, onLogout }) {
  const navItems = [
    { id: 'diaria', label: 'Planilla Diaria', icon: Calendar, desc: 'Captura por área' },
    { id: 'matriz', label: 'Matriz Mensual', icon: FileSpreadsheet, desc: 'Excel 1-31 días' },
    { id: 'empleados', label: 'Personal', icon: Users, desc: 'Gestión de empleados' },
    { id: 'areas', label: 'Áreas y Turnos', icon: Layers, desc: 'Estructura organizacional' },
    { id: 'calculadora', label: 'Simulador', icon: Calculator, desc: 'Probar reglas en vivo' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignorar
    } finally {
      localStorage.removeItem('kdosh_auth_token');
      localStorage.removeItem('kdosh_user');
      localStorage.removeItem('kdosh_expires_at');
      if (onLogout) onLogout();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 shadow-lg">
      <div className="max-w-[1780px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">K-Extras</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <Sparkles size={10} /> Minutos
                </span>
              </div>
              <p className="text-xs text-slate-400">Control de Horas Extra y Tardanzas</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ' + (
                    isActive
                      ? 'bg-linear-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  )}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Info & Logout Button */}
          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-sm ring-1 ring-indigo-400/40">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <UserIcon size={14} />}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-bold text-slate-200 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight font-mono">
                    {currentUser.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Cerrar Sesión"
                  className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/40 transition cursor-pointer"
                >
                  <LogOut size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
