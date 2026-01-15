import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Trash2, Search, User, IdCard, GraduationCap, Sparkles, Loader2, X, Edit3, 
  SortAsc, SortDesc, Upload, Camera, AlertTriangle, Download, FileSpreadsheet, 
  Check, Calendar, Phone, Mail, CreditCard, Users, Hash, DollarSign, Wallet,
  CalendarCheck, History, LayoutDashboard, FileText, Tag, Receipt, Filter,
  PlusCircle, ShieldCheck, ChevronRight, CheckSquare, Square, Layers, Contact,
  Save, RotateCcw, ShieldAlert, Bell, Milestone, LogOut, LogIn, Cloud, CloudOff, RefreshCw
} from 'lucide-react';

// --- Supabase Config (Using placeholders, expected to be configured) ---
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Data Types ---
type AttendanceStatus = 'present' | 'absent' | 'leave';

interface AttendanceRecord {
  date: string;
  status: AttendanceStatus;
}

interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  note: string;
}

interface HistoryEntry {
  id: string;
  date: string;
  title: string;
  description: string;
  category: 'academic' | 'conduct' | 'achievement' | 'other';
}

interface StudentData {
  usn: string;
  name: string;
  marks: number;
  avatar: string | null;
  dateOfJoining: string;
  backlog: number;
  phone: string;
  gmail: string;
  feesPaid: number;
  feesTotal: number;
  parentName: string;
  parentPhone: string;
  parentGmail: string;
  attendance: AttendanceRecord[];
  groups: string[];
  paymentHistory: PaymentRecord[];
  notes: string;
  history: HistoryEntry[];
}

// --- Data Structure: Singly Linked List ---
class StudentNode implements StudentData {
  usn: string; name: string; marks: number; avatar: string | null; dateOfJoining: string;
  backlog: number; phone: string; gmail: string; feesPaid: number; feesTotal: number;
  parentName: string; parentPhone: string; parentGmail: string; attendance: AttendanceRecord[];
  groups: string[]; paymentHistory: PaymentRecord[]; notes: string; history: HistoryEntry[];
  next: StudentNode | null = null;

  constructor(data: StudentData) {
    Object.assign(this, data);
  }
}

class StudentLinkedList {
  head: StudentNode | null = null;

  insert(data: StudentData) {
    const newNode = new StudentNode(data);
    if (!this.head) this.head = newNode;
    else {
      let current = this.head;
      while (current.next) current = current.next;
      current.next = newNode;
    }
  }

  fromArray(data: StudentData[]) {
    this.head = null;
    data.forEach(s => this.insert(s));
  }

  update(oldUsn: string, data: StudentData): boolean {
    const node = this.search(oldUsn);
    if (node) { Object.assign(node, data); return true; }
    return false;
  }

  delete(usn: string): boolean {
    if (!this.head) return false;
    if (this.head.usn === usn) { this.head = this.head.next; return true; }
    let current = this.head;
    while (current.next && current.next.usn !== usn) current = current.next;
    if (current.next) { current.next = current.next.next; return true; }
    return false;
  }

  search(usn: string): StudentNode | null {
    let current = this.head;
    while (current) {
      if (current.usn === usn) return current;
      current = current.next;
    }
    return null;
  }

  sort(criteria: keyof StudentData, ascending: boolean = true) {
    if (!this.head || !this.head.next) return;
    let swapped: boolean;
    do {
      swapped = false;
      let current = this.head;
      while (current && current.next) {
        let val1 = current[criteria];
        let val2 = current.next[criteria];
        if (typeof val1 === 'string') val1 = val1.toLowerCase();
        if (typeof val2 === 'string') val2 = val2.toLowerCase();
        if (ascending ? val1 > val2 : val1 < val2) {
          const temp = { ...current, next: null };
          Object.assign(current, current.next, { next: null });
          Object.assign(current.next!, temp, { next: null });
          swapped = true;
        }
        current = current.next;
      }
    } while (swapped);
  }

