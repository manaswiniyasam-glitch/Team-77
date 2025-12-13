import React, { useState } from 'react';
import { Search, BarChart3, AlertTriangle, FileCheck, Map, BrainCircuit, X, ChevronRight, Fingerprint, Video, Network, Siren, UserX, Clock, Link as LinkIcon, ShieldAlert, ArrowLeft } from 'lucide-react';
import { FIR, FIRStatus, AIAnalysis } from '../types';
import { analyzeFIR, runDeepInvestigation } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PoliceDashboardProps {
  firs: FIR[];
  onBack: () => void;
}

type Tab = 'overview' | 'suspects' | 'timeline' | 'similar' | 'intel';

const PoliceDashboard: React.FC<PoliceDashboardProps> = ({ firs, onBack }) => {
  const [selectedFIR, setSelectedFIR] = useState<FIR | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const stats = {
    total: firs.length,
    pending: firs.filter(f => f.status === FIRStatus.SUBMITTED).length,
    investigating: firs.filter(f => f.status === FIRStatus.UNDER_INVESTIGATION).length,
    closed: firs.filter(f => f.status === FIRStatus.CLOSED).length
  };

  const chartData = [
    { name: 'Submitted', value: stats.pending, color: '#f59e0b' },
    { name: 'Active', value: stats.investigating, color: '#3b82f6' },
    { name: 'Closed', value: stats.closed, color: '#10b981' },
  ];

  const handleRunAnalysis = async (fir: FIR) => {
    setIsAnalyzing(true);
    // Concurrent analysis for speed
    const [basicAnalysis, investigationReport] = await Promise.all([
      analyzeFIR(fir),
      runDeepInvestigation(fir, firs)
    ]);
    
    const updatedFIR = { 
      ...fir, 
      aiAnalysis: basicAnalysis, 
      investigationReport: investigationReport,
      status: FIRStatus.UNDER_INVESTIGATION 
    };
    setSelectedFIR(updatedFIR);
    setIsAnalyzing(false);
    setActiveTab('suspects'); // Auto-switch to show cool features
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in duration-500 min-h-screen bg-slate-50/50">
      
      <div>
        <button 
          onClick={onBack}
          className="inline-flex items-center text-slate-500 hover:text-slate-800 font-medium transition-colors mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Cases</p>
              <h3 className="text-3xl font-bold text-slate-900">{stats.total}</h3>
            </div>
            <div className="p-3 bg-slate-100 rounded-full">
              <FileCheck className="h-6 w-6 text-slate-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Review</p>
              <h3 className="text-3xl font-bold text-amber-500">{stats.pending}</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-full">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Active Investigations</p>
              <h3 className="text-3xl font-bold text-blue-500">{stats.investigating}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <Search className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-1">
           <p className="text-sm font-medium text-slate-500 mb-2">Case Status Distribution</p>
           <div className="h-16 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" hide />
                   <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                   <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={8}>
                     {chartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Case List - Narrower */}
        <div className="lg:col-span-4 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden max-h-[800px]">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-800">Recent FIRs</h3>
          </div>
          <div className="overflow-y-auto flex-1">
            {firs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No cases filed yet.</div>
            ) : (
              firs.map(fir => (
                <div 
                  key={fir.id}
                  onClick={() => {
                    setSelectedFIR(fir);
                    setActiveTab('overview');
                  }}
                  className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selectedFIR?.id === fir.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-slate-800 truncate pr-2 w-full">{fir.title}</span>
                  </div>
                   <div className="flex justify-between items-center mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide ${
                        fir.status === FIRStatus.SUBMITTED ? 'bg-amber-100 text-amber-700' :
                        fir.status === FIRStatus.UNDER_INVESTIGATION ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {fir.status}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(fir.createdAt).toLocaleDateString()}</span>
                   </div>
                  <div className="text-xs text-slate-500 flex items-center mt-2">
                    <Map className="h-3 w-3 mr-1" /> {fir.location}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Case Detail / AI Analysis - Wider */}
        <div className="lg:col-span-8 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col min-h-[800px]">
          {selectedFIR ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-slate-200 bg-slate-50">
                <div className="flex justify-between items-start mb-4">
                    <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">{selectedFIR.title}</h2>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <span className="px-2 py-0.5 bg-slate-200 rounded text-xs font-mono">{selectedFIR.id}</span>
                        <span>•</span>
                        <span>{selectedFIR.category || 'Unclassified'}</span>
                        <span>•</span>
                        <span>{selectedFIR.dateOfIncident}</span>
                    </div>
                    </div>
                    <button 
                    onClick={() => setSelectedFIR(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 lg:hidden"
                    >
                    <X className="h-5 w-5" />
                    </button>
                </div>

                {/* AI Action Bar */}
                <div className="flex items-center justify-between bg-indigo-900 p-4 rounded-xl text-white shadow-md">
                    <div className="flex items-center">
                        <Siren className="h-6 w-6 mr-3 text-red-400 animate-pulse" />
                        <div>
                            <h4 className="font-bold text-sm">AI Investigation Unit</h4>
                            <p className="text-xs text-indigo-300">
                                {selectedFIR.investigationReport ? 'Investigation Active' : 'Ready to analyze'}
                            </p>
                        </div>
                    </div>
                    {!selectedFIR.investigationReport && (
                        <button 
                            onClick={() => handleRunAnalysis(selectedFIR)}
                            disabled={isAnalyzing}
                            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center"
                        >
                            {isAnalyzing ? (
                                <>Analyzing <BrainCircuit className="ml-2 h-4 w-4 animate-spin" /></>
                            ) : (
                                <>Launch Investigation <BrainCircuit className="ml-2 h-4 w-4" /></>
                            )}
                        </button>
                    )}
                </div>

                {/* Tabs */}
                {selectedFIR.investigationReport && (
                    <div className="flex space-x-1 mt-6 border-b border-slate-200 overflow-x-auto">
                        {[
                            { id: 'overview', icon: FileCheck, label: 'Case Overview' },
                            { id: 'suspects', icon: Fingerprint, label: 'Suspect ID' },
                            { id: 'timeline', icon: Video, label: 'CCTV Timeline' },
                            { id: 'similar', icon: Network, label: 'Similar Cases' },
                            { id: 'intel', icon: ShieldAlert, label: 'Intel Hub' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                    activeTab === tab.id 
                                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <tab.icon className="h-4 w-4 mr-2" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                
                {/* 1. Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Incident Narrative</h4>
                            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedFIR.description}</p>
                        </div>
                        
                        {selectedFIR.aiAnalysis && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <h5 className="text-slate-500 text-xs font-bold uppercase mb-2">Severity Analysis</h5>
                                    <div className="flex items-center mb-4">
                                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${
                                                selectedFIR.aiAnalysis.severityScore > 7 ? 'bg-red-500' : 
                                                selectedFIR.aiAnalysis.severityScore > 4 ? 'bg-yellow-500' : 'bg-green-500'
                                                }`} 
                                                style={{ width: `${selectedFIR.aiAnalysis.severityScore * 10}%` }} 
                                            />
                                        </div>
                                        <span className="ml-3 font-bold text-lg">{selectedFIR.aiAnalysis.severityScore}/10</span>
                                    </div>
                                    <h5 className="text-slate-500 text-xs font-bold uppercase mb-2">Entities</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedFIR.aiAnalysis.extractedEntities.map((entity, i) => (
                                            <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200 font-medium">
                                            {entity}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <h5 className="text-slate-500 text-xs font-bold uppercase mb-2">Legal Sections</h5>
                                    <ul className="space-y-2">
                                        {selectedFIR.aiAnalysis.suggestedSections.map((section, i) => (
                                            <li key={i} className="flex items-start text-sm text-slate-700">
                                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                                            {section}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                             </div>
                        )}
                    </div>
                )}

                {/* 2. Suspects Tab */}
                {activeTab === 'suspects' && selectedFIR.investigationReport && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-lg text-slate-800">Automated Suspect Identification</h3>
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">
                                {selectedFIR.investigationReport.suspects.length} Potential Matches
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {selectedFIR.investigationReport.suspects.map((suspect, idx) => (
                                <div key={idx} className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 flex flex-col">
                                    <div className={`h-2 ${suspect.status === 'Identified' ? 'bg-red-500' : 'bg-amber-500'}`} />
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center">
                                                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mr-4">
                                                    <UserX className="h-6 w-6 text-slate-500" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-lg text-slate-900">{suspect.name}</h4>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                        suspect.status === 'Identified' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {suspect.status.toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-2xl font-bold text-slate-900">{suspect.confidence}%</span>
                                                <span className="text-xs text-slate-400">Match Confidence</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            {suspect.description}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 p-3 text-center border-t border-slate-100">
                                        <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                                            View Full Criminal Profile
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {selectedFIR.investigationReport.suspects.length === 0 && (
                                <div className="col-span-2 p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                                    <UserX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No direct suspects identified in database.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. CCTV Timeline Tab */}
                {activeTab === 'timeline' && selectedFIR.investigationReport && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center mb-6">
                            <div className="p-2 bg-red-100 rounded-lg mr-3">
                                <Video className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">AI CCTV Tracking</h3>
                                <p className="text-sm text-slate-500">Hypothetical movement reconstruction based on city grid</p>
                            </div>
                        </div>

                        <div className="relative border-l-2 border-indigo-200 ml-6 space-y-8 pb-8">
                            {selectedFIR.investigationReport.timeline.map((event, idx) => (
                                <div key={idx} className="relative pl-8">
                                    <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-indigo-600 ring-4 ring-indigo-100" />
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                                {event.time}
                                            </span>
                                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center">
                                                <Video className="h-3 w-3 mr-1" />
                                                {event.source}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 mb-1">{event.location}</h4>
                                        <p className="text-sm text-slate-600">{event.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. Similar Cases Tab */}
                {activeTab === 'similar' && selectedFIR.investigationReport && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                         <div className="flex items-center mb-4">
                            <Network className="h-5 w-5 mr-2 text-blue-500" />
                            <h3 className="font-bold text-lg text-slate-800">Linked Cases Pattern Analysis</h3>
                        </div>
                        {selectedFIR.investigationReport.similarCases.map((sim, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start">
                                <div className="mr-4 text-center min-w-[60px]">
                                    <div className="text-2xl font-bold text-blue-600">{sim.similarityScore}%</div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Similarity</div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center mb-1">
                                        <LinkIcon className="h-4 w-4 text-slate-400 mr-2" />
                                        <h4 className="font-bold text-slate-800">{sim.title}</h4>
                                        <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">{sim.firId}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 bg-blue-50/50 p-2 rounded-lg border border-blue-50">
                                        <span className="font-semibold text-blue-700">Pattern Match: </span>
                                        {sim.reason}
                                    </p>
                                </div>
                                <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                         {selectedFIR.investigationReport.similarCases.length === 0 && (
                            <div className="p-8 text-center text-slate-400">
                                No similar cases found in the registry.
                            </div>
                        )}
                    </div>
                )}

                {/* 5. Intel Hub Tab */}
                {activeTab === 'intel' && selectedFIR.investigationReport && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl p-6 text-white shadow-xl">
                            <h3 className="flex items-center font-bold text-xl mb-4">
                                <ShieldAlert className="h-6 w-6 mr-2 text-yellow-400" />
                                Evidence Intelligence Hub
                            </h3>
                            
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">Detected Contradictions</h4>
                                    <div className="space-y-2">
                                        {selectedFIR.investigationReport.contradictions.length > 0 ? (
                                            selectedFIR.investigationReport.contradictions.map((c, i) => (
                                                <div key={i} className="flex items-start bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/10">
                                                    <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3 flex-shrink-0" />
                                                    <p className="text-sm">{c}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-indigo-200 italic">No contradictions detected in statements.</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">Strategic Insights</h4>
                                    <ul className="space-y-2">
                                        {selectedFIR.investigationReport.advancedInsights.map((insight, i) => (
                                            <li key={i} className="flex items-start text-sm">
                                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 mr-3 flex-shrink-0" />
                                                <span className="text-slate-100">{insight}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <BrainCircuit className="h-10 w-10 text-slate-300" />
              </div>
              <p className="text-xl font-medium text-slate-600 mb-2">Select a case to launch investigation</p>
              <p className="text-sm text-slate-400">Access AI tools for suspect ID, CCTV tracking, and pattern analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PoliceDashboard;