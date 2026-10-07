"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FileUp, User, Activity, ShieldAlert, Pill, CalendarCheck, HeartPulse, Bot, Star, MessageSquareQuote, CheckCircle2, ArrowRight } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<'landing' | 'login' | 'register'>('landing');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Feedback state
  const [feedback, setFeedback] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const [formData, setFormData] = useState({
    name: '', age: '', gender: '', email: '',
    chronic_conditions: '', medications: '', allergies: '',
    emergency_contact_name: '', emergency_contact_phone: '', primary_doctor_id: '',
    google_access_token: ''
  });

  useEffect(() => {
    // Check if user is already remembered
    const savedPatientId = localStorage.getItem('medmate_patient_id');
    if (savedPatientId) {
      router.push(`/dashboard?patient_id=${savedPatientId}`);
    }
  }, [router]);

  const loginWithGoogle = useGoogleLogin({
    onSuccess: (codeResponse) => {
      setFormData({ ...formData, google_access_token: codeResponse.access_token });
      alert("Google Calendar successfully connected!");
    },
    onError: (error) => console.log('Login Failed:', error),
    scope: 'https://www.googleapis.com/auth/calendar.events'
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8001/patients/login', { email: loginEmail });
      if (rememberMe) localStorage.setItem('medmate_patient_id', res.data.id);
      router.push(`/dashboard?patient_id=${res.data.id}`);
    } catch (error) {
      alert('Patient not found or invalid credentials.');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: formData.name, age: parseInt(formData.age), gender: formData.gender, email: formData.email,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        primary_doctor_id: formData.primary_doctor_id ? parseInt(formData.primary_doctor_id) : null,
        google_access_token: formData.google_access_token || null,
        medical_history: {
          chronic_conditions: formData.chronic_conditions || 'None',
          medications: formData.medications || 'None', allergies: formData.allergies || 'None'
        }
      };
      const res = await axios.post('http://localhost:8001/patients/', payload);
      const patientId = res.data.id;
      await axios.post(`http://localhost:8001/sync-rag/${patientId}`);
      router.push(`/dashboard?patient_id=${patientId}`);
    } catch (error) {
      alert('Error registering patient. Is the backend running?');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  // --- RENDERING ---

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
        <button onClick={() => setView('landing')} className="absolute top-8 left-8 text-emerald-600 font-bold flex items-center hover:text-emerald-800"><ChevronLeft className="mr-1"/> Back to Home</button>
        <div className="max-w-md w-full mx-auto space-y-8">
          <div>
            <HeartPulse className="mx-auto h-12 w-12 text-emerald-600" />
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Patient Login</h2>
          </div>
          <form className="mt-8 space-y-6 bg-white p-8 rounded-2xl shadow-xl border border-gray-100" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-bold text-gray-700">Email Address</label>
              <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-black" placeholder="ramesh@example.com"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700">Password</label>
              <input type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-black" placeholder="••••••••"/>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input id="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded" />
                <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-gray-900">Remember me</label>
              </div>
            </div>
            <button type="submit" disabled={loading || !loginEmail} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none disabled:opacity-50 transition-colors">
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'register') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <button onClick={() => setView('landing')} className="absolute top-8 left-8 text-emerald-600 font-bold flex items-center hover:text-emerald-800"><ChevronLeft className="mr-1"/> Back to Home</button>
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">New Patient Registration</h2>
            <p className="mt-2 text-sm text-gray-600">Enter your details so our AI can personalize your triage experience.</p>
          </div>
          <form className="mt-8 space-y-6 bg-white p-8 rounded-2xl shadow-xl border border-gray-100" onSubmit={handleRegister}>
            {/* Same form content as before but inside the new view state */}
            {/* Demographics Section */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center mb-4 border-b pb-2"><User className="mr-2 text-emerald-500" size={20}/> Basic Information</h3>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700">Full Name</label><input required type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-xl py-2 px-3 text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Age</label><input required type="number" name="age" value={formData.age} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-xl py-2 px-3 text-black" /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gender</label>
                  <select required name="gender" value={formData.gender} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-xl py-2 px-3 text-black">
                    <option value="">Select...</option><option value="Male">Male</option><option value="Female">Female</option>
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700">Email Address</label><input required type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-xl py-2 px-3 text-black" /></div>
              </div>
            </div>

            {/* Medical History Section */}
            <div className="pt-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center mb-4 border-b pb-2"><Activity className="mr-2 text-emerald-500" size={20}/> Medical History</h3>
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700">Chronic Conditions</label><input type="text" name="chronic_conditions" placeholder="e.g. Type 2 Diabetes" value={formData.chronic_conditions} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-xl py-2 px-3 text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Current Medications</label><input type="text" name="medications" placeholder="e.g. Metformin" value={formData.medications} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-xl py-2 px-3 text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Allergies</label><input type="text" name="allergies" placeholder="e.g. Penicillin" value={formData.allergies} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-xl py-2 px-3 text-black" /></div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors">
              {loading ? 'Processing...' : 'Complete Registration'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- DEFAULT LANDING PAGE VIEW ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-emerald-200">
      
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center text-teal-900 font-extrabold text-2xl tracking-tight">
            <HeartPulse className="text-emerald-500 mr-2" strokeWidth={2.5} size={32}/> MedMate
          </div>
          <div className="hidden md:flex gap-6 items-center">
            <a href="#features" className="text-sm font-bold text-gray-600 hover:text-emerald-600">Features</a>
            <a href="#reviews" className="text-sm font-bold text-gray-600 hover:text-emerald-600">Patient Reviews</a>
            <a href="http://localhost:3000/doctor" className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors">Provider Portal</a>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setView('login')} className="text-sm font-bold text-emerald-700 bg-emerald-50 px-5 py-2.5 rounded-full hover:bg-emerald-100 transition-colors">Log In</button>
            <button onClick={() => setView('register')} className="text-sm font-bold text-white bg-emerald-600 px-5 py-2.5 rounded-full hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200">Register</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-900 to-teal-900 text-white py-24 px-6 text-center">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <span className="bg-emerald-500/20 text-emerald-200 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest border border-emerald-500/30 inline-block mb-6">Australia's #1 AI Telehealth Platform</span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Your online home for <br className="hidden md:block"/><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200">healthcare 24/7.</span>
          </h1>
          <p className="text-lg md:text-xl text-teal-100 mb-10 max-w-2xl mx-auto font-medium">
            Skip the waiting room. Chat with our AI triage assistant, get a personalized emergency dossier, and instantly book consultations with top Australian registered doctors.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => setView('register')} className="bg-white text-teal-900 font-extrabold px-8 py-4 rounded-full hover:scale-105 transition-transform flex items-center justify-center shadow-2xl shadow-emerald-900/50">
              Get Started Now <ArrowRight size={20} className="ml-2"/>
            </button>
            <button onClick={() => setView('login')} className="bg-emerald-800 border border-emerald-600 text-white font-bold px-8 py-4 rounded-full hover:bg-emerald-700 transition-colors flex items-center justify-center">
              Patient Login
            </button>
          </div>
        </div>
      </section>

      {/* Trust Stats Bar */}
      <div className="bg-emerald-50 border-b border-emerald-100 py-6">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center divide-x divide-emerald-200">
          <div><p className="text-3xl font-extrabold text-teal-900">4.9/5</p><p className="text-sm font-bold text-emerald-700 uppercase tracking-widest">Patient Rating</p></div>
          <div><p className="text-3xl font-extrabold text-teal-900">24/7</p><p className="text-sm font-bold text-emerald-700 uppercase tracking-widest">AI Triage Active</p></div>
          <div><p className="text-3xl font-extrabold text-teal-900">Instant</p><p className="text-sm font-bold text-emerald-700 uppercase tracking-widest">Doctor Booking</p></div>
          <div><p className="text-3xl font-extrabold text-teal-900">100%</p><p className="text-sm font-bold text-emerald-700 uppercase tracking-widest">Registered GPs</p></div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-teal-900 mb-4">How MedMate Works</h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">We combine advanced Artificial Intelligence with top-tier human doctors to give you the fastest, most accurate healthcare experience.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-emerald-900/5 border border-gray-100 hover:-translate-y-2 transition-transform">
            <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-emerald-600"><Bot size={32}/></div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">AI Triage Agent</h3>
            <p className="text-gray-600 leading-relaxed">Our smart chatbot listens to your symptoms, analyzes your medical history, and pre-screens you before you even see a doctor.</p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-emerald-900/5 border border-gray-100 hover:-translate-y-2 transition-transform">
            <div className="bg-teal-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-teal-600"><ShieldAlert size={32}/></div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Emergency Dossier</h3>
            <p className="text-gray-600 leading-relaxed">With one click, generate a highly detailed, copy-pasteable emergency clinical summary containing your priority contacts, allergies, and history.</p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-emerald-900/5 border border-gray-100 hover:-translate-y-2 transition-transform">
            <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-blue-600"><CalendarCheck size={32}/></div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Instant Booking</h3>
            <p className="text-gray-600 leading-relaxed">The AI recommends the right specialist. Click an available time slot right inside the chat window and your appointment is instantly confirmed.</p>
          </div>
        </div>
      </section>

      {/* Patient Reviews Section */}
      <section id="reviews" className="bg-teal-900 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-white mb-4">Trusted by Thousands</h2>
            <p className="text-teal-200 max-w-2xl mx-auto text-lg">Read reviews from real patients who have used MedMate to get fast, reliable care.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Priya S.", review: "The AI triage was incredible. It asked me questions I didn't even think of, and by the time I spoke to Dr. Jones, he already knew exactly what was wrong. The 1-click summary feature is a lifesaver.", img: "https://i.pravatar.cc/150?img=47" },
              { name: "Ramesh K.", review: "I needed a prescription refill for my diabetes medication. The quick-start tiles on the dashboard let me book an appointment with Dr. Emily in literally 30 seconds. Best healthcare app in Australia.", img: "https://i.pravatar.cc/150?img=11" },
              { name: "Anita M.", review: "I was feeling terrible at 2 AM. The AI bot was online instantly to reassure me and book a morning slot with a Neurologist. The interface is gorgeous and incredibly easy to use.", img: "https://i.pravatar.cc/150?img=44" }
            ].map((r, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 relative">
                <MessageSquareQuote size={40} className="text-emerald-100 absolute top-6 right-6"/>
                <div className="flex text-yellow-400 mb-4"><Star className="fill-current" size={16}/><Star className="fill-current" size={16}/><Star className="fill-current" size={16}/><Star className="fill-current" size={16}/><Star className="fill-current" size={16}/></div>
                <p className="text-gray-700 italic mb-6">"{r.review}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-2 border-emerald-100 bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg">
                    {r.name.charAt(0)}
                  </div>
                  <span className="font-bold text-gray-900">{r.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feedback Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto bg-emerald-50 rounded-3xl p-10 text-center border border-emerald-100">
          <h2 className="text-3xl font-extrabold text-teal-900 mb-2">Help Us Improve</h2>
          <p className="text-emerald-700 mb-8">We are constantly updating MedMate. Leave your feedback below!</p>
          
          {feedbackSent ? (
            <div className="bg-white p-6 rounded-2xl flex flex-col items-center">
              <CheckCircle2 size={48} className="text-emerald-500 mb-3"/>
              <h3 className="font-bold text-xl text-gray-900">Thank you!</h3>
              <p className="text-gray-500 mt-1">Your feedback has been received and sent to our product team.</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setFeedbackSent(true); }} className="flex flex-col gap-4">
              <textarea 
                required
                rows={4}
                placeholder="What do you love? What could be better?" 
                className="w-full rounded-2xl border-gray-300 p-4 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-black resize-none"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <button type="submit" className="bg-emerald-600 text-white font-bold py-3 px-6 rounded-full hover:bg-emerald-700 transition-colors w-full sm:w-auto self-center">
                Submit Feedback
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6 text-center text-sm">
        <p className="mb-2 font-bold text-slate-300 flex items-center justify-center"><HeartPulse className="text-emerald-500 mr-2" size={18}/> MedMate Australia Pty Ltd</p>
        <p>© 2026 All Rights Reserved. This is a demonstration portal.</p>
      </footer>
    </div>
  );
}

function ChevronLeft(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m15 18-6-6 6-6"/></svg>
}
