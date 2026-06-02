import React, { useState, useRef, useEffect } from 'react';
import { 
  Rocket, Wand2, PenTool, Save, Eye, Copy, 
  MessageCircle, Cloud, Clock, LogOut, PlusCircle, 
  CheckSquare, Square, ChevronRight, FileCode2, FileText, 
  MonitorSmartphone, Smartphone, Tablet, Monitor, 
  Download, Bot, Send, Sparkles, X, HelpCircle, ExternalLink,
  Undo2, Redo2, Check, Zap, Cpu
} from 'lucide-react';

// --- KONFIGURASI API GEMINI ---
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; 

const SYSTEM_FEATURES_LIST = [
  { id: 'pwa', label: 'Progressive Web App (PWA)' },
  { id: 'darkmode', label: 'Dark Mode Toggle' },
  { id: 'tailwind', label: 'Tailwind CSS Styling' },
  { id: 'crud', label: 'CRUD ke Google Sheets' },
  { id: 'auth', label: 'Login / Auth System' },
  { id: 'spa', label: 'Single Page Application (SPA)' },
  { id: 'upload', label: 'File Upload ke Drive' },
  { id: 'export', label: 'Export PDF/Excel' }
];

// --- SIMPLE MARKDOWN PARSER UNTUK CHAT ---
const formatChatText = (text) => {
  if (!text) return { __html: '' };
  let formatted = text
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-800 text-slate-200 p-2 rounded-lg my-2 text-xs overflow-x-auto border border-slate-700 font-mono"><code>$1</code></pre>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-slate-800 font-extrabold">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-200 text-slate-800 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\n/g, '<br/>');
  return { __html: formatted };
};

