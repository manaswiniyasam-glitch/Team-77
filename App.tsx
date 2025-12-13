import React, { useState } from 'react';
import Layout from './components/Layout';
import RoleSelection from './components/RoleSelection';
import CitizenDashboard from './components/CitizenDashboard';
import PoliceDashboard from './components/PoliceDashboard';
import { Role, FIR, FIRStatus } from './types';

const MOCK_FIRS: FIR[] = [
  {
    id: 'FIR-2023-001',
    title: 'Mobile Phone Theft at Central Station',
    description: 'I was waiting for the 5:30 PM train at platform 4. A man in a blue hoodie bumped into me and ran away. I realized my iPhone 13 Pro was missing from my jacket pocket immediately after.',
    dateOfIncident: '2023-10-15 17:30',
    location: 'Central Railway Station, Platform 4',
    status: FIRStatus.SUBMITTED,
    evidence: [],
    complainantName: 'John Doe',
    createdAt: '2023-10-15T18:00:00Z'
  },
  {
    id: 'FIR-2023-002',
    title: 'Vandalism of Shop Window',
    description: 'When I arrived at my shop "Tech World" this morning at 9 AM, I found the front glass window shattered. There is a brick inside with a threatening note attached.',
    dateOfIncident: '2023-10-16 02:00',
    location: '42 Market Street',
    status: FIRStatus.UNDER_INVESTIGATION,
    evidence: [],
    complainantName: 'Sarah Smith',
    createdAt: '2023-10-16T09:15:00Z'
  }
];

const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<Role>(Role.NONE);
  const [firs, setFirs] = useState<FIR[]>(MOCK_FIRS);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  const handleRoleSelect = (role: Role) => {
    setCurrentRole(role);
  };

  const handleSubmitFIR = (newFIR: FIR) => {
    setFirs(prev => [newFIR, ...prev]);
    setNotification({ message: 'FIR Submitted Successfully! Ref ID: ' + newFIR.id, type: 'success' });
    setTimeout(() => setNotification(null), 3000);
    // Optionally redirect or reset
  };

  return (
    <Layout currentRole={currentRole} onSwitchRole={() => setCurrentRole(Role.NONE)}>
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-24 right-4 z-50 animate-in fade-in slide-in-from-right-10 duration-300">
          <div className="bg-slate-800 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center border-l-4 border-green-500">
             <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {currentRole === Role.NONE && (
        <RoleSelection onSelectRole={handleRoleSelect} />
      )}

      {currentRole === Role.CITIZEN && (
        <CitizenDashboard 
          onSubmitFIR={handleSubmitFIR} 
          onBack={() => setCurrentRole(Role.NONE)}
        />
      )}

      {currentRole === Role.POLICE && (
        <PoliceDashboard 
          firs={firs} 
          onBack={() => setCurrentRole(Role.NONE)}
        />
      )}
    </Layout>
  );
};

export default App;