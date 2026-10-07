"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Calendar, Activity, AlertTriangle, Clock, Bot, Video, FileText, CheckCircle2, Pill, ShieldAlert } from 'lucide-react';

interface Appointment {
  appointment_id: number;
  scheduled_time: string;
  status: string;
  pre_consultation_summary: string;
  diagnosis?: string;
  prescription?: string;
  patient_name: string;
  patient_age: number;
  emergency_contact: string;
}

const DOCTOR_STATS = {
  1: { patients: 1240, rating: 4.9, spec: "Cardiologist", name: "Dr. Smith" },
  2: { patients: 3800, rating: 4.8, spec: "General Physician", name: "Dr. Jones" },
  3: { patients: 920, rating: 4.9, spec: "Endocrinologist", name: "Dr. Emily Chen" },
  4: { patients: 710, rating: 4.7, spec: "Neurologist", name: "Dr. Sarah Connor" },
};

export default function DoctorDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  
  const [doctorId, setDoctorId] = useState<1|2|3|4>(1);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  // Map emails to doctor IDs for the mock login
  const DOCTOR_EMAILS: Record<string, 1|2|3|4> = {
    'smith@example.com': 1,
    'jones@example.com': 2,
    'echen@example.com': 3,
    'sconnor@example.com': 4
  };

  const handleDoctorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const id = DOCTOR_EMAILS[loginEmail.toLowerCase()];
    if (id) {
      setDoctorId(id);
      setIsLoggedIn(true);
    } else {
      alert("Doctor not found. Try smith@example.com, jones@example.com, echen@example.com, or sconnor@example.com");
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchAppointments();
    }
  }, [doctorId, isLoggedIn]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:8001/appointments/doctor/${doctorId}`);
      const now = new Date().getTime();
      
      // Filter out past appointments (expired)
      const futureAppts = res.data.appointments.filter((a: Appointment) => new Date(a.scheduled_time).getTime() >= now);
      
      // Sort: upcoming by most imminent
      const sorted = futureAppts.sort((a: Appointment, b: Appointment) => {
        const timeA = new Date(a.scheduled_time).getTime();
        const timeB = new Date(b.scheduled_time).getTime();
        return timeA - timeB;
      });
      setAppointments(sorted);
    } catch (error) {
      console.error("Failed to fetch appointments", error);
    }
    setLoading(false);
  };

  const docProfile = DOCTOR_STATS[doctorId];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div className="text-center">
            <Activity className="mx-auto h-12 w-12 text-emerald-600" />
            <h2 className="mt-6 text-3xl font-extrabold text-teal-900">Provider Login</h2>
            <p className="mt-2 text-sm text-gray-600">Access your clinical dashboard and queue.</p>
          </div>
          <form className="mt-8 space-y-6 bg-white p-8 rounded-2xl shadow-xl border border-gray-100" onSubmit={handleDoctorLogin}>
            <div>
              <label className="block text-sm font-bold text-gray-700">Provider Email</label>
              <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-xl py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-black" placeholder="smith@example.com"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700">Password</label>
              <input type="password" required className="mt-1 block w-full border border-gray-300 rounded-xl py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-black" placeholder="••••••••"/>
            </div>
            <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 transition-colors">
              Log In securely
            </button>
            <p className="text-xs text-center text-gray-400 mt-4">Hint: Try <b>smith@example.com</b> or <b>jones@example.com</b></p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md shadow-sm py-4 px-8 flex justify-between items-center z-10 sticky top-0 border-b border-gray-100">
        <h1 className="text-2xl font-extrabold text-teal-900 flex items-center tracking-tight">
          <Activity className="mr-2 text-emerald-500" strokeWidth={2.5}/> MedMate Provider
        </h1>
        
        {/* Mock Login / Doctor Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Viewing as</label>
          <select 
            value={doctorId} 
            onChange={(e) => setDoctorId(parseInt(e.target.value) as 1|2|3|4)}
            className="bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm py-2 px-3 font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer"
          >
            <option value={1}>Dr. Smith (Cardiologist)</option>
            <option value={2}>Dr. Jones (General Physician)</option>
            <option value={3}>Dr. Emily Chen (Endocrinologist)</option>
            <option value={4}>Dr. Sarah Connor (Neurologist)</option>
          </select>
        </div>
      </header>

      {/* Provider Trust & Stats Bar */}
      <div className="bg-teal-900 text-white">
        <div className="max-w-7xl mx-auto px-8 py-3 flex flex-wrap justify-center gap-8">
          {[
            { label: "Total Patients", value: docProfile.patients.toLocaleString() },
            { label: "Provider Rating", value: `${docProfile.rating} ⭐` },
            { label: "AI Co-Pilot", value: "Active" },
            { label: "Next Availability", value: "Today" },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="font-extrabold text-emerald-300 text-lg leading-none">{stat.value}</p>
              <p className="text-teal-300 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        
        {/* Personalized Greeting */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-extrabold text-teal-900">
              Provider Dashboard 👋
            </h2>
            <p className="text-gray-500 mt-1 text-sm">Review your AI-triaged patient queue and past consultations.</p>
          </div>
          <button onClick={fetchAppointments} className="flex items-center text-sm font-semibold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full hover:bg-emerald-100 hover:shadow-sm transition-all duration-300">
            ↻ Refresh Queue
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex space-x-2 items-center">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay:'0.1s'}}></div>
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></div>
            </div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-dashed border-gray-300 p-16 text-center group cursor-pointer hover:border-emerald-300 transition-colors">
            <div className="bg-slate-50 p-6 rounded-full inline-block mb-4 group-hover:bg-emerald-50 transition-colors">
              <Calendar className="text-gray-300 group-hover:text-emerald-400 transition-colors" size={48} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No appointments scheduled</h3>
            <p className="text-gray-500 mt-2">When the AI triage agent books a patient, their dossier will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {appointments.map((appt) => {
              const isPast = appt.status === 'completed';
              
              return (
                <div key={appt.appointment_id} className={`bg-white rounded-3xl shadow-sm border transition-all duration-300 overflow-hidden group ${isPast ? 'border-gray-100 hover:shadow-md' : 'border-emerald-100 shadow-emerald-900/5 hover:shadow-xl hover:-translate-y-1'}`}>
                  
                  {/* Card Header */}
                  <div className={`px-6 py-4 flex justify-between items-center ${isPast ? 'bg-slate-50 border-b border-gray-100' : 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white'}`}>
                    <div className="flex items-center font-bold">
                      <Clock className={`mr-2 ${isPast ? 'text-gray-400' : 'text-emerald-200'}`} size={20} /> 
                      {new Date(appt.scheduled_time).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center ${isPast ? 'bg-white text-gray-500 border border-gray-200' : 'bg-white/20 text-white backdrop-blur-sm shadow-sm'}`}>
                      {isPast ? <CheckCircle2 size={14} className="mr-1"/> : <Calendar size={14} className="mr-1"/>}
                      {appt.status}
                    </span>
                  </div>
                  
                  <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Left: Patient Info (4 cols) */}
                    <div className="md:col-span-4 space-y-6">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Patient Dossier</p>
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full border-2 border-gray-100 shadow-sm bg-gray-50 flex items-center justify-center text-gray-400">
                            <User size={32} />
                          </div>
                          <div>
                            <p className="font-extrabold text-gray-900 text-xl">{appt.patient_name}</p>
                            <p className="text-sm font-medium text-gray-500">Age: {appt.patient_age}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100 shadow-sm">
                        <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest flex items-center mb-1">
                          <AlertTriangle size={14} className="mr-1" /> Priority 1 Contact
                        </h4>
                        <p className="text-sm font-bold text-rose-900">{appt.emergency_contact}</p>
                      </div>

                      {!isPast && (
                        <button className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-slate-800 hover:shadow-xl transition-all duration-300 flex justify-center items-center">
                          <Video size={18} className="mr-2" /> Start Telehealth Call
                        </button>
                      )}
                    </div>

                    {/* Right: AI & Clinical Notes (8 cols) */}
                    <div className="md:col-span-8 space-y-4">
                      
                      <div className="bg-slate-50 rounded-2xl p-5 border border-gray-100 h-full">
                        <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3 flex items-center">
                          <Bot size={16} className="mr-1.5" /> AI Pre-Consultation Summary
                        </h3>
                        
                        {(() => {
                          let aiSummaryData = null;
                          try {
                            aiSummaryData = JSON.parse(appt.pre_consultation_summary);
                          } catch (e) {
                            // Fallback if not JSON
                            return <div className="bg-white rounded-xl p-4 border border-gray-100 text-gray-800 text-sm font-medium leading-relaxed shadow-sm whitespace-pre-wrap">{appt.pre_consultation_summary}</div>;
                          }
                          
                          return (
                            <div className="space-y-6">
                              {/* 1. TOP-LEVEL EMERGENCY ALERT BANNER */}
                              {aiSummaryData.alerts && (Array.isArray(aiSummaryData.alerts) ? aiSummaryData.alerts.length > 0 : true) && (
                                <div className="bg-rose-600 text-white p-4 rounded-xl shadow-lg border border-rose-700">
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
                                      <p className="text-xs font-bold text-gray-400 uppercase">Primary Complaints (HPI)</p>
                                      <ul className="list-disc pl-4 text-sm text-gray-800 mb-3">
                                        {Array.isArray(aiSummaryData.patient_snapshot.primary_complaints) ? aiSummaryData.patient_snapshot.primary_complaints.map((c: string, i: number) => <li key={i}>{c}</li>) : <li>{aiSummaryData.patient_snapshot.primary_complaints}</li>}
                                      </ul>
                                      <p className="text-xs font-bold text-gray-400 uppercase">Associated Symptoms</p>
                                      <ul className="list-disc pl-4 text-sm text-gray-800">
                                        {Array.isArray(aiSummaryData.patient_snapshot.associated_symptoms) ? aiSummaryData.patient_snapshot.associated_symptoms.map((c: string, i: number) => <li key={i}>{c}</li>) : <li>{aiSummaryData.patient_snapshot.associated_symptoms}</li>}
                                      </ul>
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-gray-400 uppercase">Physical Exam / Observations</p>
                                      <ul className="list-disc pl-4 text-sm text-gray-800 mb-3">
                                        {Array.isArray(aiSummaryData.patient_snapshot.physical_exam) ? aiSummaryData.patient_snapshot.physical_exam.map((c: string, i: number) => <li key={i}>{c}</li>) : <li>{aiSummaryData.patient_snapshot.physical_exam}</li>}
                                      </ul>
                                      <p className="text-xs font-bold text-gray-400 uppercase">Relevant Chronic History</p>
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
                                  <h4 className="font-bold text-gray-900 border-b pb-2 mb-4 flex items-center"><Pill size={16} className="mr-2 text-blue-500"/> Relevant Prescriptions</h4>
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
                                            </div>
                                          )) : <p className="text-sm">{group.medications}</p>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 4. RELEVANT INVESTIGATIONS */}
                              {Array.isArray(aiSummaryData.pending_investigations) && aiSummaryData.pending_investigations.length > 0 && (
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                  <h4 className="font-bold text-gray-900 border-b pb-2 mb-4 flex items-center"><Activity size={16} className="mr-2 text-purple-500"/> Relevant Investigations (From Documents)</h4>
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
                            </div>
                          );
                        })()}
                      </div>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
