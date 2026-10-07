"use client";
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Send, Bot, FileUp, X, MessageSquare, Activity, Calendar, User, ChevronRight, ChevronLeft, Stethoscope, Star, ClipboardList, Clock, AlertTriangle, ShieldAlert, Pill, Share2, Trash2, Eye } from 'lucide-react';

// --- Types ---
interface DashboardData {
  patient: { name: string; age: number; gender: string; email: string; emergency_contact: string };
  medical_history: { chronic_conditions: string; medications: string; allergies: string };
  appointments: Array<{ id: number; scheduled_time: string; status: string; doctor_name: string; doctor_specialization: string }>;
}

// --- Mock Doctor Data for Carousel ---
const MOCK_DOCTORS = [
  { id: 1, name: "Dr. Smith", spec: "Cardiologist", rating: 4.9, img: "https://i.pravatar.cc/150?img=11", patients: 1240, bio: "Expert in heart conditions, hypertension & preventive cardiology. 15+ years at top hospitals.", days: ["Mon", "Wed", "Fri"] },
  { id: 2, name: "Dr. Jones", spec: "General Physician", rating: 4.8, img: "https://i.pravatar.cc/150?img=60", patients: 3800, bio: "Holistic care specialist focused on immune support, diagnostics & chronic disease management.", days: ["Tue", "Thu", "Sat"] },
  { id: 3, name: "Dr. Emily Chen", spec: "Endocrinologist", rating: 4.9, img: "https://i.pravatar.cc/150?img=47", patients: 920, bio: "Specializes in diabetes, thyroid disorders & metabolic health with a patient-first approach.", days: ["Mon", "Tue", "Thu"] },
  { id: 4, name: "Dr. Sarah Connor", spec: "Neurologist", rating: 4.7, img: "https://i.pravatar.cc/150?img=44", patients: 710, bio: "Leading expert in migraines, nervous system disorders & stroke rehabilitation.", days: ["Wed", "Fri"] },
];

// Generate next 3 days of time slots
const generateSlots = (days: string[]) => {
  const slots: string[] = [];
  const times = ["09:00", "11:00", "14:00", "16:00"];
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const dayName = dayNames[d.getDay()];
    if (days.includes(dayName)) {
      const dateStr = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      const isoDate = d.toISOString().split('T')[0];
      times.forEach(t => slots.push(`${dateStr} at ${t} | ${isoDate} ${t}`));
      if (slots.length >= 6) break;
    }
  }
  return slots.slice(0, 6);
};

