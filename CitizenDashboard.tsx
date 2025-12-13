import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, MapPin, Calendar, FileText, Bot, User as UserIcon, CheckCircle, Loader2, Mic, StopCircle, Upload, Image as ImageIcon, Sparkles, Volume2, VolumeX, Play, Languages, Shield, Monitor, Car, HeartHandshake, BadgeCheck, Pill, HelpCircle, X, ArrowRight, ArrowLeft } from 'lucide-react';
import { ChatMessage, FIR, FIRStatus, Evidence } from '../types';
import { getChatResponse, draftFIRFromChat, analyzeEvidence, transcribeAudio } from '../services/geminiService';

interface CitizenDashboardProps {
  onSubmitFIR: (fir: FIR) => void;
  onBack: () => void;
}

interface LanguageOption {
  code: string;
  name: string;
  label: string;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  focus: string;
  tone: string;
  icon: React.ElementType;
  color: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en-IN', name: 'English', label: 'English' },
  { code: 'hi-IN', name: 'Hindi', label: 'हिंदी' },
  { code: 'te-IN', name: 'Telugu', label: 'తెలుగు' },
  { code: 'ta-IN', name: 'Tamil', label: 'தமிழ்' },
  { code: 'ml-IN', name: 'Malayalam', label: 'മലയാളം' }
];

const AGENTS: Agent[] = [
  { 
    id: 'general', 
    name: 'Inspector Arjun', 
    role: 'General Duty Officer', 
    description: 'For theft, vandalism, fights, and general complaints.', 
    focus: 'General incident details, timeline, witnesses', 
    tone: 'Professional, direct, and efficient',
    icon: Shield,
    color: 'bg-blue-100 text-blue-700'
  },
  { 
    id: 'cyber', 
    name: 'Expert Riya', 
    role: 'Cyber Crime Specialist', 
    description: 'For online fraud, hacking, harassment, or financial scams.', 
    focus: 'Digital evidence, URLs, transaction IDs, phone numbers', 
    tone: 'Technical, analytical, and precise',
    icon: Monitor,
    color: 'bg-indigo-100 text-indigo-700'
  },
  { 
    id: 'traffic', 
    name: 'Sgt. Vikram', 
    role: 'Traffic Division', 
    description: 'For road accidents, vehicle theft, or rash driving.', 
    focus: 'Vehicle numbers, location specifics, injuries, insurance', 
    tone: 'Strict, factual, and urgent',
    icon: Car,
    color: 'bg-amber-100 text-amber-700'
  },
  { 
    id: 'women', 
    name: 'Officer Lakshmi', 
    role: 'Women Safety Cell', 
    description: 'Specialized support for harassment, stalking, or domestic issues.', 
    focus: 'Safety, pattern of behavior, protection, emotional state', 
    tone: 'Highly empathetic, supportive, protective, and patient',
    icon: HeartHandshake,
    color: 'bg-rose-100 text-rose-700'
  },
  { 
    id: 'narcotics', 
    name: 'Agent Kabir', 
    role: 'Narcotics Control', 
    description: 'For reporting drug trafficking, suspicious substances, or usage.', 
    focus: 'Substance description, location details, dealer description', 
    tone: 'Discreet, vigilant, and authoritative',
    icon: Pill,
    color: 'bg-emerald-100 text-emerald-700'
  }
];

const GREETINGS: Record<string, string> = {
  'en-IN': "Hello. I am ready to assist you. Please tell me what happened.",
  'hi-IN': "नमस्ते। मैं आपकी मदद करने के लिए तैयार हूं। कृपया मुझे बताएं कि क्या हुआ।",
  'te-IN': "నమస్కారం. నేను మీకు సహాయం చేయడానికి సిద్ధంగా ఉన్నాను. ఏం జరిగిందో దయచేసి చెప్పండి.",
  'ta-IN': "வணக்கம். நான் உங்களுக்கு உதவ தயாராக இருக்கிறேன். என்ன நடந்தது என்று சொல்லுங்கள்.",
  'ml-IN': "നമസ്കാരം. നിങ്ങളെ സഹായിക്കാൻ ഞാൻ തയ്യാറാണ്. എന്താണ് സംഭവിച്ചതെന്ന് ദയവായി എന്നോട് പറയൂ."
};

