import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FIR, AIAnalysis, InvestigationReport } from "../types";

// Safe API Key retrieval
const apiKey = process.env.API_KEY || '';
const isDemoMode = !apiKey || apiKey === 'YOUR_API_KEY';

let ai: GoogleGenAI | null = null;
if (!isDemoMode) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (e) {
    console.warn("Failed to initialize GoogleGenAI, falling back to Demo Mode.");
  }
}

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "A concise professional summary of the incident for police records." },
    severityScore: { type: Type.NUMBER, description: "A calculated severity score from 1 to 10 based on the crime description." },
    suggestedSections: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of relevant legal sections (e.g., IPC codes) applicable to this incident."
    },
    investigationSteps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Recommended immediate next steps for the investigating officer."
    },
    extractedEntities: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Key entities extracted (names, places, vehicle numbers, etc.)."
    }
  },
  required: ["summary", "severityScore", "suggestedSections", "investigationSteps", "extractedEntities"]
};

// --- MOCK DATA GENERATORS ---

const getMockAnalysis = (firTitle: string): AIAnalysis => ({
  summary: `[DEMO MODE] This is a simulated analysis for "${firTitle}". The incident involves reported disturbances and requires verification of witness statements.`,
  severityScore: 7.5,
  suggestedSections: ["IPC Section 379 (Theft)", "IPC Section 411 (Dishonestly receiving stolen property)"],
  investigationSteps: ["Collect CCTV footage from the reported location.", "Interview the complainant and immediate witnesses.", "Track any digital footprints if applicable."],
  extractedEntities: ["Central Station", "Blue Hoodie", "iPhone 13", "5:30 PM"]
});

const getMockInvestigation = (): InvestigationReport => ({
  similarCases: [
    { firId: "FIR-2023-089", title: "Phone Snatching at Metro", similarityScore: 85, reason: "Similar modus operandi involving suspect in hoodie." },
    { firId: "FIR-2022-112", title: "Pickpocketing near Market", similarityScore: 60, reason: "Location proximity and time of day match." }
  ],
  suspects: [
    { name: "Ravi 'The Shadow' Kumar", confidence: 78, description: "Known for operating in transport hubs. Matches physical description (Height: 5'10, Hoodie).", status: "Pattern Match" },
    { name: "Unknown Male", confidence: 40, description: "Generic match based on clothing description only.", status: "Unknown" }
  ],
  timeline: [
    { time: "17:15", location: "Station Entrance", description: "Subject entered via Gate 3.", source: "CCTV" },
    { time: "17:30", location: "Platform 4", description: "Incident occurred near coach C5.", source: "Witness" },
    { time: "17:32", location: "Exit Gate 2", description: "Subject seen running towards parking lot.", source: "CCTV" }
  ],
  contradictions: ["Witness A stated suspect wore Red, Complainant stated Blue.", "Time mismatch of 5 minutes between CCTV timestamp and report."],
  advancedInsights: ["Suspect likely uses the evening rush hour for cover.", "Recommend deploying plain clothes officers at Platform 4 between 17:00-19:00."]
});

// --- EXPORTED SERVICES ---

