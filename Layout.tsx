import React from 'react';
import { Shield, Menu, X, Bell, User } from 'lucide-react';
import { Role } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentRole: Role;
  onSwitchRole: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentRole, onSwitchRole }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-900 text-white shadow-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={onSwitchRole}>
                <Shield className="h-8 w-8 text-cyan-400" />
                <span className="ml-3 text-xl font-bold tracking-wider">AI-FIR <span className="text-cyan-400">VISION</span></span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-6">
              {currentRole !== Role.NONE && (
                <>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 uppercase tracking-widest text-slate-400">
                    {currentRole === Role.POLICE ? 'Officer Dashboard' : 'Citizen Portal'}
                  </span>
                  <button className="p-2 rounded-full hover:bg-slate-800 transition-colors">
                    <Bell className="h-5 w-5 text-slate-400" />
                  </button>
                  <button className="flex items-center space-x-2 p-2 rounded-full hover:bg-slate-800 transition-colors" onClick={onSwitchRole}>
                    <div className="h-8 w-8 rounded-full bg-cyan-600 flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