export default function App() {
  // State Tahap 1: Konfigurasi
  const [appName, setAppName] = useState('');
  const [appDesc, setAppDesc] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState({
    tailwind: true, spa: true, darkmode: true, pwa: true
  });
  const [manualFeature, setManualFeature] = useState('');
  const [appFeatures, setAppFeatures] = useState([]);
  
  // State Tahap 2: Prompt
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [step, setStep] = useState(1); 

  // State Tahap 3: Code & History (UNDO/REDO SYSTEM)
  const [codeHistory, setCodeHistory] = useState([]); 
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [viewMode, setViewMode] = useState('code'); 
  
  // State Fitur Tambahan
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [showCopilot, setShowCopilot] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  
  // State Chat Copilot
  const [copilotMessage, setCopilotMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', text: 'Halo! Saya AI Principal Engineer Anda. Saya telah dilatih dengan standar UI/UX Enterprise. Ada bagian UI atau logika yang ingin dioptimalkan?' }
  ]);
  const chatEndRef = useRef(null);

  // State Loading
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isBuildingApp, setIsBuildingApp] = useState(false);
  const [isCopilotThinking, setIsCopilotThinking] = useState(false);

  // Auto-scroll chat ke bawah
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isCopilotThinking]);

  // Getter untuk files saat ini
  const currentFiles = historyIndex >= 0 ? codeHistory[historyIndex] : [];

  // --- FUNGSI UTILITAS ---
  const toggleSystemFeature = (id) => setSelectedFeatures(prev => ({ ...prev, [id]: !prev[id] }));

  const addManualFeature = () => {
    if (manualFeature.trim()) {
      setAppFeatures([...appFeatures, manualFeature.trim()]);
      setManualFeature('');
    }
  };

  const removeFeature = (index) => setAppFeatures(appFeatures.filter((_, i) => i !== index));

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Kode berhasil disalin!");
  };

  const pushToHistory = (newFiles) => {
    const newHistory = codeHistory.slice(0, historyIndex + 1);
    newHistory.push(newFiles);
    setCodeHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => { if (historyIndex > 0) setHistoryIndex(historyIndex - 1); };
  const redo = () => { if (historyIndex < codeHistory.length - 1) setHistoryIndex(historyIndex + 1); };

  // --- ENGINE API GEMINI DENGAN TINGKAT KECERDASAN TERTINGGI ---
  const callGeminiText = async (prompt) => {
    try {
      if (!apiKey) return "Error: API Key kosong. Pastikan Environment Variable VITE_GEMINI_API_KEY sudah diset di Vercel.";
      
      const payload = { contents: [{ parts: [{ text: prompt }] }] };
      // PERBAIKAN: Menggunakan model gemini-2.5-flash yang stabil
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      if(data.error) {
         console.error("Gemini API Error:", data.error);
         return `Error dari API Gemini: ${data.error.message}`;
      }
      
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) { 
      console.error("Fetch Catch Error:", error);
      return "Terjadi kesalahan koneksi jaringan saat memanggil AI."; 
    }
  };

  const callGeminiJSON = async (prompt, jsonSchema, systemInstruction = null) => {
    try {
       if (!apiKey) {
          console.error("API Key Kosong!");
          return null;
       }

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: jsonSchema }
      };
      
      if (systemInstruction) {
        payload.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      // PERBAIKAN: Menggunakan model gemini-2.5-flash yang stabil
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      if(data.error) {
         console.error("Gemini JSON API Error:", data.error);
         return null;
      }
      
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return textResponse ? JSON.parse(textResponse) : null;
    } catch (error) { 
      console.error("Fetch Catch JSON Error:", error);
      return null; 
    }
  };

  const callGeminiJSON = async (prompt, jsonSchema, systemInstruction = null) => {
    // Pengecekan API Key
    if (!apiKey) {
      alert("Error: API Key Gemini belum terpasang atau belum terbaca dari Environment Variables.");
      return null;
    }

    try {
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: jsonSchema }
      };
      
      // INJEKSI KEPRIBADIAN / EXPERTISE LEVEL (Sangat Penting!)
      if (systemInstruction) {
        payload.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return textResponse ? JSON.parse(textResponse) : null;
    } catch (error) { return null; }
  };

  // --- LOGIKA UTAMA APLIKASI ---

  const handleGenerateDesc = async () => {
    if (!appName) return alert("Masukkan Nama Aplikasi terlebih dahulu.");
    setIsGeneratingDesc(true);
    setAppDesc("Menganalisis ide aplikasi...");
    const result = await callGeminiText(`Kamu adalah Product Manager handal. Buatkan deskripsi (maksimal 2 kalimat) yang sangat menjual, profesional, dan menjelaskan core value untuk aplikasi web bernama "${appName}". Jawab HANYA deskripsinya saja tanpa tanda kutip awalan.`);
    setAppDesc(result);
    setIsGeneratingDesc(false);
  };

  const handleGeneratePrompt = () => {
    if (!appName) return alert("Nama aplikasi wajib diisi!");
    const activeSysFeatures = SYSTEM_FEATURES_LIST.filter(f => selectedFeatures[f.id]).map(f => f.label);
    
    // PROMPT SUPER DETAIL & ENTERPRISE GRADE
    const promptText = `Buatkan KODE LENGKAP, PRODUCTION-READY, dan ESTETIK untuk aplikasi berbasis web (Target: Google Apps Script).

### 1. INFORMASI APLIKASI
- NAMA: ${appName}
- DESKRIPSI: ${appDesc || 'Aplikasi web interaktif.'}

### 2. KEBUTUHAN SISTEM
${activeSysFeatures.map(f => `- ${f}`).join('\n')}

### 3. FITUR SPESIFIK & CUSTOM
${appFeatures.length > 0 ? appFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n') : '- Rancang UI/UX yang intuitif dan profesional sesuai standar industri saat ini.'}

### 4. STANDAR KUALITAS TINGGI (WAJIB DIIKUTI 100%):
- **UI/UX PREMIUM:** Gunakan Tailwind CSS. Terapkan desain modern (glassmorphism ringan, subtle shadows, rounded-xl/2xl, ample padding, transisi hover yang halus).
- **TYPOGRAPHY & ICONS:** Gunakan font Google 'Inter' atau 'Poppins' dan include ikon modern (gunakan CDN Phosphor Icons atau FontAwesome).
- **STRUKTUR KODE (JS):** Tulis Vanilla JS (ES6+) yang modular, rapi, dan mudah dibaca. Terapkan konsep pemisahan antara Data State, Logic, dan UI Render.
- **UX INTERACTIONS:** Wajib tambahkan loading states (spinner/skeleton), empty states (jika data kosong), dan notifikasi (toast/alert modern) untuk setiap interaksi user.
- **PENGIRIMAN FILE:** 1. Berikan file "Code.gs" (Berisi fungsi doGet(e) standar GAS).
  2. Berikan file "index.html". *PENTING: Gabungkan semua HTML, CSS (<style>), dan JS (<script>) ke dalam file index.html ini agar menjadi Single Page Application (SPA).*
- Berikan DATA DUMMY yang realistis dan lengkap agar saat di-preview aplikasi langsung terlihat hidup dan menakjubkan.`;
    
    setGeneratedPrompt(promptText);
    setStep(2);
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
  };

  // BUILD PERTAMA KALI
  const handleBuildWebsite = async () => {
    setIsBuildingApp(true);
    setStep(3);
    
    const fileSchema = {
      type: "OBJECT",
      properties: {
        files: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: { filename: { type: "STRING" }, content: { type: "STRING" } },
            required: ["filename", "content"]
          }
        }
      }, required: ["files"]
    };

    const sysInstruction = "Kamu adalah Elite Principal Web Developer dan Pakar UI/UX dunia. Tugasmu adalah membuat aplikasi single-page (SPA) yang menakjubkan, sangat responsif, memiliki animasi yang mulus, kode yang sangat bersih, dan bebas bug. Output wajib berupa JSON sesuai schema.";

    const resultJSON = await callGeminiJSON(generatedPrompt, fileSchema, sysInstruction);

    if (resultJSON && resultJSON.files) {
      pushToHistory(resultJSON.files);
      const htmlIndex = resultJSON.files.findIndex(f => f.filename.toLowerCase().includes('index.html'));
      setActiveFileIndex(htmlIndex !== -1 ? htmlIndex : 0);
      setViewMode('preview');
      setShowCopilot(true);
    } else {
      pushToHistory([{ filename: "Error.txt", content: "AI gagal memahami perintah kompleks. Silakan coba generate ulang." }]);
    }
    
    setIsBuildingApp(false);
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
  };

  // COPILOT CHAT (EXPERT INTENT DETECTION)
  const handleCopilotSubmit = async (e) => {
    e.preventDefault();
    if (!copilotMessage.trim()) return;

    const userMessage = copilotMessage;
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setCopilotMessage('');
    setIsCopilotThinking(true);

    const smartSchema = {
      type: "OBJECT",
      properties: {
        intent: { 
          type: "STRING", 
          description: "Isi 'UPDATE_CODE' jika user meminta perubahan UI, bug fix, atau penambahan fitur. Isi 'JUST_ANSWER' jika user HANYA bertanya penjelasan." 
        },
        ai_reply: { 
          type: "STRING", 
          description: "Pesan balasan profesional. Jika merevisi, sebutkan secara singkat apa saja yang dioptimasi." 
        },
        files: {
          type: "ARRAY",
          description: "Wajib diisi dengan seluruh file. Jika intent UPDATE_CODE, berikan file yang sudah dimodifikasi. Jika JUST_ANSWER, kembalikan persis seperti aslinya.",
          items: {
            type: "OBJECT",
            properties: { filename: { type: "STRING" }, content: { type: "STRING" } },
            required: ["filename", "content"]
          }
        }
      },
      required: ["intent", "ai_reply", "files"]
    };

    // Prompt khusus Copilot
    const revisionPrompt = `
      Kode aplikasi saat ini (JSON): ${JSON.stringify(currentFiles)}
      
      Pesan/Permintaan User: "${userMessage}"

      TUGASMU:
      1. Pahami niat user. Jika ia meminta perubahan desain/fitur, perbaiki kodenya tanpa merusak fitur yang sudah jalan.
      2. Terapkan best-practices. Jika user meminta "ubah warna jadi merah", jangan asal merah mentereng. Gunakan warna merah modern (seperti rose-500 atau red-600 di Tailwind) agar UI tetap berkelas.
      3. Berikan penjelasan teknis yang singkat dan cerdas di 'ai_reply'.
    `;

    const sysInstruction = "Kamu adalah Principal Engineer AI Copilot. Kamu ahli dalam merefactor kode dan mendesain UI kelas atas. Saat mengubah kode, pastikan responsivitas dan struktur kode tetap terjaga sempurnya. Berbicaralah dengan nada ramah, berwibawa, dan sangat membantu.";

    const resultJSON = await callGeminiJSON(revisionPrompt, smartSchema, sysInstruction);

    if (resultJSON) {
      if (resultJSON.intent === 'UPDATE_CODE') {
        pushToHistory(resultJSON.files);
      }
      setChatHistory(prev => [...prev, { role: 'ai', text: resultJSON.ai_reply, isUpdate: resultJSON.intent === 'UPDATE_CODE' }]);
    } else {
      setChatHistory(prev => [...prev, { role: 'ai', text: 'Koneksi ke otak utama AI terputus sesaat. Mohon ulangi perintah Anda.' }]);
    }
    
    setIsCopilotThinking(false);
  };

  const getHtmlPreviewContent = () => {
    const htmlFile = currentFiles.find(f => f.filename.toLowerCase().endsWith('.html'));
    if (htmlFile) return htmlFile.content;
    return `<div style="display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif; color:#666;"><h2>Tidak ada file HTML untuk di-preview</h2></div>`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      {/* HEADER ENTERPRISE */}
      <header className="bg-white text-slate-800 p-4 flex flex-wrap justify-between items-center shadow-sm sticky top-0 z-20 border-b border-slate-200">
        <div className="flex items-center gap-3 mb-2 sm:mb-0">
          <div className="bg-slate-900 p-2 rounded-xl shadow-lg shadow-slate-900/20">
            <Cpu size={22} className="text-emerald-400" />
          </div>
          <h1 className="font-extrabold text-2xl tracking-tight">
            GAS Builder <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-400">Enterprise</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4 text-sm overflow-x-auto pb-1 sm:pb-0 font-medium text-slate-600">
          <button className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors"><Cloud size={18} /> Projects</button>
          <div className="h-5 w-px bg-slate-300 mx-1"></div>
          <button className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95 whitespace-nowrap">
             + Project Baru
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto mt-8 px-4 flex flex-col gap-8">
        
        {/* STEP 1: KONFIGURASI */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
             <div className="flex items-center gap-4">
               <div className="bg-emerald-500 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-emerald-500/30 shadow-lg">1</div>
               <h2 className="text-xl font-extrabold text-slate-800">Architecture Definition</h2>
             </div>
             <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-1"><Zap size={14}/> Expert Mode</span>
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-extrabold text-slate-700 mb-2">Nama Aplikasi / Modul</label>
                <input 
                  type="text" value={appName} onChange={(e) => setAppName(e.target.value)}
                  placeholder="Misal: Sistem Manajemen Inventori HRD"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm"
                />
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-sm font-extrabold text-slate-700">Business Logic & Deskripsi</label>
                  <button onClick={handleGenerateDesc} disabled={isGeneratingDesc} className="text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
                    <Wand2 size={14} /> {isGeneratingDesc ? 'Analyzing...' : 'AI Generate'}
                  </button>
                </div>
                <textarea 
                  value={appDesc} onChange={(e) => setAppDesc(e.target.value)}
                  placeholder="Jelaskan kebutuhan fungsional aplikasi secara spesifik..." rows="4"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none shadow-sm"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-700 mb-2">Requirement Khusus / Custom Feature</label>
                <div className="flex gap-2">
                  <input 
                    type="text" value={manualFeature} onChange={(e) => setManualFeature(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addManualFeature()}
                    placeholder="Contoh: Gunakan Chart.js, Desain Dark Mode dominan..."
                    className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm shadow-sm"
                  />
                  <button onClick={addManualFeature} className="bg-slate-900 text-white px-6 rounded-2xl hover:bg-slate-800 font-bold shadow-md">Add</button>
                </div>
                {appFeatures.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {appFeatures.map((f, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-200 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">
                        {f} <X size={14} className="cursor-pointer hover:text-red-500 bg-white rounded-full p-0.5" onClick={() => removeFeature(idx)}/>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <label className="block text-sm font-extrabold text-slate-700">Tech Stack & System Features</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SYSTEM_FEATURES_LIST.map(feature => (
                  <div 
                    key={feature.id} onClick={() => toggleSystemFeature(feature.id)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedFeatures[feature.id] ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                  >
                    {selectedFeatures[feature.id] ? <CheckSquare className="text-emerald-500" size={22} /> : <Square className="text-slate-300" size={22} />}
                    <span className={`text-sm ${selectedFeatures[feature.id] ? 'font-bold text-slate-800' : 'text-slate-600 font-medium'}`}>{feature.label}</span>
                  </div>
                ))}
              </div>
              
              <div className="pt-6">
                <button onClick={handleGeneratePrompt} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black flex justify-center items-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-slate-900/20 text-lg">
                  <PenTool size={22} /> Compile Prompt System
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* STEP 2: PROMPT */}
        {step >= 2 && (
          <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div className="flex items-center gap-4 px-2">
                 <div className="bg-emerald-500 text-white w-8 h-8 rounded-lg flex items-center justify-center font-black shadow-emerald-500/30 shadow-md text-sm">2</div>
                 <h2 className="text-lg font-extrabold text-slate-800">Prompt Engineering Output</h2>
               </div>
            </div>
            <div className="p-6 space-y-5">
              <textarea 
                value={generatedPrompt} onChange={(e) => setGeneratedPrompt(e.target.value)}
                className="w-full h-40 p-5 font-mono text-sm border border-slate-200 rounded-2xl bg-slate-900 text-emerald-300 focus:ring-2 focus:ring-emerald-500 outline-none whitespace-pre-wrap shadow-inner leading-relaxed"
              />
              <button 
                onClick={handleBuildWebsite} disabled={isBuildingApp}
                className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-black flex justify-center items-center gap-3 transition-all active:scale-[0.98] shadow-2xl shadow-emerald-500/30 disabled:opacity-70 text-lg"
              >
                {isBuildingApp ? (
                  <><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div> COMPILING APPLICATION...</>
                ) : (
                  <><Sparkles size={24} /> GENERATE ENTERPRISE APP</>
                )}
              </button>
            </div>
          </section>
        )}

        {/* STEP 3: WORKSPACE (CODE, PREVIEW, COPILOT) */}
        {step >= 3 && (
          <section className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in-up border-t-[8px] border-t-emerald-500 flex flex-col h-[850px]">
             
             {/* Header Toolbar Workspace */}
             <div className="bg-white border-b border-slate-200 p-3 px-4 flex flex-col sm:flex-row justify-between items-center gap-4 z-10 shadow-sm overflow-x-auto">
                
                {/* View Toggle */}
                <div className="flex bg-slate-100 p-1.5 rounded-xl flex-shrink-0">
                   <button 
                     onClick={() => setViewMode('code')}
                     className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'code' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     <FileCode2 size={18} /> Source Code
                   </button>
                   <button 
                     onClick={() => setViewMode('preview')}
                     className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'preview' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     <Eye size={18} /> Live Preview
                   </button>
                </div>

                {/* UNDO / REDO / DEVICE CONTROLS */}
                {!isBuildingApp && (
                  <div className="flex items-center gap-3 bg-slate-50 p-2 px-4 rounded-2xl border border-slate-200 shadow-inner">
                    {/* Time Travel Controls */}
                    <div className="flex items-center gap-2 border-r border-slate-300 pr-4">
                      <button onClick={undo} disabled={historyIndex <= 0} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Undo Perubahan AI"><Undo2 size={18}/></button>
                      <span className="text-xs font-black text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">v{historyIndex + 1}</span>
                      <button onClick={redo} disabled={historyIndex >= codeHistory.length - 1} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Redo Perubahan AI"><Redo2 size={18}/></button>
                    </div>

                    {/* Device Controls (Hanya di Preview) */}
                    {viewMode === 'preview' && (
                      <div className="flex items-center gap-1.5 pl-1">
                        <button onClick={() => setPreviewDevice('mobile')} className={`p-2 rounded-lg transition-all ${previewDevice === 'mobile' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`} title="Mobile"><Smartphone size={18} /></button>
                        <button onClick={() => setPreviewDevice('tablet')} className={`p-2 rounded-lg transition-all ${previewDevice === 'tablet' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`} title="Tablet"><Tablet size={18} /></button>
                        <button onClick={() => setPreviewDevice('desktop')} className={`p-2 rounded-lg transition-all ${previewDevice === 'desktop' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`} title="Desktop"><Monitor size={18} /></button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Deploy & Copilot Toggle */}
                <div className="flex gap-3 flex-shrink-0">
                   <button onClick={() => setShowDeployModal(true)} className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-5 py-2.5 rounded-xl text-sm font-extrabold transition-colors border border-blue-200">
                     <Rocket size={18} /> <span className="hidden lg:inline">Deploy</span>
                   </button>
                   <button onClick={() => setShowCopilot(!showCopilot)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-extrabold transition-all shadow-md ${showCopilot ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-inner' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
                     <Bot size={20} /> <span className="hidden lg:inline">AI Copilot</span>
                   </button>
                </div>
             </div>
             
             {/* Workspace Area Layout */}
             <div className="flex flex-1 overflow-hidden bg-slate-50 relative">
               {isBuildingApp ? (
                 <div className="flex-1 flex flex-col items-center justify-center gap-6">
                   <div className="relative">
                     <div className="absolute inset-0 bg-emerald-400 blur-2xl opacity-40 rounded-full animate-pulse"></div>
                     <Cpu className="animate-bounce text-emerald-500 relative z-10" size={72} />
                   </div>
                   <p className="font-extrabold text-slate-700 animate-pulse text-xl tracking-tight">Menyusun Arsitektur Kode & Desain UI...</p>
                 </div>
               ) : (
                 <>
                   {/* BAGIAN KIRI: Code/Preview */}
                   <div className={`flex-1 flex flex-col md:flex-row overflow-hidden transition-all duration-300`}>
                     
                     {/* Sidebar Explorer (Hanya Mode Code) */}
                     {viewMode === 'code' && (
                       <div className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col z-10">
                         <div className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">Project Files</div>
                         <ul className="flex-1 overflow-y-auto p-2 space-y-1">
                           {currentFiles.map((file, idx) => (
                             <li key={idx}>
                               <button 
                                 onClick={() => setActiveFileIndex(idx)}
                                 className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 rounded-xl transition-all font-bold ${activeFileIndex === idx ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100' : 'text-slate-600 hover:bg-slate-50'}`}
                               >
                                 {file.filename.includes('.html') ? <MonitorSmartphone size={18} className="text-orange-500"/> : <FileCode2 size={18} className="text-blue-500"/>}
                                 <span className="truncate">{file.filename}</span>
                               </button>
                             </li>
                           ))}
                         </ul>
                       </div>
                     )}

                     {/* Main Editor / Iframe */}
                     <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden relative">
                       {viewMode === 'code' ? (
                         <>
                           <div className="bg-slate-900 border-b border-slate-950 px-5 py-3 text-sm font-mono font-bold text-slate-400 flex justify-between items-center">
                             <span className="text-emerald-400">{currentFiles[activeFileIndex]?.filename}</span>
                             <button onClick={() => copyToClipboard(currentFiles[activeFileIndex]?.content)} className="hover:text-white flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"><Copy size={16}/> Copy Code</button>
                           </div>
                           <div className="flex-1 overflow-auto p-6 bg-[#0a0f18] text-slate-300">
                             <pre className="font-mono text-[13px] whitespace-pre-wrap leading-relaxed">
                               <code>{currentFiles[activeFileIndex]?.content || '// Kosong'}</code>
                             </pre>
                           </div>
                         </>
                       ) : (
                         <div className="w-full h-full bg-slate-200 p-6 flex justify-center items-start overflow-auto">
                           <div 
                             className={`bg-white shadow-2xl transition-all duration-500 ease-in-out border border-slate-300 overflow-hidden flex flex-col ${
                               previewDevice === 'mobile' ? 'w-[375px] h-[812px] rounded-[3rem] border-[12px] border-slate-900' : 
                               previewDevice === 'tablet' ? 'w-[768px] h-[1024px] rounded-[2rem] border-[12px] border-slate-900' : 
                               'w-full h-full rounded-2xl'
                             }`}
                           >
                              {previewDevice !== 'desktop' && (
                                <div className="bg-slate-900 h-7 w-full flex justify-center items-center">
                                  <div className="w-20 h-1.5 bg-slate-700 rounded-full"></div>
                                </div>
                              )}
                              <iframe 
                                title="App Preview" srcDoc={getHtmlPreviewContent()}
                                className="w-full flex-1 border-none bg-white" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                              />
                           </div>
                         </div>
                       )}
                     </div>
                   </div>

                   {/* BAGIAN KANAN: AI COPILOT PANEL (Smart Chat) */}
                   {showCopilot && (
                     <div className="w-full md:w-96 lg:w-[450px] bg-white border-l border-slate-200 flex flex-col shadow-[-20px_0_25px_-5px_rgba(0,0,0,0.05)] z-20 animate-fade-in-left absolute md:relative right-0 h-full">
                       <div className="p-4 bg-slate-900 text-white font-bold flex items-center justify-between border-b border-slate-800">
                         <div className="flex items-center gap-3">
                           <div className="bg-emerald-500/20 p-1.5 rounded-lg"><Bot size={22} className="text-emerald-400"/></div> 
                           <span>AI Engineer Chat</span>
                         </div>
                         <button onClick={() => setShowCopilot(false)} className="hover:text-emerald-400 p-1.5 bg-slate-800 rounded-lg transition-colors"><X size={18}/></button>
                       </div>
                       
                       {/* Chat Messages */}
                       <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50 custom-scrollbar">
                         {chatHistory.map((chat, idx) => (
                           <div key={idx} className={`flex gap-3 ${chat.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                             {/* Avatar */}
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-md font-bold ${chat.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 border border-emerald-300'}`}>
                               {chat.role === 'user' ? 'U' : <Bot size={20}/>}
                             </div>
                             {/* Bubble */}
                             <div className={`flex flex-col gap-1.5 max-w-[85%] ${chat.role === 'user' ? 'items-end' : 'items-start'}`}>
                               <div 
                                 className={`p-4 text-[13px] leading-relaxed shadow-sm ${
                                   chat.role === 'user' 
                                     ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' 
                                     : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm'
                                 }`}
                                 dangerouslySetInnerHTML={formatChatText(chat.text)}
                               />
                               {chat.role === 'ai' && chat.isUpdate && (
                                 <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200 shadow-sm mt-1">
                                   <Check size={12}/> Kode Diperbarui (v{historyIndex + 1})
                                 </span>
                               )}
                             </div>
                           </div>
                         ))}
                         {isCopilotThinking && (
                           <div className="flex gap-3 flex-row">
                             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 border border-emerald-300 flex items-center justify-center shadow-md mt-1"><Bot size={20}/></div>
                             <div className="p-5 bg-white border border-slate-200 rounded-2xl rounded-tl-sm flex items-center gap-2.5 shadow-sm">
                               <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce"></div>
                               <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                               <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                             </div>
                           </div>
                         )}
                         <div ref={chatEndRef} />
                       </div>

                       {/* Input Form */}
                       <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.03)]">
                         <form onSubmit={handleCopilotSubmit} className="relative">
                           <textarea 
                             rows="2"
                             value={copilotMessage}
                             onChange={(e) => setCopilotMessage(e.target.value)}
                             disabled={isCopilotThinking}
                             onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCopilotSubmit(e); } }}
                             placeholder="Minta revisi (Ubah layout, tambah chart) atau tanya penjelasan kode..."
                             className="w-full bg-slate-100 border border-slate-200 rounded-2xl py-3.5 pl-5 pr-14 text-sm font-medium outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all disabled:opacity-50 resize-none custom-scrollbar shadow-inner"
                           />
                           <button 
                             type="submit" disabled={!copilotMessage.trim() || isCopilotThinking}
                             className="absolute right-2.5 bottom-2.5 bg-emerald-500 hover:bg-emerald-600 text-white p-2.5 rounded-xl disabled:opacity-50 disabled:hover:bg-emerald-500 transition-all shadow-md active:scale-95"
                           >
                             <Send size={18} />
                           </button>
                         </form>
                       </div>
                     </div>
                   )}
                 </>
               )}
             </div>
          </section>
        )}
      </main>

      {/* MODAL PANDUAN DEPLOY */}
      {showDeployModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
            <div className="p-5 bg-blue-600 flex justify-between items-center text-white">
              <h3 className="font-extrabold text-lg flex items-center gap-2"><Rocket size={22}/> Cara Deploy ke Google Server</h3>
              <button onClick={() => setShowDeployModal(false)} className="hover:bg-blue-700 p-1.5 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <div className="p-8 max-h-[70vh] overflow-y-auto space-y-5 text-slate-700">
              <p className="text-sm bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 flex gap-3 font-medium">
                <HelpCircle size={24} className="flex-shrink-0 mt-0.5 text-blue-600" />
                Ikuti langkah berikut untuk meng-online-kan kode yang sudah di-generate menjadi Web App yang bisa diakses publik (GRATIS).
              </p>
              
              <ol className="list-decimal pl-6 space-y-4 font-medium text-[15px] text-slate-800">
                <li>Buka <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold">script.google.com</a> dan login dengan Google.</li>
                <li>Klik tombol <b>"New Project"</b> (Proyek Baru).</li>
                <li>
                  Buka file <code>Code.gs</code> di sana. Hapus isinya, lalu <b>Copy paste isi file Code.gs</b> dari aplikasi kita ke dalamnya.
                </li>
                <li>
                  Klik tanda <b>+</b> di menu kiri, pilih <b>HTML</b>. Beri nama <code>index</code> (tanpa .html).
                </li>
                <li>
                  <b>Copy paste isi file index.html</b> dari aplikasi kita ke dalam file index tersebut.
                </li>
                <li>
                  Simpan project (Ctrl+S) dan beri nama di bagian atas.
                </li>
                <li>
                  Klik tombol <b>"Deploy"</b> di kanan atas &gt; <b>"New deployment"</b>.
                </li>
                <li>
                  Klik ikon gerigi ⚙️ dan pastikan Anda memilih <b>"Web app"</b>.
                </li>
                <li>
                  Atur Execute as: <b>Me</b>, dan Who has access: <b>Anyone</b>. Klik <b>Deploy</b>.
                </li>
                <li>Selesai! Anda akan mendapatkan URL publik.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInLeft { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
        .animate-fade-in-left { animation: fadeInLeft 0.3s ease-out forwards; }
        .animate-spin-slow { animation: spin 4s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 6px; border: 2px solid #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}