  toArray(): StudentData[] {
    const result: StudentData[] = [];
    let current = this.head;
    while (current) {
      const { next, ...data } = current;
      result.push(data as StudentData);
      current = current.next;
    }
    return result;
  }
}

// --- Helper Functions ---
/**
 * Calculates the percentage of 'present' status in the attendance records.
 */
const calculateAttendancePercentage = (attendance: AttendanceRecord[]): number => {
  if (!attendance || attendance.length === 0) return 0;
  const presentCount = attendance.filter(record => record.status === 'present').length;
  return Math.round((presentCount / attendance.length) * 100);
};

const App = () => {
  const STORAGE_KEY = 'eduflow_active_registry';
  const GROUP_KEY = 'eduflow_custom_groups';
  const BACKUP_KEY = 'eduflow_timestamped_backup';
  const BACKUP_INTERVAL = 300000; // 5 mins

  // --- Core State ---
  const [list] = useState(new StudentLinkedList());
  const [students, setStudents] = useState<StudentData[]>([]);
  const [groups, setGroups] = useState<string[]>(['Honors', 'Exchange', 'Sports']);
  const [user, setUser] = useState<any>(null);
  
  // --- UI State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [selectedUsns, setSelectedUsns] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastBackup, setLastBackup] = useState(localStorage.getItem('eduflow_last_backup_time') || 'Never');

  // --- Form State ---
  const [formData, setFormData] = useState<StudentData>(getEmptyStudent());
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');

  function getEmptyStudent(): StudentData {
    return {
      usn: '', name: '', marks: 0, avatar: null, notes: '',
      dateOfJoining: new Date().toISOString().split('T')[0],
      backlog: 0, phone: '', gmail: '', feesPaid: 0, feesTotal: 0,
      parentName: '', parentPhone: '', parentGmail: '',
      attendance: [], groups: [], paymentHistory: [], history: []
    };
  }

  // --- Auth & Sync Logic ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadRemoteData();
      else loadLocalData();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadRemoteData();
    });

    const backupTimer = setInterval(() => performBackup(true), BACKUP_INTERVAL);
    return () => { subscription.unsubscribe(); clearInterval(backupTimer); };
  }, []);

  const loadLocalData = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      list.fromArray(parsed);
      setStudents(list.toArray());
    }
    const g = localStorage.getItem(GROUP_KEY);
    if (g) setGroups(JSON.parse(g));
  };

  const loadRemoteData = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.from('students_registry').select('*').single();
      if (data) {
        list.fromArray(data.registry_data);
        setGroups(data.groups_data);
        updateState();
      } else if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
        loadLocalData();
      }
    } catch (e) { loadLocalData(); }
    setIsSyncing(false);
  };

  const syncToSupabase = async (registry: StudentData[], groupData: string[]) => {
    if (!user) return;
    setIsSyncing(true);
    await supabase.from('students_registry').upsert({
      user_id: user.id,
      registry_data: registry,
      groups_data: groupData,
      updated_at: new Date().toISOString()
    });
    setIsSyncing(false);
  };

  const updateState = () => {
    const arr = list.toArray();
    setStudents(arr);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    localStorage.setItem(GROUP_KEY, JSON.stringify(groups));
    if (user) syncToSupabase(arr, groups);
  };

  const performBackup = (isAuto = false) => {
    const data = list.toArray();
    const ts = new Date().toLocaleString();
    localStorage.setItem(BACKUP_KEY, JSON.stringify({ data, groups, ts }));
    localStorage.setItem('eduflow_last_backup_time', ts);
    setLastBackup(ts);
    if (!isAuto) alert(`Manual archive created at ${ts}`);
  };

  const confirmRestore = () => {
    const backup = localStorage.getItem(BACKUP_KEY);
    if (backup) {
      const { data, groups: g } = JSON.parse(backup);
      list.fromArray(data);
      setGroups(g);
      updateState();
      setShowRestoreModal(false);
      alert("System restored to latest archive state.");
    }
  };

  // --- Handlers ---
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.usn || !formData.name) return alert("Required fields missing");
    
    if (editMode) list.update(editMode, formData);
    else list.insert(formData);
    
    updateState();
    setShowModal(false);
    setEditMode(null);
  };

  const handleAuth = async (type: 'in' | 'up') => {
    setIsSyncing(true);
    const { error } = type === 'up' 
      ? await supabase.auth.signUp({ email: authEmail, password: authPass })
      : await supabase.auth.signInWithPassword({ email: authEmail, password: authPass });
    
    if (error) alert(error.message);
    else { setShowAuthModal(false); if(type === 'up') alert("Check email for confirmation"); }
    setIsSyncing(false);
  };

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return students.filter(s => s.name.toLowerCase().includes(q) || s.usn.toLowerCase().includes(q));
  }, [students, searchQuery]);

  // --- Sub-Components for Modal ---
  const HistorySection = () => (
    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-black text-slate-800 uppercase text-xs flex items-center gap-2">
          <History size={14} className="text-indigo-600" /> Timeline & Events
        </h3>
        <span className="text-[10px] font-black text-indigo-600 bg-white border px-2 py-0.5 rounded-lg">
          {formData.history.length} Logs
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 bg-white p-4 rounded-2xl shadow-sm">
        <input 
          type="text" placeholder="Title" 
          className="px-3 py-2 bg-slate-50 rounded-xl text-xs font-bold outline-none border focus:border-indigo-300"
          id="hist-title"
        />
        <select 
          className="px-3 py-2 bg-slate-50 rounded-xl text-[10px] font-black uppercase outline-none border"
          id="hist-cat"
        >
          <option value="academic">Academic</option>
          <option value="conduct">Conduct</option>
          <option value="achievement">Achievement</option>
          <option value="other">Other</option>
        </select>
        <input 
          type="date" 
          className="px-3 py-2 bg-slate-50 rounded-xl text-[10px] font-black outline-none border"
          defaultValue={new Date().toISOString().split('T')[0]}
          id="hist-date"
        />
        <button 
          type="button"
          onClick={() => {
            const t = (document.getElementById('hist-title') as HTMLInputElement).value;
            if(!t) return;
            const newH: HistoryEntry = {
              id: Math.random().toString(36),
              title: t,
              category: (document.getElementById('hist-cat') as HTMLSelectElement).value as any,
              date: (document.getElementById('hist-date') as HTMLInputElement).value,
              description: (document.getElementById('hist-desc') as HTMLTextAreaElement).value
            };
            setFormData({ ...formData, history: [newH, ...formData.history] });
            (document.getElementById('hist-title') as HTMLInputElement).value = '';
            (document.getElementById('hist-desc') as HTMLTextAreaElement).value = '';
          }}
          className="bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase py-2 hover:bg-indigo-700 transition-colors"
        >
          Add Event
        </button>
        <textarea 
          placeholder="Description..." 
          className="md:col-span-2 px-3 py-2 bg-slate-50 rounded-xl text-xs font-medium outline-none border h-16"
          id="hist-desc"
        />
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
        {formData.history.map(h => (
          <div key={h.id} className="p-3 bg-white border border-slate-100 rounded-xl flex justify-between items-start group shadow-sm">
            <div className="flex gap-3">
              <div className={`mt-1 w-2 h-2 rounded-full ${h.category === 'achievement' ? 'bg-emerald-500' : h.category === 'conduct' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
              <div>
                <p className="text-xs font-black text-slate-800">{h.title}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{h.date} • {h.category}</p>
                {h.description && <p className="text-[11px] text-slate-500 font-medium mt-1 italic">{h.description}</p>}
              </div>
            </div>
            <button type="button" onClick={() => setFormData({...formData, history: formData.history.filter(x => x.id !== h.id)})} className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12}/></button>
          </div>
        ))}
      </div>
    </div>
  );

  const PaymentSection = () => (
    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
      <div className="flex justify-between items-end mb-4">
        <h3 className="font-black text-emerald-800 uppercase text-xs flex items-center gap-2">
          <Receipt size={14} /> Payment Ledger
        </h3>
        <p className="text-lg font-black text-emerald-600">₹{formData.paymentHistory.reduce((a,b) => a + b.amount, 0).toLocaleString()}</p>
      </div>

      <div className="flex gap-2 mb-4 bg-white p-3 rounded-2xl shadow-sm border border-emerald-100">
        <input 
          type="number" placeholder="Amt" 
          className="w-24 px-3 py-2 bg-slate-50 rounded-xl text-xs font-black outline-none border focus:border-emerald-300"
          id="pay-amt"
        />
        <input 
          type="text" placeholder="Memo" 
          className="flex-1 px-3 py-2 bg-slate-50 rounded-xl text-xs font-bold outline-none border"
          id="pay-note"
        />
        <button 
          type="button"
          onClick={() => {
            const a = Number((document.getElementById('pay-amt') as HTMLInputElement).value);
            if(!a) return;
            const newP: PaymentRecord = {
              id: Math.random().toString(36),
              amount: a,
              date: new Date().toISOString().split('T')[0],
              note: (document.getElementById('pay-note') as HTMLInputElement).value || 'Fee payment'
            };
            const updatedHist = [newP, ...formData.paymentHistory];
            setFormData({ 
              ...formData, 
              paymentHistory: updatedHist,
              feesPaid: updatedHist.reduce((acc, curr) => acc + curr.amount, 0)
            });
            (document.getElementById('pay-amt') as HTMLInputElement).value = '';
            (document.getElementById('pay-note') as HTMLInputElement).value = '';
          }}
          className="bg-emerald-600 text-white p-2 rounded-xl"
        >
          <PlusCircle size={18} />
        </button>
      </div>

      <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
        {formData.paymentHistory.map(p => (
          <div key={p.id} className="p-3 bg-white border border-emerald-50 rounded-xl flex justify-between items-center group">
            <div className="flex items-center gap-3">
              <Check size={12} className="text-emerald-500" />
              <div>
                <p className="text-xs font-black text-slate-800">₹{p.amount.toLocaleString()}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">{p.note} • {p.date}</p>
              </div>
            </div>
            <button type="button" onClick={() => {
              const newList = formData.paymentHistory.filter(x => x.id !== p.id);
              setFormData({...formData, paymentHistory: newList, feesPaid: newList.reduce((a,b)=>a+b.amount, 0)});
            }} className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12}/></button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md px-6 py-4 flex justify-between items-center shadow-sm border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-100">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">EduFlow</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Registry Management v2.0</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Cloud size={16} className={isSyncing ? 'animate-pulse' : ''} />
              <span className="text-[10px] font-black uppercase hidden sm:block">{user.email}</span>
              <button onClick={() => supabase.auth.signOut()} className="hover:text-rose-500 transition-colors"><LogOut size={16}/></button>
            </div>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase">
              <LogIn size={16} /> Sync Account
            </button>
          )}
          <button onClick={() => setShowDashboard(true)} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"><LayoutDashboard size={20}/></button>
          <button onClick={openAddModal} className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-black flex items-center gap-2 text-sm shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
            <Plus size={20} /> <span className="hidden sm:inline">Enroll Node</span>
          </button>
        </div>
      </nav>

      {/* Main Directory */}
      <main className="max-w-7xl mx-auto px-6 mt-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Node Directory</h2>
            <p className="text-slate-500 font-medium mt-1 italic">Dynamic Linked List structure with real-time cloud redundancy.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
             <Search size={20} className="text-slate-300 ml-3" />
             <input 
              type="text" placeholder="Search USN or Name..." 
              className="px-4 py-2 outline-none font-bold text-slate-700 w-64"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
             />
          </div>
        </div>

        {/* List View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredStudents.map(s => (
            <div key={s.usn} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 overflow-hidden border-2 border-slate-100">
                    {s.avatar ? <img src={s.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={32}/></div>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditModal(s)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit3 size={18}/></button>
                    <button onClick={() => { if(confirm("Purge Node?")) { list.delete(s.usn); updateState(); } }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 leading-tight">{s.name}</h3>
                    <p className="text-xs font-black text-indigo-600 font-mono tracking-widest">{s.usn}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {s.groups.map(g => (
                      <span key={g} className="px-2 py-0.5 bg-slate-50 text-[10px] font-black text-slate-500 rounded-lg border">{g}</span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="text-center border-r">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Performance</p>
                      <p className="text-base font-black text-slate-800">{s.marks}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Retention</p>
                      <p className={`text-base font-black ${calculateAttendancePercentage(s.attendance) < 75 ? 'text-rose-500' : 'text-emerald-500'}`}>{calculateAttendancePercentage(s.attendance)}%</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-50">
                <div className="flex justify-between items-end mb-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Standing</p>
                  <p className={`text-sm font-black ${(s.feesTotal - s.feesPaid) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>₹{(s.feesTotal - s.feesPaid).toLocaleString()}</p>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${(s.feesPaid/s.feesTotal)*100 || 0}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Global Status Footer */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-10 py-5 rounded-full shadow-2xl flex items-center gap-10 border border-white/10 text-white z-50">
        <div className="text-center"><p className="text-[9px] text-slate-400 font-black uppercase">Nodes</p><p className="text-lg font-black">{students.length}</p></div>
        <div className="w-px bg-white/10 h-8" />
        <div className="text-center"><p className="text-[9px] text-slate-400 font-black uppercase">Archive</p><p className="text-lg font-black text-indigo-400">{lastBackup.split(',')[1] || '---'}</p></div>
        <div className="w-px bg-white/10 h-8" />
        <div className="text-center"><p className="text-[9px] text-slate-400 font-black uppercase">Collected</p><p className="text-lg font-black text-emerald-400">₹{(students.reduce((a,b)=>a+b.feesPaid, 0)/1000).toFixed(1)}k</p></div>
      </div>

      {/* Enrollment/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-6xl p-10 shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8 pb-4 border-b">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{editMode ? 'Modify Record' : 'New Enrollment'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X/></button>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4 space-y-8">
                {/* Avatar & Groups Section (Simplified for space) */}
                <div className="w-full aspect-square bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                  {formData.avatar ? <img src={formData.avatar} className="w-full h-full object-cover"/> : <Camera size={40} className="text-slate-200"/>}
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mapped Segments</h3>
                    <button type="button" onClick={() => { const n = prompt("Group Name:"); if(n) setGroups([...groups, n]); }} className="text-indigo-600"><PlusCircle size={20}/></button>
                  </div>
                  <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl border">
                    {groups.map(g => (
                      <button 
                        key={g} type="button"
                        onClick={() => {
                          const isSel = formData.groups.includes(g);
                          setFormData({...formData, groups: isSel ? formData.groups.filter(x => x !== g) : [...formData.groups, g]});
                        }}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${formData.groups.includes(g) ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase">Repository Notes</label>
                   <textarea 
                    className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold outline-none h-32 focus:border-indigo-300"
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                   />
                </div>
              </div>

              <div className="lg:col-span-8 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Name</label><input type="text" required className="w-full px-5 py-3 rounded-xl border font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">USN</label><input type="text" required className="w-full px-5 py-3 rounded-xl border font-mono font-black" value={formData.usn} onChange={e => setFormData({...formData, usn: e.target.value})}/></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Academic Score %</label><input type="number" required className="w-full px-5 py-3 rounded-xl border font-black text-lg" value={formData.marks} onChange={e => setFormData({...formData, marks: Number(e.target.value)})}/></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Total Course Fee</label><input type="number" required className="w-full px-5 py-3 rounded-xl border font-black text-lg" value={formData.feesTotal} onChange={e => setFormData({...formData, feesTotal: Number(e.target.value)})}/></div>
                </div>

                <HistorySection />
                <PaymentSection />

                <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all">Commit Node to Registry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowAuthModal(false)} />
          <div className="relative bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in duration-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><Cloud size={32}/></div>
              <h3 className="text-xl font-black text-slate-900">EduFlow Cloud Sync</h3>
              <p className="text-xs text-slate-400 font-bold uppercase mt-1">Access your linked nodes anywhere</p>
            </div>
            <div className="space-y-4">
              <input 
                type="email" placeholder="Email" 
                className="w-full px-5 py-3 bg-slate-50 rounded-xl font-bold outline-none border focus:border-indigo-400"
                value={authEmail} onChange={e => setAuthEmail(e.target.value)}
              />
              <input 
                type="password" placeholder="Password" 
                className="w-full px-5 py-3 bg-slate-50 rounded-xl font-bold outline-none border focus:border-indigo-400"
                value={authPass} onChange={e => setAuthPass(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => handleAuth('in')} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black text-xs uppercase hover:bg-slate-800 transition-colors">Sign In</button>
                <button onClick={() => handleAuth('up')} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-xs uppercase hover:bg-indigo-700 transition-colors">Register</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Dashboard & Backup Tools */}
      {showDashboard && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" onClick={() => setShowDashboard(false)} />
          <div className="relative bg-white rounded-[3rem] w-full max-w-4xl p-10 shadow-2xl overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-10 pb-4 border-b">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">System Metrics</h2>
              <button onClick={() => setShowDashboard(false)} className="p-2 hover:bg-slate-100 rounded-full"><X/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-slate-50 p-8 rounded-[2rem] border">
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-6 flex items-center gap-2"><Save size={16}/> Data Redundancy</h3>
                  <p className="text-xs text-slate-500 font-semibold mb-6">Archive the current Singly Linked Registry state into timestamped local persistence for disaster recovery.</p>
                  <div className="flex items-center justify-between bg-white p-4 rounded-2xl border mb-4">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Last Registry Archive</p>
                        <p className="text-xs font-black text-slate-800">{lastBackup}</p>
                     </div>
                     <button onClick={() => performBackup(false)} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all"><RefreshCw size={20}/></button>
                  </div>
                  <button 
                    onClick={() => setShowRestoreModal(true)} 
                    className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-100 transition-all"
                  >
                    Restore from Latest Archive
                  </button>
               </div>

               <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-xl shadow-indigo-100 border-4 border-indigo-500">
                  <h3 className="font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2 text-indigo-100"><ShieldCheck size={16}/> Security Audit</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-black text-indigo-200">Cloud Sync Status</span>
                       <span className="text-xs font-black">{user ? 'Online' : 'Local Only'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-black text-indigo-200">Auto-Archive Interval</span>
                       <span className="text-xs font-black">5 Minutes</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-black text-indigo-200">Registry Nodes</span>
                       <span className="text-xs font-black">{students.length} Total</span>
                    </div>
                  </div>
                  <div className="mt-8 pt-8 border-t border-indigo-400/30 flex items-center gap-4">
                     <ShieldAlert size={24} className="text-indigo-300"/>
                     <p className="text-[10px] font-bold leading-relaxed text-indigo-100 uppercase italic opacity-70">
                       All registry entries are processed through standard memory management; cloud copies are encrypted via Supabase RLS.
                     </p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowRestoreModal(false)} />
          <div className="relative bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6"><ShieldAlert size={32}/></div>
            <h3 className="text-xl font-black text-slate-900">Confirm Overwrite?</h3>
            <p className="text-xs text-slate-500 font-semibold mt-2 mb-8">Restoring will replace the entire current directory with the archive from <span className="font-black text-indigo-600">{lastBackup}</span>.</p>
            <div className="space-y-3">
              <button onClick={confirmRestore} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs">Confirm & Restore</button>
              <button onClick={() => setShowRestoreModal(false)} className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-xs">Abort</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function openAddModal() {
    setEditMode(null);
    setFormData(getEmptyStudent());
    setShowModal(true);
  }

  function openEditModal(student: StudentData) {
    setEditMode(student.usn);
    setFormData({ ...student });
    setShowModal(true);
  }
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);