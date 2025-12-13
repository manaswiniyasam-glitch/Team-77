import React from 'react';
import { User, ShieldAlert, ArrowRight } from 'lucide-react';
import { Role } from '../types';

interface RoleSelectionProps {
  onSelectRole: (role: Role) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelectRole }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-12 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-4 max-w-2xl">
        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">
          Modernizing Justice with <span className="text-cyan-600">AI</span>
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          AI-FIR Vision bridges the gap between citizens and law enforcement. 
          File accurate reports instantly or analyze cases with advanced intelligence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Citizen Card */}
        <button 
          onClick={() => onSelectRole(Role.CITIZEN)}
          className="group relative flex flex-col items-center p-8 bg-white rounded-2xl shadow-xl border border-slate-100 hover:border-cyan-500 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-cyan-50 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="bg-cyan-100 p-4 rounded-full mb-6 group-hover:bg-cyan-600 transition-colors duration-300">
            <User className="h-10 w-10 text-cyan-700 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Citizen Portal</h3>
          <p className="text-slate-500 text-center mb-6">
            File an FIR quickly with the help of our AI Assistant. Guided, simple, and secure.
          </p>
          <div className="mt-auto flex items-center text-cyan-600 font-semibold group-hover:translate-x-2 transition-transform">
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </div>
        </button>

        {/* Police Card */}
        <button 
          onClick={() => onSelectRole(Role.POLICE)}
          className="group relative flex flex-col items-center p-8 bg-slate-900 rounded-2xl shadow-xl border border-slate-800 hover:border-indigo-500 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-indigo-900/30 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="bg-slate-800 p-4 rounded-full mb-6 group-hover:bg-indigo-600 transition-colors duration-300">
            <ShieldAlert className="h-10 w-10 text-indigo-400 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Police Dashboard</h3>
          <p className="text-slate-400 text-center mb-6">
            Access advanced analytics, automated case summaries, and investigation insights.
          </p>
          <div className="mt-auto flex items-center text-indigo-400 font-semibold group-hover:translate-x-2 transition-transform">
            Access Dashboard <ArrowRight className="ml-2 h-4 w-4" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default RoleSelection;
