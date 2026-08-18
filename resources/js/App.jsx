import React, { useState } from 'react';
import Navbar from './components/Navbar';
import CapturaDiariaView from './views/CapturaDiariaView';
import MatrizMensualView from './views/MatrizMensualView';
import EmpleadosView from './views/EmpleadosView';
import AreasTurnosView from './views/AreasTurnosView';
import CalculadoraRapidaView from './views/CalculadoraRapidaView';

export default function App() {
  const [activeTab, setActiveTab] = useState('diaria');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-x-hidden flex flex-col">
      {/* Background glowing gradients */}
      <div className="absolute top-0 left-1/4 w-125 h-125 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-125 h-125 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-112.5 h-112.5 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area - Wide & Responsive */}
      <main className="flex-1 max-w-[1780px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-5 pb-12 relative z-10">
        {activeTab === 'diaria' && (
          <CapturaDiariaView onNavigateToMatriz={() => setActiveTab('matriz')} />
        )}
        {activeTab === 'matriz' && (
          <MatrizMensualView />
        )}
        {activeTab === 'empleados' && (
          <EmpleadosView />
        )}
        {activeTab === 'areas' && (
          <AreasTurnosView />
        )}
        {activeTab === 'calculadora' && (
          <CalculadoraRapidaView />
        )}
      </main>
    </div>
  );
}