export const analyzeFIR = async (fir: FIR): Promise<AIAnalysis> => {
  if (isDemoMode || !ai) {
    console.log("Running analyzeFIR in Demo Mode");
    await new Promise(r => setTimeout(r, 1500)); // Simulate delay
    return getMockAnalysis(fir.title);
  }

  try {
    const prompt = `
      You are an expert AI Detective Assistant. Analyze the following FIR details and provide a structured investigation report.
      
      Incident: ${fir.title}
      Description: ${fir.description}
      Location: ${fir.location}
      Date: ${fir.dateOfIncident}
      Category: ${fir.category || 'Unclassified'}
      Evidence Count: ${fir.evidence.length}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "You are a senior police investigator assistant. Be precise, legalistic, and action-oriented."
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIAnalysis;
    }
    throw new Error("No response from AI");
  } catch (error) {
    console.error("Analysis failed", error);
    // Fallback to mock on error
    return getMockAnalysis(fir.title);
  }
};

const investigationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    similarCases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          firId: { type: Type.STRING },
          title: { type: Type.STRING },
          similarityScore: { type: Type.NUMBER },
          reason: { type: Type.STRING }
        }
      }
    },
    suspects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          description: { type: Type.STRING },
          status: { type: Type.STRING, enum: ['Identified', 'Unknown', 'Pattern Match'] }
        }
      }
    },
    timeline: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          time: { type: Type.STRING },
          location: { type: Type.STRING },
          description: { type: Type.STRING },
          source: { type: Type.STRING, enum: ['CCTV', 'Witness', 'Digital Footprint'] }
        }
      }
    },
    contradictions: { type: Type.ARRAY, items: { type: Type.STRING } },
    advancedInsights: { type: Type.ARRAY, items: { type: Type.STRING } }
  }
};

export const runDeepInvestigation = async (currentFir: FIR, allFirs: FIR[]): Promise<InvestigationReport> => {
  if (isDemoMode || !ai) {
    console.log("Running runDeepInvestigation in Demo Mode");
    await new Promise(r => setTimeout(r, 2000));
    return getMockInvestigation();
  }

  const otherCasesSummary = allFirs
    .filter(f => f.id !== currentFir.id)
    .map(f => `ID: ${f.id}, Title: ${f.title}, Desc: ${f.description.substring(0, 100)}...`)
    .join('\n');

  const prompt = `
    Conduct a deep AI investigation for FIR: "${currentFir.title}".
    
    1. **Similar FIR Discovery**: Compare against these past cases:\n${otherCasesSummary}\nFind patterns or links.
    2. **Suspect Identification**: Extract suspect description. Compare with this internal database of known criminals:
       - "Ravi Kumar" (History of mobile snatching, blue hoodie, tall)
       - "Suresh Singh" (Vandalism, brick throwing, operates at night)
       If description matches, flag as 'Identified'. If generic but fits a modus operandi, flag as 'Pattern Match'. Otherwise 'Unknown'.
    3. **CCTV Timeline**: Based on location "${currentFir.location}" and time "${currentFir.dateOfIncident}", GENERATE a hypothetical CCTV tracking timeline of the suspect's likely movement before and after the crime.
    4. **Intelligence Hub**: Identify any contradictions in the narrative or evidence and provide advanced strategic insights.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: investigationSchema
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as InvestigationReport;
    }
    throw new Error("No response");
  } catch (error) {
    console.error("Deep investigation failed", error);
    return getMockInvestigation();
  }
};

export const draftFIRFromChat = async (chatHistory: string): Promise<Partial<FIR>> => {
  if (isDemoMode || !ai) {
    await new Promise(r => setTimeout(r, 1500));
    return {
      title: "Draft Incident Report (Demo)",
      description: "Based on the conversation, the complainant reported an incident. [DEMO NOTE: This description is a placeholder as no API key is present to generate a real summary from the chat history.]",
      location: "Reported Location",
      dateOfIncident: new Date().toISOString().split('T')[0],
      category: "General Complaint",
      suggestedSections: ["IPC Section Gen-1"]
    };
  }

  const firSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "A short, professional title for the FIR." },
      description: { type: Type.STRING, description: "Detailed, chronological narrative of the incident suitable for official records." },
      location: { type: Type.STRING, description: "Precise location where the incident occurred." },
      dateOfIncident: { type: Type.STRING, description: "Date and time of the incident in a standard format." },
      category: { type: Type.STRING, description: "Classification of the crime (e.g., Theft, Cybercrime, Harassment, Assault, Accident, Vandalism)." },
      suggestedSections: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of potentially applicable legal sections (e.g., IPC Section 379, IT Act Section 66)."
      }
    },
    required: ["title", "description", "location", "dateOfIncident", "category", "suggestedSections"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on the conversation history below, draft a comprehensive and structured First Information Report (FIR). 
      The conversation may be in English, Hindi, Telugu, Tamil, or Malayalam.
      Infer the category and relevant legal sections based on the laws of India (IPC/CrPC) or general common law.
      IMPORTANT: Ensure the final FIR content (Title, Description, etc.) is drafted in clear, official English.
      
      Conversation History:
      ${chatHistory}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: firSchema
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return {};
  } catch (error) {
    console.error("Drafting failed", error);
    return {};
  }
};