function DoctorCarousel({ onSelect, onSlotBook }: { onSelect: (msg: string) => void, onSlotBook: (msg: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedDoc, setSelectedDoc] = useState<typeof MOCK_DOCTORS[0] | null>(null);
  const [popupDoc, setPopupDoc] = useState<typeof MOCK_DOCTORS[0] | null>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  const handleSelect = (doc: typeof MOCK_DOCTORS[0]) => {
    setSelectedDoc(doc);
    onSelect(`I'd like to book with ${doc.name} (${doc.spec}).`);
  };

  return (
    <div className="my-3">
      {/* Doctor popup modal */}
      {popupDoc && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPopupDoc(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white text-center relative">
              <button onClick={() => setPopupDoc(null)} className="absolute top-3 right-3 hover:bg-white/20 p-1 rounded-full"><X size={16}/></button>
              <img src={popupDoc.img} className="w-20 h-20 rounded-full border-4 border-white/80 mx-auto mb-2 shadow-lg object-cover"/>
              <h3 className="font-extrabold text-lg">{popupDoc.name}</h3>
              <p className="text-emerald-100 text-sm">{popupDoc.spec}</p>
              <div className="flex justify-center gap-1 mt-1 text-yellow-300 text-sm font-bold items-center">
                <Star size={14} className="fill-current"/> {popupDoc.rating}
              </div>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">{popupDoc.bio}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 p-3 rounded-xl text-center">
                  <p className="font-extrabold text-emerald-700 text-xl">{popupDoc.patients.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 font-medium">Patients Treated</p>
                </div>
                <div className="bg-teal-50 p-3 rounded-xl text-center">
                  <p className="font-extrabold text-teal-700 text-xl">{popupDoc.days.length}x</p>
                  <p className="text-xs text-gray-500 font-medium">Days / Week</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Available Days</p>
                <div className="flex flex-wrap gap-2">
                  {popupDoc.days.map(d => <span key={d} className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">{d}</span>)}
                </div>
              </div>
              <button onClick={() => { handleSelect(popupDoc); setPopupDoc(null); }} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-2xl hover:bg-emerald-500 transition">
                Select {popupDoc.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Carousel */}
      <div className="relative group">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden group-hover:flex">
          <button onClick={() => scroll('left')} className="bg-white rounded-full p-1.5 shadow-md border border-gray-100"><ChevronLeft size={18}/></button>
        </div>
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto snap-x p-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {MOCK_DOCTORS.map(doc => {
            const isSelected = selectedDoc?.id === doc.id;
            return (
              <div key={doc.id} className={`min-w-[150px] rounded-2xl border-2 p-3 snap-center flex flex-col items-center text-center flex-shrink-0 transition-all duration-300 ${isSelected ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-200' : 'border-gray-100 bg-white shadow-sm'}`}>
                <div className="relative cursor-pointer" onClick={() => setPopupDoc(doc)}>
                  <img src={doc.img} alt={doc.name} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md hover:scale-105 transition-transform" />
                  {isSelected && <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-white"><span className="text-white text-[8px] font-bold px-0.5">✓</span></div>}
                </div>
                <h4 className="font-bold text-gray-800 text-xs mt-2">{doc.name}</h4>
                <p className="text-[10px] text-emerald-600 font-semibold mb-1">{doc.spec}</p>
                <div className="flex items-center text-yellow-500 text-[10px] font-bold mb-3">
                  <Star size={10} className="fill-current mr-0.5"/> {doc.rating}
                </div>
                <button
                  onClick={() => handleSelect(doc)}
                  className={`w-full text-xs font-bold py-1.5 rounded-xl transition-all duration-200 ${isSelected ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-emerald-100 hover:text-emerald-700'}`}
                >
                  {isSelected ? '✓ Selected' : 'Select'}
                </button>
              </div>
            );
          })}
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden group-hover:flex">
          <button onClick={() => scroll('right')} className="bg-white rounded-full p-1.5 shadow-md border border-gray-100"><ChevronRight size={18}/></button>
        </div>
      </div>

      {/* Time Slot Picker — appears after doctor selected */}
      {selectedDoc && (
        <div className="mt-4 bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center"><Clock size={12} className="mr-1 text-emerald-500"/> Available Slots for {selectedDoc.name}</p>
          <div className="grid grid-cols-2 gap-2">
            {generateSlots(selectedDoc.days).map((slot) => {
              const [display, isoFull] = slot.split(' | ');
              return (
                <button
                  key={slot}
                  onClick={() => onSlotBook(`Book ${isoFull} with ${selectedDoc.name}`)}
                  className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all duration-200 text-left"
                >
                  📅 {display}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patient_id');
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'Hello! I am your AI triage assistant. I have reviewed your medical history. Can you tell me what symptoms you are experiencing today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [expandedDocs, setExpandedDocs] = useState<Set<number>>(new Set());
  const [activeShareDropdown, setActiveShareDropdown] = useState<number | null>(null);
  const [aiSummaryData, setAiSummaryData] = useState<any | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', age: '', gender: '', email: '', emergency_contact_name: '', emergency_contact_phone: '',
    chronic_conditions: '', medications: '', allergies: ''
  });
  const [selectedPastAppt, setSelectedPastAppt] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const openChatWithMessage = (msg: string) => {
    setIsChatOpen(true);
    setInput(msg);
  };

  const fetchDocuments = async () => {
    if (!patientId) return;
    try {
      const res = await axios.get(`http://localhost:8001/patients/${patientId}/documents`);
      setDocuments(res.data.documents);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (patientId) {
      axios.get(`http://localhost:8001/patients/${patientId}/dashboard`)
        .then(res => setData(res.data))
        .catch(err => console.error(err));
      fetchDocuments();
    }
  }, [patientId]);

  useEffect(() => {
    if (isChatOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatOpen]);

  const streamBotMessage = (fullText: string, onComplete?: () => void) => {
    setIsStreaming(true);
    setStreamingText('');
    let index = 0;
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    
    streamIntervalRef.current = setInterval(() => {
      index++;
      setStreamingText(fullText.slice(0, index));
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      if (index >= fullText.length) {
        clearInterval(streamIntervalRef.current!);
        setIsStreaming(false);
        setStreamingText('');
        setMessages(prev => [...prev, { role: 'bot', content: fullText }]);
        onComplete?.();
      }
    }, 12);
  };

  const refreshDashboard = async () => {
    if (!patientId) return;
    const newData = await axios.get(`http://localhost:8001/patients/${patientId}/dashboard`);
    setData(newData.data);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !patientId || isStreaming) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:8001/chat', {
        patient_id: parseInt(patientId),
        message: userMsg,
        history: messages.slice(1).map(m => ({ role: m.role, content: m.content.replace('[SHOW_CAROUSEL]', '') }))
      });
      
      setLoading(false);
      // Always refresh dashboard after bot responds — appointment card updates instantly
      streamBotMessage(res.data.reply, refreshDashboard);
    } catch (error) {
      setLoading(false);
      setMessages(prev => [...prev, { role: 'bot', content: 'Sorry, I encountered an error communicating with the server.' }]);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    try {
      await axios.put(`http://localhost:8001/patients/${patientId}`, {
        name: editForm.name,
        age: parseInt(editForm.age),
        gender: editForm.gender,
        email: editForm.email,
        emergency_contact_name: editForm.emergency_contact_name || null,
        emergency_contact_phone: editForm.emergency_contact_phone || null,
        chronic_conditions: editForm.chronic_conditions,
        medications: editForm.medications,
        allergies: editForm.allergies
      });
      await refreshDashboard();
      setShowEditModal(false);
    } catch (error) {
      alert('Failed to update profile.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !patientId) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('file', file);
    
    setUploadingDoc(true);
    try {
      const res = await axios.post(`http://localhost:8001/patients/${patientId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setExpandedDocs(prev => new Set(prev).add(res.data.document_id));
      await fetchDocuments();
    } catch (error) {
      alert('Upload failed.');
    } finally {
      setUploadingDoc(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!patientId || !confirm("Are you sure you want to delete this report?")) return;
    try {
      await axios.delete(`http://localhost:8001/patients/${patientId}/documents/${docId}`);
      await fetchDocuments();
    } catch (error) {
      alert("Failed to delete document.");
    }
  };

  const toggleSummary = (docId: number) => {
    setExpandedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const handleGenerateSummary = async () => {
    if (!patientId) return;
    setShowSummaryModal(true);
    setLoadingSummary(true);
    setAiSummaryData(null);
    try {
      const res = await axios.get(`http://localhost:8001/patients/${patientId}/generate-summary`);
      setAiSummaryData(res.data.summary);
    } catch (e) {
      setAiSummaryData("Failed to generate summary.");
    } finally {
      setLoadingSummary(false);
    }
  };

  if (!data) return <div className="h-screen flex items-center justify-center">Loading Profile...</div>;

  const now = new Date();
  const upcomingAppts = data.appointments.filter(a => new Date(a.scheduled_time) >= now);
  const pastAppts = data.appointments.filter(a => new Date(a.scheduled_time) < now);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm py-4 px-8 flex justify-between items-center z-10 sticky top-0 border-b border-gray-100">
        <h1 className="text-2xl font-extrabold text-teal-900 flex items-center tracking-tight">
          <Activity className="mr-2 text-emerald-500" strokeWidth={2.5}/> MedMate
        </h1>
        <div className="flex items-center gap-4">
          <button onClick={handleGenerateSummary} className="flex items-center text-sm font-semibold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full hover:bg-emerald-100 hover:shadow-sm transition-all duration-300">
            <ClipboardList size={16} className="mr-2"/> 1-Click Summary
          </button>
          <button 
            onClick={() => { localStorage.removeItem('medmate_patient_id'); window.location.href = '/'; }}
            className="text-sm font-medium text-gray-400 hover:text-red-500 transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Trust Bar */}
      <div className="bg-teal-900 text-white">
        <div className="max-w-7xl mx-auto px-8 py-3 flex flex-wrap justify-center gap-8">
          {[
            { label: "Registered Specialists", value: "4" },
            { label: "AI Triage Available", value: "24/7" },
            { label: "Avg. Booking Time", value: "< 2 min" },
            { label: "Instant Calendar Sync", value: "✓ Live" },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="font-extrabold text-emerald-300 text-lg leading-none">{stat.value}</p>
              <p className="text-teal-300 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">

        {/* Personalized Greeting */}
        <div>
          <h2 className="text-2xl font-extrabold text-teal-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {data.patient.name.split(' ')[0]} 👋
          </h2>
          <p className="text-gray-500 mt-1 text-sm">Your AI health assistant is online and ready. What can we help you with today?</p>
        </div>


        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Profile & Med History */}
        <div className="lg:col-span-4 space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-28 bg-gradient-to-r from-emerald-500 to-teal-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative w-28 h-28 rounded-full mx-auto mt-8 border-4 border-white shadow-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-4xl font-extrabold transition-transform duration-500 group-hover:scale-105 z-10">
              {data.patient.name.charAt(0)}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-5 relative z-10">{data.patient.name}</h2>
            <p className="text-gray-500 font-medium relative z-10">{data.patient.gender} • {data.patient.age} years old</p>
            <div className="mt-5 inline-flex items-center bg-rose-50 text-rose-700 text-xs px-4 py-2 rounded-full border border-rose-100 font-semibold shadow-sm relative z-10">
              <AlertTriangle size={14} className="mr-1.5"/> Emergency: {data.patient.emergency_contact}
            </div>
            <button onClick={() => {
              const [eName, ePhone] = data.patient.emergency_contact.split(' (');
              setEditForm({
                name: data.patient.name, age: data.patient.age.toString(), gender: data.patient.gender, email: data.patient.email,
                emergency_contact_name: eName !== "None" ? eName : '', emergency_contact_phone: ePhone ? ePhone.replace(')', '') : '',
                chronic_conditions: data.medical_history.chronic_conditions, medications: data.medical_history.medications, allergies: data.medical_history.allergies
              });
              setShowEditModal(true);
            }} className="mt-4 w-full bg-slate-50 text-slate-600 font-bold py-2 rounded-xl text-sm border border-slate-200 hover:bg-slate-100 hover:text-emerald-700 transition-colors relative z-10">
              ✏️ Edit Profile
            </button>
          </div>

          {/* Medical History */}
          <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-5 flex items-center text-lg"><Activity size={20} className="mr-2 text-emerald-500"/> Health Profile</h3>
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Chronic Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {data.medical_history.chronic_conditions.split(',').map(c => <span key={c} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-sm font-medium">{c.trim()}</span>)}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Medications</p>
                <div className="flex flex-wrap gap-2">
                  {data.medical_history.medications.split(',').map(m => <span key={m} className="bg-teal-50 text-teal-700 px-3 py-1 rounded-lg text-sm font-medium border border-teal-100">{m.trim()}</span>)}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Allergies</p>
                <div className="flex flex-wrap gap-2">
                  {data.medical_history.allergies.split(',').map(a => <span key={a} className="bg-orange-50 text-orange-700 px-3 py-1 rounded-lg text-sm font-medium border border-orange-100">{a.trim()}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Appointments & Actions */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Upcoming Appointment */}
          <div>
            <h3 className="text-xl font-extrabold text-gray-900 mb-5 flex items-center">
              <Calendar className="mr-2 text-emerald-500"/> Upcoming Appointments
            </h3>
            {upcomingAppts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {upcomingAppts.map(a => (
                  <div key={a.id} className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-3xl p-6 text-white shadow-xl shadow-teal-900/20 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-default">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors"></div>
                    <Stethoscope className="absolute -right-2 -bottom-2 opacity-10 transform -rotate-12 group-hover:scale-110 transition-transform duration-500" size={120}/>
                    <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-2">Confirmed</p>
                    <h4 className="text-2xl font-bold mb-6">{a.doctor_name}</h4>
                    <div className="bg-white/20 p-3.5 rounded-xl backdrop-blur-md flex items-center text-sm font-semibold shadow-sm">
                      <Clock size={18} className="mr-2"/>
                      {new Date(a.scheduled_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 text-center border border-dashed border-gray-300 text-gray-400 shadow-sm">
                <Calendar size={40} className="mx-auto mb-3 opacity-50"/>
                <p className="font-medium">No upcoming appointments.</p>
                <p className="text-sm mt-1">Use the AI Triage chat in the corner to book one seamlessly.</p>
              </div>
            )}
          </div>

          {/* Past History & Uploads Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Past Appointments */}
            <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-5 text-lg">Past Visits</h3>
              {pastAppts.length > 0 ? (
                <ul className="space-y-4">
                  {pastAppts.map(a => (
                    <li key={a.id} onClick={() => setSelectedPastAppt(a)} className="flex justify-between items-center text-sm p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-gray-200">
                      <div className="flex items-center">
                        <div className="bg-emerald-100 p-2 rounded-full mr-3 text-emerald-600">
                          <User size={16}/>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{a.doctor_name}</p>
                          <p className="text-emerald-600 font-medium text-xs">{a.doctor_specialization}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-gray-400 text-xs font-medium bg-white px-2 py-1 rounded shadow-sm border border-gray-100 mb-1">{new Date(a.scheduled_time).toLocaleDateString()}</span>
                        <span className="text-[10px] text-blue-500 font-semibold underline">View notes</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 italic text-center py-4">No past records found.</p>
              )}
            </div>

            {/* Upload Records */}
            <div onClick={() => setShowDocsModal(true)} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center justify-center group cursor-pointer hover:border-emerald-300 hover:shadow-xl transition-all duration-300">
              <div className="bg-emerald-50 p-5 rounded-full mb-4 group-hover:scale-110 group-hover:bg-emerald-100 transition-all duration-300">
                <FileUp size={32} className="text-emerald-600" />
              </div>
              <h4 className="font-bold text-gray-900 text-lg">Upload Documents</h4>
              <p className="text-sm text-gray-500 mt-2 mb-4">Securely upload lab reports & scans for AI biomarker parsing.</p>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full uppercase font-bold tracking-widest">Phase 2 Preview</span>
            </div>
          </div>
        </div>
        </div>
      </main>

      {/* Floating "See a Doctor Now" CTA — Inspired by medmate.com.au */}
      {!isChatOpen && (
        <button 
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-8 right-8 bg-emerald-600 text-white shadow-2xl shadow-emerald-600/50 hover:bg-emerald-500 hover:scale-105 transition-all duration-300 flex items-center z-40 border-2 border-white rounded-full px-6 py-4 gap-3 animate-pulse-slow"
        >
          <div className="relative">
            <Bot size={24} />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border border-white"></div>
          </div>
          <div className="text-left">
            <p className="font-extrabold text-sm leading-none">See a Doctor Now</p>
            <p className="text-emerald-200 text-[10px] font-medium mt-0.5">AI Triage Online 24/7</p>
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isChatOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-[450px] h-[75vh] max-h-[700px] bg-white sm:rounded-[2rem] shadow-2xl flex flex-col border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-8 z-50">
          <div className="bg-white p-5 flex justify-between items-center border-b border-gray-100 z-10">
            <div className="flex items-center font-bold text-gray-900">
              <div className="bg-emerald-100 p-2 rounded-full mr-3 text-emerald-600 relative">
                 <Bot size={20} />
                 <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <p>MedMate AI</p>
                <p className="text-xs text-emerald-600 font-medium">Medical Triage Assistant</p>
              </div>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="hover:bg-gray-100 text-gray-400 hover:text-gray-600 p-2 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50 relative">
            {messages.map((msg, idx) => {
              const hasCarousel = msg.content.includes('[SHOW_CAROUSEL]');
              const cleanContent = msg.content.replace('[SHOW_CAROUSEL]', '').trim();
              
              return (
                <div key={idx} className="w-full">
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
                    <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-2xl rounded-tr-sm shadow-md' : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm'} p-4`}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ wordBreak: 'break-word' }}>
                        {cleanContent.split(/(https?:\/\/[^\s)]+)/g).map((part, i) => 
                          part.match(/(https?:\/\/[^\s)]+)/) ? (
                            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={`${msg.role === 'user' ? 'text-emerald-100' : 'text-emerald-600'} underline font-semibold break-all`}>
                              Click to Add to Google Calendar
                            </a>
                          ) : part
                        )}
                      </p>
                    </div>
                  </div>
                  {/* Render dynamic UI widget if tag exists */}
                  {hasCarousel && msg.role === 'bot' && (
                    <DoctorCarousel
                      onSelect={(msg) => { setInput(msg); }}
                      onSlotBook={(msg) => {
                        setMessages(prev => [...prev, { role: 'user', content: msg }]);
                        setLoading(true);
                        axios.post('http://localhost:8001/chat', {
                          patient_id: parseInt(patientId!),
                          message: msg,
                          history: messages.map(m => ({ role: m.role, content: m.content.replace('[SHOW_CAROUSEL]', '') }))
                        }).then(res => {
                          setLoading(false);
                          streamBotMessage(res.data.reply, refreshDashboard);
                        }).catch(() => {
                          setLoading(false);
                          setMessages(prev => [...prev, { role: 'bot', content: 'Sorry, booking failed. Please try again.' }]);
                        });
                      }}
                    />
                  )}
                </div>
              );
            })}
            {loading && (
               <div className="flex justify-start">
                 <div className="bg-white border border-gray-100 shadow-sm p-4 rounded-2xl rounded-tl-sm flex space-x-1.5 items-center">
                   <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                   <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay:'0.1s'}}></div>
                   <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></div>
                 </div>
               </div>
            )}
            {/* Live streaming bubble */}
            {isStreaming && streamingText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ wordBreak: 'break-word' }}>
                    {streamingText.replace('[SHOW_CAROUSEL]', '').trim()}
                    <span className="inline-block w-0.5 h-4 bg-emerald-500 ml-0.5 animate-pulse align-middle"/>
                  </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-100">
            <form onSubmit={handleSend} className="flex gap-2 bg-gray-50 rounded-full p-1.5 border border-gray-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Describe your symptoms..." disabled={loading || isStreaming} className="flex-1 bg-transparent px-4 py-2 focus:outline-none text-sm text-gray-800 font-medium placeholder-gray-400" />
              <button type="submit" disabled={loading || isStreaming || !input.trim()} className="bg-emerald-600 text-white rounded-full p-2.5 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm">
                <Send size={18} className="ml-0.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-emerald-700 p-5 text-white flex justify-between items-center shadow-md relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <h3 className="font-bold flex items-center text-lg z-10"><ClipboardList size={20} className="mr-2 text-emerald-200"/> Emergency Medical Dossier</h3>
              <button onClick={() => setShowSummaryModal(false)} className="hover:bg-white/20 p-1.5 rounded-full transition z-10"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
              
              {loadingSummary ? (
                <div className="flex flex-col items-center justify-center py-12 text-emerald-600">
                  <Activity size={40} className="animate-pulse mb-4" />
                  <p className="font-bold animate-pulse">MedMate AI is generating structured dossier...</p>
                </div>
              ) : aiSummaryData?.error ? (
                <div className="bg-red-50 p-6 rounded-2xl border border-red-200 text-red-700 font-medium">
                  {aiSummaryData.error}
                </div>
              ) : aiSummaryData ? (
                <div className="space-y-6">
                  {/* 1. TOP-LEVEL EMERGENCY ALERT BANNER */}
                  {aiSummaryData.alerts && (Array.isArray(aiSummaryData.alerts) ? aiSummaryData.alerts.length > 0 : true) && (
                    <div className="bg-rose-600 text-white p-4 rounded-xl shadow-lg border border-rose-700 animate-in slide-in-from-top-2">
                      <h4 className="font-extrabold flex items-center mb-2"><ShieldAlert size={18} className="mr-2"/> CRITICAL ALERTS</h4>
                      <ul className="list-disc pl-6 space-y-1 font-medium text-sm">
                        {Array.isArray(aiSummaryData.alerts) ? aiSummaryData.alerts.map((alert: string, i: number) => <li key={i}>{alert}</li>) : <li>{aiSummaryData.alerts}</li>}
                      </ul>
                    </div>
                  )}

                  {/* 2. PATIENT SNAPSHOT SECTION */}
                  {aiSummaryData.patient_snapshot && (
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <h4 className="font-bold text-gray-900 border-b pb-2 mb-4 flex items-center"><User size={16} className="mr-2 text-emerald-600"/> Patient Snapshot</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase">Demographics</p>
                          <p className="font-medium text-gray-800 text-sm mb-3">{aiSummaryData.patient_snapshot.demographics}</p>
                          <p className="text-xs font-bold text-gray-400 uppercase">Primary Complaints</p>
                          <ul className="list-disc pl-4 text-sm text-gray-800 mb-3">
                            {Array.isArray(aiSummaryData.patient_snapshot.primary_complaints) ? aiSummaryData.patient_snapshot.primary_complaints.map((c: string, i: number) => <li key={i}>{c}</li>) : <li>{aiSummaryData.patient_snapshot.primary_complaints}</li>}
                          </ul>
                          <p className="text-xs font-bold text-gray-400 uppercase">Associated Symptoms</p>
                          <ul className="list-disc pl-4 text-sm text-gray-800">
                            {Array.isArray(aiSummaryData.patient_snapshot.associated_symptoms) ? aiSummaryData.patient_snapshot.associated_symptoms.map((c: string, i: number) => <li key={i}>{c}</li>) : <li>{aiSummaryData.patient_snapshot.associated_symptoms}</li>}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase">Physical Exam Findings</p>
                          <ul className="list-disc pl-4 text-sm text-gray-800 mb-3">
                            {Array.isArray(aiSummaryData.patient_snapshot.physical_exam) ? aiSummaryData.patient_snapshot.physical_exam.map((c: string, i: number) => <li key={i}>{c}</li>) : <li>{aiSummaryData.patient_snapshot.physical_exam}</li>}
                          </ul>
                          <p className="text-xs font-bold text-gray-400 uppercase">Chronic History</p>
                          <ul className="list-disc pl-4 text-sm text-gray-800">
                            {Array.isArray(aiSummaryData.patient_snapshot.chronic_history) ? aiSummaryData.patient_snapshot.chronic_history.map((c: string, i: number) => <li key={i}>{c}</li>) : <li>{aiSummaryData.patient_snapshot.chronic_history}</li>}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. GROUPED ACTIVE PRESCRIPTIONS */}
                  {Array.isArray(aiSummaryData.active_prescriptions) && aiSummaryData.active_prescriptions.length > 0 && (
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <h4 className="font-bold text-gray-900 border-b pb-2 mb-4 flex items-center"><Pill size={16} className="mr-2 text-blue-500"/> Active Prescriptions</h4>
                      <div className="space-y-4">
                        {aiSummaryData.active_prescriptions.map((group: any, i: number) => (
                          <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <h5 className="font-bold text-blue-700 text-sm mb-2">{group.category}</h5>
                            <div className="space-y-2">
                              {Array.isArray(group.medications) ? group.medications.map((med: any, j: number) => (
                                <div key={j} className="flex flex-wrap items-center gap-2 text-sm bg-white p-2 rounded shadow-sm border border-gray-50">
                                  <span className="font-bold text-gray-800">{med.name}</span>
                                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{med.dosage}</span>
                                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{med.frequency}</span>
                                  <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs">{med.timing}</span>
                                  <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-xs">{med.duration}</span>
                                </div>
                              )) : <p className="text-sm">{group.medications}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. PENDING INVESTIGATIONS & ORDERS */}
                  {Array.isArray(aiSummaryData.pending_investigations) && aiSummaryData.pending_investigations.length > 0 && (
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <h4 className="font-bold text-gray-900 border-b pb-2 mb-4 flex items-center"><Activity size={16} className="mr-2 text-purple-500"/> Pending Investigations & Orders</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {aiSummaryData.pending_investigations.map((inv: any, i: number) => (
                          <div key={i} className="bg-purple-50 border border-purple-100 p-3 rounded-lg">
                            <h5 className="font-bold text-purple-700 text-sm mb-1">{inv.category}</h5>
                            <ul className="list-disc pl-4 text-xs text-purple-900 font-medium">
                              {Array.isArray(inv.tests) ? inv.tests.map((test: string, j: number) => <li key={j}>{test}</li>) : <li>{inv.tests}</li>}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* INSTRUCTIONS & FOLLOW UP */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {aiSummaryData.instructions && (Array.isArray(aiSummaryData.instructions) ? aiSummaryData.instructions.length > 0 : true) && (
                      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <h5 className="font-bold text-emerald-800 text-sm mb-2 flex items-center"><ClipboardList size={14} className="mr-1"/> Instructions</h5>
                        <ul className="list-disc pl-4 text-xs text-emerald-900 font-medium space-y-1">
                          {Array.isArray(aiSummaryData.instructions) ? aiSummaryData.instructions.map((inst: string, i: number) => <li key={i}>{inst}</li>) : <li>{aiSummaryData.instructions}</li>}
                        </ul>
                      </div>
                    )}
                    {aiSummaryData.follow_up && (
                      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <h5 className="font-bold text-indigo-800 text-sm mb-2 flex items-center"><Calendar size={14} className="mr-1"/> Follow-up</h5>
                        <p className="text-sm text-indigo-900 font-bold">{aiSummaryData.follow_up}</p>
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">No summary available.</div>
              )}
              
            </div>
            
            <div className="p-5 bg-white border-t border-gray-100 flex gap-3">
              <button 
                onClick={() => { if(aiSummaryData) { navigator.clipboard.writeText(JSON.stringify(aiSummaryData, null, 2)); alert('Summary copied to clipboard!'); } }}
                disabled={loadingSummary || !aiSummaryData}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all duration-300"
              >
                Copy Raw Data
              </button>
              <button 
                onClick={() => { setShowSummaryModal(false); }}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-500 hover:shadow-lg transition-all duration-300"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Past Visit Modal */}
      {selectedPastAppt && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-800 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold flex items-center text-lg"><Clock size={18} className="mr-2 text-slate-300"/> Consultation Notes</h3>
                <p className="text-xs text-slate-300 mt-1">{new Date(selectedPastAppt.scheduled_time).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedPastAppt(null)} className="hover:bg-white/20 p-1.5 rounded-full transition"><X size={20}/></button>
            </div>
            <div className="p-6">
              <div className="flex items-center mb-6 bg-slate-50 p-3 rounded-xl border border-gray-100">
                <div className="bg-slate-200 p-2 rounded-full mr-3 text-slate-600">
                  <User size={20}/>
                </div>
                <div>
                  <p className="font-bold text-gray-900">Attending: {selectedPastAppt.doctor_name}</p>
                  <p className="text-slate-500 font-medium text-xs">{selectedPastAppt.doctor_specialization}</p>
                </div>
              </div>
              
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center"><Activity size={14} className="mr-1 text-emerald-500"/> Diagnosis</h4>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 text-sm text-gray-800 leading-relaxed font-medium mb-4 shadow-sm">
                {selectedPastAppt.diagnosis || "No diagnosis recorded."}
              </div>

              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center"><Pill size={14} className="mr-1 text-blue-500"/> Prescription</h4>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 text-sm text-gray-800 leading-relaxed font-medium shadow-sm">
                {selectedPastAppt.prescription || "No prescription recorded."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-emerald-600 p-5 text-white flex justify-between items-center shadow-md relative overflow-hidden">
              <h3 className="font-bold flex items-center text-lg z-10"><User size={20} className="mr-2 text-emerald-200"/> Edit Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="hover:bg-white/20 p-1.5 rounded-full transition z-10"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
              <div>
                <h4 className="font-bold text-gray-900 mb-3 border-b pb-2">Basic Info</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-500">Name</label><input required className="mt-1 w-full rounded-xl border-gray-300 shadow-sm p-2 text-black" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}/></div>
                  <div><label className="block text-xs font-bold text-gray-500">Age</label><input required type="number" className="mt-1 w-full rounded-xl border-gray-300 shadow-sm p-2 text-black" value={editForm.age} onChange={e => setEditForm({...editForm, age: e.target.value})}/></div>
                  <div><label className="block text-xs font-bold text-gray-500">Gender</label><select required className="mt-1 w-full rounded-xl border-gray-300 shadow-sm p-2 text-black" value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})}><option>Male</option><option>Female</option><option>Other</option></select></div>
                  <div><label className="block text-xs font-bold text-gray-500">Email</label><input required className="mt-1 w-full rounded-xl border-gray-300 shadow-sm p-2 text-black" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}/></div>
                </div>
              </div>
              
              <div>
                <h4 className="font-bold text-gray-900 mb-3 border-b pb-2 text-rose-600">Emergency Contact</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-500">Contact Name</label><input className="mt-1 w-full rounded-xl border-gray-300 shadow-sm p-2 text-black" value={editForm.emergency_contact_name} onChange={e => setEditForm({...editForm, emergency_contact_name: e.target.value})}/></div>
                  <div><label className="block text-xs font-bold text-gray-500">Contact Phone</label><input className="mt-1 w-full rounded-xl border-gray-300 shadow-sm p-2 text-black" value={editForm.emergency_contact_phone} onChange={e => setEditForm({...editForm, emergency_contact_phone: e.target.value})}/></div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-3 border-b pb-2 text-emerald-600">Medical History</h4>
                <div className="space-y-4">
                  <div><label className="block text-xs font-bold text-gray-500">Chronic Conditions</label><input className="mt-1 w-full rounded-xl border-gray-300 shadow-sm p-2 text-black" value={editForm.chronic_conditions} onChange={e => setEditForm({...editForm, chronic_conditions: e.target.value})}/></div>
                  <div><label className="block text-xs font-bold text-gray-500">Medications</label><input className="mt-1 w-full rounded-xl border-gray-300 shadow-sm p-2 text-black" value={editForm.medications} onChange={e => setEditForm({...editForm, medications: e.target.value})}/></div>
                  <div><label className="block text-xs font-bold text-gray-500">Allergies</label><input className="mt-1 w-full rounded-xl border-gray-300 shadow-sm p-2 text-black" value={editForm.allergies} onChange={e => setEditForm({...editForm, allergies: e.target.value})}/></div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Docs Modal */}
      {showDocsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-teal-700 p-5 text-white flex justify-between items-center shadow-md relative overflow-hidden">
              <h3 className="font-bold flex items-center text-lg z-10"><FileUp size={20} className="mr-2 text-teal-200"/> Document Gallery & AI Parser</h3>
              <button onClick={() => setShowDocsModal(false)} className="hover:bg-white/20 p-1.5 rounded-full transition z-10"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
              {/* Upload Area */}
              <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-teal-200 text-center relative hover:bg-teal-50 transition-colors">
                <input type="file" onChange={handleFileUpload} accept=".pdf,image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={uploadingDoc}/>
                <FileUp size={40} className={`mx-auto mb-3 ${uploadingDoc ? 'text-teal-300 animate-bounce' : 'text-teal-500'}`}/>
                <p className="font-bold text-gray-800 text-lg">{uploadingDoc ? 'Uploading & Analyzing...' : 'Click or Drag to Upload Report'}</p>
                <p className="text-sm text-gray-500 mt-1">PDF or Images. Our AI will automatically parse and summarize it.</p>
              </div>

              {/* Gallery */}
              <div>
                <h4 className="font-bold text-gray-900 mb-4 flex items-center"><ClipboardList size={18} className="mr-2 text-teal-600"/> Uploaded Reports</h4>
                {documents.length > 0 ? (
                  <div className="space-y-4">
                    {documents.map(doc => (
                      <div key={doc.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-bold text-gray-900 break-all">{doc.filename}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{new Date(doc.upload_time).toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => toggleSummary(doc.id)} className="bg-teal-50 text-teal-600 px-3 py-2 rounded-lg font-bold text-xs hover:bg-teal-100 transition">
                              {expandedDocs.has(doc.id) ? "Hide Summary" : "Show Summary"}
                            </button>
                            {doc.file_url && (
                              <a href={`http://localhost:8001${doc.file_url}`} target="_blank" rel="noopener noreferrer" className="bg-indigo-50 text-indigo-600 p-2 rounded-lg hover:bg-indigo-100 transition" title="View Original">
                                <Eye size={16}/>
                              </a>
                            )}
                            <button onClick={() => handleDeleteDocument(doc.id)} className="bg-rose-50 text-rose-600 p-2 rounded-lg hover:bg-rose-100 transition" title="Delete"><Trash2 size={16}/></button>
                            
                            {/* Share Dropdown */}
                            <div className="relative">
                              <button 
                                onClick={() => setActiveShareDropdown(activeShareDropdown === doc.id ? null : doc.id)} 
                                className="bg-blue-50 text-blue-600 px-3 py-2 rounded-lg font-bold text-xs hover:bg-blue-100 transition flex items-center"
                              >
                                <Share2 size={14} className="mr-1"/> Share
                              </button>
                              
                              {activeShareDropdown === doc.id && (
                                <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-100 rounded-xl shadow-xl z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                  <a href={`mailto:?subject=My Medical Report&body=AI Summary of my report: ${doc.summary}`} className="block px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition font-medium border-b border-gray-50">Email</a>
                                  <a href={`whatsapp://send?text=My Medical Report Summary: ${doc.summary}`} className="block px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition font-medium">WhatsApp</a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {expandedDocs.has(doc.id) && (
                          <div className="bg-slate-50 p-4 rounded-xl border border-gray-100 mt-3 animate-in fade-in duration-200">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center"><Bot size={12} className="mr-1 text-teal-500"/> AI Layman Summary</p>
                            <p className="text-sm text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">{doc.summary}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 py-8 italic border border-dashed border-gray-200 rounded-2xl bg-white">No documents uploaded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-500 font-medium">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