const INTRO_TEMPLATES: Record<string, (name: string, role: string) => string> = {
  'en-IN': (name, role) => `I am ${name}, your ${role}.`,
  'hi-IN': (name, role) => `मैं ${name} हूँ, आपका ${role}।`,
  'te-IN': (name, role) => `నేను ${name}, మీ ${role}.`,
  'ta-IN': (name, role) => `நான் ${name}, உங்கள் ${role}.`,
  'ml-IN': (name, role) => `ഞാൻ ${name}, നിങ്ങളുടെ ${role}.`
};

const CitizenDashboard: React.FC<CitizenDashboardProps> = ({ onSubmitFIR, onBack }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const [draftFIR, setDraftFIR] = useState<Partial<FIR> | null>(null);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [isProcessingEvidence, setIsProcessingEvidence] = useState(false);
  
  // Routing State
  const [isRoutingModalOpen, setIsRoutingModalOpen] = useState(false);
  const [routingText, setRoutingText] = useState('');
  const [isRoutingRecording, setIsRoutingRecording] = useState(false);
  const [isRoutingProcessing, setIsRoutingProcessing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Cleanup speech when component unmounts
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleLanguageSelect = (lang: LanguageOption) => {
    setSelectedLanguage(lang);
  };

  const handleAgentSelect = async (agent: Agent, initialUserText?: string) => {
    setSelectedAgent(agent);
    
    // Construct greeting based on Agent + Language
    const langCode = selectedLanguage?.code || 'en-IN';
    const baseGreeting = GREETINGS[langCode];
    const introTemplate = INTRO_TEMPLATES[langCode] || INTRO_TEMPLATES['en-IN'];
    
    const fullText = `${introTemplate(agent.name, agent.role)} ${baseGreeting}`;
    
    const greetingMsg: ChatMessage = {
      id: '1',
      role: 'model',
      text: fullText,
      languageCode: langCode,
      timestamp: Date.now()
    };
    
    let currentMessages = [greetingMsg];
    setMessages(currentMessages);
    
    setTimeout(() => {
      speakMessage(greetingMsg);
    }, 500);

    // Handle Smart Routing Text Injection
    if (initialUserText) {
       const userMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          text: initialUserText,
          timestamp: Date.now() + 100
       };
       currentMessages = [...currentMessages, userMsg];
       setMessages(currentMessages);
       
       setIsLoading(true);
       try {
           const history = currentMessages.map(m => ({
               role: m.role,
               parts: [{ text: m.text }]
           }));
           
           const response = await getChatResponse(
               history,
               initialUserText,
               selectedLanguage?.name || 'English',
               { 
                   name: agent.name, 
                   role: agent.role, 
                   focus: agent.focus, 
                   tone: agent.tone 
               }
           );

           const botMsg: ChatMessage = {
               id: (Date.now() + 200).toString(),
               role: 'model',
               text: response.text,
               languageCode: response.languageCode,
               timestamp: Date.now() + 200
           };
           setMessages(prev => [...prev, botMsg]);
           if(!isMuted) speakMessage(botMsg);
       } catch (e) {
           console.error("Auto-response failed", e);
       } finally {
           setIsLoading(false);
       }
    }
  };

  const handleRoutingSubmit = () => {
    if (!routingText.trim()) return;
    
    const text = routingText.toLowerCase();
    let targetId = 'general';
    
    // Smart Keyword Matching
    if (text.match(/(hack|fraud|scam|bank|online|money|url|otp|password|phishing|wallet|upi)/)) targetId = 'cyber';
    else if (text.match(/(accident|crash|traffic|road|vehicle|car|bike|driving|hit|run|license)/)) targetId = 'traffic';
    else if (text.match(/(woman|lady|girl|wife|husband|domestic|abuse|stalk|harass|dowry|rape|molest)/)) targetId = 'women';
    else if (text.match(/(drug|weed|cocaine|heroin|dealer|substance|powder|pill|addict)/)) targetId = 'narcotics';
    
    const agent = AGENTS.find(a => a.id === targetId) || AGENTS[0];
    
    setIsRoutingModalOpen(false);
    handleAgentSelect(agent, routingText);
  };

  const speakMessage = (message: ChatMessage) => {
    if (!message.text || isMuted) return;

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(message.text);
    if (message.languageCode) {
      utterance.lang = message.languageCode;
    }
    
    // Attempt to select a voice matching the language
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang === message.languageCode) || 
                  voices.find(v => message.languageCode && v.lang.startsWith(message.languageCode.split('-')[0]));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setSpeakingId(message.id);
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    window.speechSynthesis.speak(utterance);
  };

  const startRoutingRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsRoutingProcessing(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            const transcription = await transcribeAudio(base64Data, 'audio/webm');
            if (transcription) {
              setRoutingText(prev => prev + (prev ? ' ' : '') + transcription);
            }
            setIsRoutingProcessing(false);
          };
        } catch (e) {
          console.error(e);
          setIsRoutingProcessing(false);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRoutingRecording(true);
    } catch (e) {
      console.error("Error accessing microphone:", e);
      alert("Could not access microphone.");
    }
  };

  const stopRoutingRecording = () => {
    if (mediaRecorderRef.current && isRoutingRecording) {
      mediaRecorderRef.current.stop();
      setIsRoutingRecording(false);
    }
  };

  const speakRoutingText = () => {
    if (!routingText) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(routingText);
    if (selectedLanguage) {
        utterance.lang = selectedLanguage.code;
    }
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const response = await getChatResponse(
        history, 
        userMsg.text, 
        selectedLanguage?.name || 'English',
        selectedAgent ? { 
            name: selectedAgent.name, 
            role: selectedAgent.role, 
            focus: selectedAgent.focus, 
            tone: selectedAgent.tone 
        } : undefined
      );

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        languageCode: response.languageCode,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMsg]);
      
      if (!isMuted) {
        speakMessage(botMsg);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Use webm for browser compat
        setIsLoading(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            // Send to Gemini for transcription
            const transcription = await transcribeAudio(base64Data, 'audio/webm');
            if (transcription) {
              setInputText(prev => prev + (prev ? ' ' : '') + transcription);
            }
            setIsLoading(false);
          };
        } catch (e) {
          console.error(e);
          setIsLoading(false);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error("Error accessing microphone:", e);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingEvidence(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const mimeType = file.type;
        
        // Analyze with AI
        const analysis = await analyzeEvidence(base64Data, mimeType);
        
        const newEvidence: Evidence = {
          id: Math.random().toString(36).substr(2, 9),
          type: mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('audio/') ? 'audio' : 'document',
          url: URL.createObjectURL(file), // For display
          description: analysis.description,
          aiLabel: analysis.label
        };

        setEvidenceList(prev => [...prev, newEvidence]);
        
        // Notify in chat
        const systemMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          text: `[Uploaded Evidence: ${file.name}]`,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, systemMsg]);
        
        // AI Acknowledgement
        const botAck: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: `I've analyzed the uploaded file. It appears to be ${analysis.label.toLowerCase()}: "${analysis.description}". I've added it to the report evidence.`,
          languageCode: 'en-IN',
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, botAck]);
        
        if(!isMuted) speakMessage(botAck);
      };
    } catch (e) {
      console.error("Evidence upload failed", e);
    } finally {
      setIsProcessingEvidence(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateDraft = async () => {
    setIsDrafting(true);
    // Include evidence descriptions in the history context for better drafting
    let historyText = messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
    if (evidenceList.length > 0) {
      historyText += `\n\n[SYSTEM: The user has uploaded ${evidenceList.length} pieces of evidence. 
      Details: ${evidenceList.map(e => `${e.aiLabel}: ${e.description}`).join('; ')}]`;
    }

    const draft = await draftFIRFromChat(historyText);
    setDraftFIR(draft);
    setIsDrafting(false);
  };

  const handleFinalSubmit = () => {
    if (draftFIR && draftFIR.title) {
      const newFIR: FIR = {
        id: Math.random().toString(36).substr(2, 9),
        title: draftFIR.title || 'Untitled Incident',
        description: draftFIR.description || '',
        location: draftFIR.location || 'Unknown',
        dateOfIncident: draftFIR.dateOfIncident || new Date().toISOString(),
        category: draftFIR.category,
        suggestedSections: draftFIR.suggestedSections,
        status: FIRStatus.SUBMITTED,
        evidence: evidenceList,
        complainantName: 'Citizen User', 
        createdAt: new Date().toISOString()
      };
      onSubmitFIR(newFIR);
    }
  };

  // 1. Language Selection Screen
  if (!selectedLanguage) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] bg-slate-50 animate-in fade-in duration-300">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center max-w-md w-full">
          <div className="bg-cyan-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Languages className="h-8 w-8 text-cyan-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Select Language</h2>
          <p className="text-slate-500 mb-8">Choose your preferred language for the AI Assistant.</p>
          
          <div className="grid grid-cols-1 gap-3">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageSelect(lang)}
                className="p-4 rounded-xl border border-slate-200 hover:border-cyan-500 hover:bg-cyan-50 hover:shadow-md transition-all flex items-center justify-between group bg-white"
              >
                <div className="flex items-center">
                    <span className="w-8 h-8 rounded-full bg-slate-100 text-xs flex items-center justify-center mr-3 font-bold text-slate-600 group-hover:bg-white">
                        {lang.code.split('-')[0].toUpperCase()}
                    </span>
                    <span className="font-bold text-slate-700 group-hover:text-cyan-800 text-lg">{lang.label}</span>
                </div>
                <span className="text-xs font-medium text-slate-400 group-hover:text-cyan-600 bg-slate-50 px-2 py-1 rounded-full group-hover:bg-white">{lang.name}</span>
              </button>
            ))}
          </div>
          
          <button 
            onClick={onBack}
            className="mt-6 text-slate-400 text-sm hover:text-slate-600 flex items-center justify-center w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
          </button>
        </div>
      </div>
    );
  }

  // 2. Agent Selection Screen
  if (!selectedAgent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-slate-50 animate-in fade-in duration-300 p-4 relative">
        <div className="w-full max-w-4xl">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Choose Your Assistant</h2>
                <p className="text-slate-500 max-w-2xl mx-auto">
                    Select the specialized AI agent best suited for your incident. 
                    Each agent is trained to ask the right questions for their department.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {AGENTS.map((agent) => (
                    <button
                        key={agent.id}
                        onClick={() => handleAgentSelect(agent)}
                        className="flex flex-col items-start p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-cyan-400 hover:-translate-y-1 transition-all duration-300 group text-left h-full"
                    >
                        <div className={`p-4 rounded-xl mb-4 transition-colors ${agent.color}`}>
                            <agent.icon className="h-8 w-8" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center mb-1">
                                <h3 className="font-bold text-lg text-slate-800 group-hover:text-cyan-700 transition-colors">{agent.name}</h3>
                                {agent.id === 'general' && <BadgeCheck className="h-4 w-4 text-cyan-500 ml-2" />}
                            </div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{agent.role}</p>
                            <p className="text-sm text-slate-600 leading-relaxed mb-3 line-clamp-3">{agent.description}</p>
                        </div>
                        <div className="mt-2 pt-3 border-t border-slate-100 w-full">
                           <span className="text-[10px] px-2 py-1 bg-slate-100 text-slate-500 rounded font-medium inline-block">
                                {agent.tone.split(',')[0]}
                           </span>
                        </div>
                    </button>
                ))}
                
                {/* Other/Route Option */}
                <button 
                  onClick={() => setIsRoutingModalOpen(true)}
                  className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 hover:border-cyan-500 hover:bg-cyan-50 transition-all group h-full min-h-[280px]"
                >
                    <div className="p-4 rounded-full bg-white mb-4 shadow-sm group-hover:scale-110 transition-transform">
                        <HelpCircle className="h-8 w-8 text-slate-400 group-hover:text-cyan-600" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-600 group-hover:text-cyan-700">Other / Not Sure</h3>
                    <p className="text-sm text-slate-500 text-center mt-2 px-4">
                        Describe your issue and we'll automatically assign the right officer for you.
                    </p>
                </button>
            </div>
            
            <button 
                onClick={() => setSelectedLanguage(null)}
                className="mx-auto mt-8 text-slate-400 text-sm hover:text-slate-600 flex items-center justify-center"
            >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Language Selection
            </button>
        </div>

        {/* Smart Routing Modal */}
        {isRoutingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md m-4 relative animate-in zoom-in-95 duration-200">
                <button 
                  onClick={() => setIsRoutingModalOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                >
                   <X className="h-5 w-5" />
                </button>
                
                <div className="flex items-center space-x-3 mb-4">
                   <div className="p-2 bg-cyan-100 rounded-lg">
                      <Sparkles className="h-6 w-6 text-cyan-600" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-900">Find the Right Officer</h3>
                </div>
                
                <p className="text-slate-500 mb-4 text-sm">
                   Briefly describe what happened, and our AI will connect you to the specialist best suited for your case.
                </p>
                
                <div className="relative">
                    <textarea
                    value={routingText}
                    onChange={(e) => setRoutingText(e.target.value)}
                    placeholder={isRoutingRecording ? "Listening..." : "e.g., Someone stole my wallet, or I received a suspicious link..."}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none min-h-[140px] mb-4 text-slate-800 placeholder-slate-400 resize-none pr-12"
                    autoFocus
                    />

                    <div className="absolute right-3 bottom-6 flex flex-col space-y-2">
                         {/* TTS Button */}
                         {routingText && (
                            <button
                                onClick={speakRoutingText}
                                className="p-2 bg-white rounded-full text-slate-400 hover:text-cyan-600 shadow-sm border border-slate-200 transition-colors"
                                title="Read Aloud"
                            >
                                <Volume2 className="h-4 w-4" />
                            </button>
                         )}

                         {/* Mic Button */}
                         <button 
                             onClick={isRoutingRecording ? stopRoutingRecording : startRoutingRecording}
                             className={`p-2 rounded-full shadow-sm border transition-all ${
                                 isRoutingRecording 
                                 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' 
                                 : 'bg-white text-slate-400 hover:text-cyan-600 border-slate-200'
                             }`}
                             title={isRoutingRecording ? "Stop Recording" : "Voice Input"}
                         >
                             {isRoutingRecording ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                         </button>
                    </div>

                    {isRoutingProcessing && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                            <div className="flex items-center space-x-2 text-cyan-600 font-medium">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Processing Audio...</span>
                            </div>
                        </div>
                    )}
                </div>
                
                <button 
                   onClick={handleRoutingSubmit}
                   disabled={!routingText.trim() || isRoutingRecording || isRoutingProcessing}
                   className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   Connect to Officer <ArrowRight className="ml-2 h-4 w-4" />
                </button>
             </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Main Chat & Dashboard
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-8rem)]">
      {/* Chat Section */}
      <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <button 
                onClick={() => setSelectedAgent(null)}
                className="mr-1 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                title="Back to Assistant Selection"
            >
                <ArrowLeft className="h-5 w-5" />
            </button>
            <div className={`p-2 rounded-lg ${selectedAgent.color}`}>
              <selectedAgent.icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{selectedAgent.name}</h3>
              <div className="flex items-center space-x-2">
                 <p className="text-xs text-slate-500 font-medium">{selectedAgent.role}</p>
                 <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                 <p className="text-xs text-slate-500 flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                    {selectedLanguage.name}
                 </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => {
                setIsMuted(!isMuted);
                window.speechSynthesis.cancel();
              }}
              className={`p-2 rounded-full hover:bg-slate-100 transition-colors ${isMuted ? 'text-slate-400' : 'text-cyan-600'}`}
              title={isMuted ? "Unmute Assistant" : "Mute Assistant"}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            {!draftFIR && messages.length > 1 && (
              <button 
                onClick={handleGenerateDraft}
                disabled={isDrafting}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center shadow-sm"
              >
                {isDrafting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2 text-cyan-400" />}
                Generate AI Draft
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end group`}>
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mx-2 ${msg.role === 'user' ? 'bg-cyan-600' : 'bg-white border border-slate-200'}`}>
                  {msg.role === 'user' ? <UserIcon className="h-5 w-5 text-white" /> : <selectedAgent.icon className="h-5 w-5 text-slate-700" />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm relative ${
                  msg.role === 'user' 
                    ? 'bg-cyan-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                }`}>
                  {msg.text}
                  
                  {/* Play Button for AI Messages */}
                  {msg.role === 'model' && (
                    <button 
                      onClick={() => speakMessage(msg)}
                      className={`absolute -right-8 bottom-0 p-1.5 rounded-full hover:bg-slate-200 text-slate-400 transition-all opacity-0 group-hover:opacity-100 ${speakingId === msg.id ? 'text-cyan-600 bg-cyan-50 opacity-100' : ''}`}
                      title="Play Audio"
                    >
                      {speakingId === msg.id ? (
                        <span className="flex space-x-0.5 h-3 items-end">
                           <span className="w-0.5 h-2 bg-cyan-600 animate-bounce" style={{animationDelay: '0ms'}}></span>
                           <span className="w-0.5 h-3 bg-cyan-600 animate-bounce" style={{animationDelay: '100ms'}}></span>
                           <span className="w-0.5 h-1.5 bg-cyan-600 animate-bounce" style={{animationDelay: '200ms'}}></span>
                        </span>
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && !isRecording && (
            <div className="flex justify-start">
               <div className="flex flex-row items-center space-x-2 ml-12 bg-white p-3 rounded-2xl border border-slate-100">
                 <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                 <span className="text-xs text-slate-400">Processing...</span>
               </div>
            </div>
          )}
          {isProcessingEvidence && (
             <div className="flex justify-center my-4">
                <div className="bg-cyan-50 text-cyan-700 px-4 py-2 rounded-full text-xs font-semibold flex items-center border border-cyan-100 animate-pulse">
                   <Sparkles className="h-3 w-3 mr-2" />
                   AI is analyzing your evidence...
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-200">
          <div className="flex space-x-4 items-end">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*,application/pdf,audio/*"
              onChange={handleFileSelect} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors border border-transparent hover:border-slate-200"
              title="Upload Evidence"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                   if (e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     handleSendMessage();
                   }
                }}
                placeholder={isRecording ? "Listening..." : "Type your message or use voice..."}
                rows={1}
                className="w-full pl-4 pr-12 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all text-slate-800 placeholder-slate-400 resize-none overflow-hidden"
                style={{minHeight: '48px'}}
              />
              <button 
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isLoading || isRecording}
                className="absolute right-2 top-2 p-1.5 bg-cyan-600 rounded-lg text-white hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 rounded-xl transition-all border ${
                isRecording 
                  ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 animate-pulse' 
                  : 'hover:bg-slate-100 text-slate-400 border-transparent hover:border-slate-200'
              }`}
              title={isRecording ? "Stop Recording" : "Voice Input"}
            >
              {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Review Section */}
      <div className="lg:col-span-1 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-slate-800 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-cyan-600" />
            Structured FIR Draft
          </h3>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          {draftFIR ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Classification Badge */}
              <div className="flex flex-wrap gap-2">
                 {draftFIR.category && (
                    <span className="px-3 py-1 bg-cyan-100 text-cyan-700 text-xs font-bold uppercase rounded-full tracking-wider border border-cyan-200">
                      {draftFIR.category}
                    </span>
                 )}
                 {draftFIR.suggestedSections && draftFIR.suggestedSections.map((sec, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-200">
                      {sec}
                    </span>
                 ))}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Title</label>
                <input 
                  type="text" 
                  value={draftFIR.title || ''} 
                  onChange={(e) => setDraftFIR({...draftFIR, title: e.target.value})}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <Calendar className="h-3 w-3 mr-1" /> Date
                  </label>
                  <input 
                    type="text" 
                    value={draftFIR.dateOfIncident || ''}
                    onChange={(e) => setDraftFIR({...draftFIR, dateOfIncident: e.target.value})}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-slate-700 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <MapPin className="h-3 w-3 mr-1" /> Location
                  </label>
                  <input 
                    type="text" 
                    value={draftFIR.location || ''}
                    onChange={(e) => setDraftFIR({...draftFIR, location: e.target.value})}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-slate-700 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Narrative</label>
                <textarea 
                  value={draftFIR.description || ''}
                  onChange={(e) => setDraftFIR({...draftFIR, description: e.target.value})}
                  rows={8}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-md text-slate-700 text-sm leading-relaxed focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none"
                />
              </div>

              {/* Intelligent Evidence Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                     <ImageIcon className="h-3 w-3 mr-1" /> Processed Evidence
                  </label>
                  <button onClick={() => fileInputRef.current?.click()} className="text-xs text-cyan-600 font-medium hover:underline flex items-center">
                    <Upload className="h-3 w-3 mr-1" /> Add
                  </button>
                </div>
                {evidenceList.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400">
                    No evidence uploaded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {evidenceList.map((ev) => (
                      <div key={ev.id} className="flex items-start bg-slate-50 p-2 rounded-lg border border-slate-200">
                        {ev.type === 'image' && (
                          <img src={ev.url} alt="thumbnail" className="w-10 h-10 rounded object-cover mr-3 bg-slate-200" />
                        )}
                        {ev.type === 'audio' && (
                          <div className="w-10 h-10 rounded bg-indigo-100 flex items-center justify-center mr-3">
                             <Volume2 className="h-5 w-5 text-indigo-600" />
                          </div>
                        )}
                        <div className="flex-1 overflow-hidden">
                           <div className="flex items-center">
                             <span className="text-xs font-bold text-slate-800 mr-2">{ev.aiLabel || 'Attachment'}</span>
                             <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">AI Verified</span>
                           </div>
                           <p className="text-[10px] text-slate-500 truncate">{ev.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={handleFinalSubmit}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center mt-4"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Submit Official FIR
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center relative">
                <FileText className="h-8 w-8 text-slate-300" />
                <div className="absolute -bottom-1 -right-1 bg-cyan-500 p-1.5 rounded-full border-2 border-white">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-slate-600 mb-1">Drafting Pending</h4>
                <p className="max-w-[200px] text-sm">Chat with the assistant or use voice notes. Click "Generate AI Draft" when ready.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;