export const getChatResponse = async (
  history: {role: string, parts: {text: string}[]}[], 
  message: string, 
  preferredLanguageName: string = 'English',
  agentContext: { name: string; role: string; focus: string; tone: string } = { name: 'Assistant', role: 'Police Intake Officer', focus: 'General Incident Reporting', tone: 'Professional, calm, and efficient' }
): Promise<{text: string, languageCode: string}> => {
  if (isDemoMode || !ai) {
    await new Promise(r => setTimeout(r, 600));
    return { 
      text: `[DEMO MODE] I am ${agentContext.name}. I received your message: "${message}". Since I am running without an API key, I cannot generate a real intelligent response, but I am ready to log your details.`, 
      languageCode: "en-IN" 
    };
  }

  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: history,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                text: { type: Type.STRING },
                languageCode: { type: Type.STRING, description: "The BCP-47 language code of the response (e.g. en-IN, hi-IN, te-IN, ta-IN, ml-IN)" }
            },
            required: ["text", "languageCode"]
        },
        systemInstruction: `You are **${agentContext.name}**, a specialized **${agentContext.role}**.
        
        **Your Profile:**
        - **Focus**: ${agentContext.focus}
        - **Tone**: ${agentContext.tone}
        
        **Goal:** 
        Gently guide a citizen to provide necessary details for a police report (FIR). Ask one clarifying question at a time.
        
        **Capabilities & Rules:**
        1. **Multilingual**: You must fully understand and communicate in English, Hindi, Telugu, Tamil, and Malayalam.
        2. **Language Preference**: The user has explicitly selected to converse in **${preferredLanguageName}**. You MUST reply in **${preferredLanguageName}** to all inputs.
        3. **Validation**: You are a smart intake system. If the user provides an answer that is clearly irrelevant (e.g., "I like ice cream" when asked about a crime), nonsensical (gibberish), or factually impossible contextually, you must **Identify it as WRONG**. Politely tell the user that the information seems incorrect or unclear and ask them to provide the specific detail again.
        4. **Agent Persona**: Maintain the specific persona of ${agentContext.role}. For example, if you are a Cyber Expert, ask about URLs, transaction IDs, and screenshots. If you are Traffic Police, ask about vehicle numbers and location specifics.
        5. **Output**: Always return JSON with 'text' and 'languageCode'.`
      }
    });

    const result = await chat.sendMessage({ message });
    if (result.text) {
        return JSON.parse(result.text);
    }
    return { text: "I apologize, I am unable to process that request.", languageCode: "en-IN" };
  } catch (error) {
    console.error("Chat failed", error);
    return { text: "I'm having trouble connecting to the server. Please try again.", languageCode: "en-IN" };
  }
};

export const analyzeEvidence = async (base64Data: string, mimeType: string): Promise<{label: string, description: string}> => {
  if (isDemoMode || !ai) {
    await new Promise(r => setTimeout(r, 1000));
    const isAudio = mimeType.startsWith('audio/');
    return { 
      label: isAudio ? 'Audio Note (Demo)' : 'Evidence Image (Demo)', 
      description: isAudio ? 'Simulated audio analysis: "I saw a man running..."' : 'Simulated image analysis: A clear view of the street.' 
    };
  }

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      label: { type: Type.STRING, description: "A short, smart label (e.g., 'CCTV Footage', 'Audio Recording', 'Damage Photo')." },
      description: { type: Type.STRING, description: "A concise description of the visual or auditory evidence for the police file." }
    },
    required: ["label", "description"]
  };

  const isAudio = mimeType.startsWith('audio/');
  const prompt = isAudio 
    ? "Analyze this audio file for a police report. Summarize the conversation or sounds relevant to an investigation. Identify speakers if possible."
    : "Analyze this image/document for a police report. Extract key visual details or summarize content.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });
    
    if (response.text) {
      return JSON.parse(response.text);
    }
    return { label: 'Attachment', description: 'Analysis unavailable' };
  } catch (error) {
    console.error("Evidence analysis failed", error);
    return { label: 'Attachment', description: 'Could not analyze file' };
  }
};

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
  if (isDemoMode || !ai) {
    return "[DEMO] This is a simulated transcription of your voice input.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Transcribe this audio recording verbatim. The speaker may use English, Hindi, Telugu, Tamil, Malayalam, or a mix of these languages. Translate to English for the official report, but keep key terms intact." }
        ]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Transcription failed", error);
    return "";
  }
};
