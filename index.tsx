import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { 
  Plus, 
  Trash2, 
  Search, 
  User, 
  IdCard, 
  GraduationCap, 
  Sparkles, 
  Loader2, 
  X, 
  Edit3, 
  SortAsc, 
  SortDesc, 
  Upload, 
  Camera, 
  AlertTriangle, 
  Download, 
  FileSpreadsheet, 
  Check, 
  Calendar, 
  Phone, 
  Mail, 
  CreditCard, 
  Users, 
  Hash, 
  DollarSign, 
  Wallet,
  ArrowUpRight,
  CalendarCheck,
  History,
  TrendingUp,
  Award,
  Clock,
  LayoutDashboard,
  FileText,
  Tag,
  Receipt,
  Filter,
  PlusCircle,
  XCircle,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

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
}

// --- Data Structure: Singly Linked List ---

class StudentNode implements StudentData {
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
  next: StudentNode | null;

  constructor(data: StudentData) {
    this.usn = data.usn;
    this.name = data.name;
    this.marks = data.marks;
    this.avatar = data.avatar;
    this.dateOfJoining = data.dateOfJoining;
    this.backlog = data.backlog;
    this.phone = data.phone;
    this.gmail = data.gmail;
    this.feesPaid = data.feesPaid || 0;
    this.feesTotal = data.feesTotal;
    this.parentName = data.parentName || '';
    this.parentPhone = data.parentPhone || '';
    this.parentGmail = data.parentGmail || '';
    this.attendance = data.attendance || [];
    this.groups = data.groups || [];
    this.paymentHistory = data.paymentHistory || [];
    this.next = null;
  }
}

class StudentLinkedList {
  head: StudentNode | null;

  constructor() {
    this.head = null;
  }

  insert(data: StudentData) {
    const newNode = new StudentNode(data);
    if (!this.head) {
      this.head = newNode;
    } else {
      let current = this.head;
      while (current.next) {
        current = current.next;
      }
      current.next = newNode;
    }
  }

  fromArray(data: StudentData[]) {
    this.head = null;
    data.forEach(s => this.insert(s));
  }

  update(oldUsn: string, data: StudentData): boolean {
    const node = this.search(oldUsn);
    if (node) {
      Object.assign(node, data);
      return true;
    }
    return false;
  }

  delete(usn: string): boolean {
    if (!this.head) return false;
    if (this.head.usn === usn) {
      this.head = this.head.next;
      return true;
    }
    let current = this.head;
    while (current.next && current.next.usn !== usn) {
      current = current.next;
    }
    if (current.next) {
      current.next = current.next.next;
      return true;
    }
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
        let val1: any = current[criteria];
        let val2: any = current.next[criteria];

        if (typeof val1 === 'string') val1 = val1.toLowerCase();
        if (typeof val2 === 'string') val2 = val2.toLowerCase();

        let shouldSwap = false;
        if (ascending) {
          if (val1 > val2) shouldSwap = true;
        } else {
          if (val1 < val2) shouldSwap = true;
        }

        if (shouldSwap) {
          const keys = Object.keys(current).filter(k => k !== 'next') as (keyof StudentData)[];
          keys.forEach(key => {
            const temp = current[key];
            (current as any)[key] = current.next![key];
            (current.next as any)[key] = temp;
          });
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

// --- Components ---

const App = () => {
  const STORAGE_KEY = 'eduflow_student_records_v8'; 
  const GROUP_STORAGE_KEY = 'eduflow_groups_v2';
  
  const [list] = useState<StudentLinkedList>(new StudentLinkedList());
  const [students, setStudents] = useState<StudentData[]>([]);
  const [availableGroups, setAvailableGroups] = useState<string[]>(['Honors Program', 'Exchange Students', 'Sports Quota', 'Library Assistant']);
  const [activeGroupFilter, setActiveGroupFilter] = useState<string>('All');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showClassAttendanceModal, setShowClassAttendanceModal] = useState(false);
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  
  const [attendanceUsn, setAttendanceUsn] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<string | null>(null); 
  const [deleteConfirmUsn, setDeleteConfirmUsn] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAvatarGenerating, setIsAvatarGenerating] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Form States
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attStatus, setAttStatus] = useState<AttendanceStatus>('present');
  const [bulkAttStatus, setBulkAttStatus] = useState<Record<string, AttendanceStatus>>({});
  
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNote, setPayNote] = useState<string>('');

  // Export States
  const [exportScope, setExportScope] = useState<'all' | 'filtered'>('all');

  const [sortConfig, setSortConfig] = useState<{ criteria: keyof StudentData, ascending: boolean }>({
    criteria: 'name',
    ascending: true
  });

  const [formData, setFormData] = useState<StudentData>({
    usn: '', name: '', marks: 0, avatar: null,
    dateOfJoining: new Date().toISOString().split('T')[0],
    backlog: 0, phone: '', gmail: '', feesPaid: 0, feesTotal: 0,
    parentName: '', parentPhone: '', parentGmail: '',
    attendance: [], groups: [], paymentHistory: []
  });

  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed)) {
          list.fromArray(parsed);
          list.sort(sortConfig.criteria, sortConfig.ascending);
          setStudents(list.toArray());
        }
      } catch (e) { console.error(e); }
    }
    
    const savedGroups = localStorage.getItem(GROUP_STORAGE_KEY);
    if (savedGroups) {
      try {
        const parsed = JSON.parse(savedGroups);
        if (Array.isArray(parsed)) setAvailableGroups(parsed);
      } catch (e) { console.error(e); }
    }
  }, [list, sortConfig.criteria, sortConfig.ascending]);

  const updateStudents = () => {
    const currentArray = list.toArray();
    setStudents(currentArray);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentArray));
  };

  const updateGroups = (newGroups: string[]) => {
    setAvailableGroups(newGroups);
    localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(newGroups));
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const finalUsn = formData.usn.trim().toUpperCase();
    if (!finalUsn || !formData.name.trim()) {
      alert("USN and Name are required!");
      return;
    }
    
    const studentToSave = { ...formData, usn: finalUsn };

    if (editMode) {
      if (finalUsn !== editMode && list.search(finalUsn)) {
        alert("The new USN already belongs to another student!");
        return;
      }
      list.update(editMode, studentToSave);
    } else {
      if (list.search(finalUsn)) {
        alert("USN already exists!");
        return;
      }
      list.insert(studentToSave);
    }

    list.sort(sortConfig.criteria, sortConfig.ascending);
    updateStudents();
    closeModal();
  };

  const openAddModal = () => {
    setEditMode(null);
    setFormData({
      usn: '', name: '', marks: 0, avatar: null,
      dateOfJoining: new Date().toISOString().split('T')[0],
      backlog: 0, phone: '', gmail: '', feesPaid: 0, feesTotal: 0,
      parentName: '', parentPhone: '', parentGmail: '',
      attendance: [], groups: [], paymentHistory: []
    });
    setShowModal(true);
  };

  const openEditModal = (student: StudentData) => {
    setEditMode(student.usn);
    setFormData({ ...student });
    setPayAmount(0);
    setPayNote('');
    setShowModal(true);
  };

  const closeModal = () => {
    stopCamera();
    setShowModal(false);
    setEditMode(null);
  };

  const handleLogPayment = () => {
    if (payAmount <= 0) return;
    const newPayment: PaymentRecord = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      amount: payAmount,
      note: payNote || 'Fee payment'
    };
    
    const updatedHistory = [...formData.paymentHistory, newPayment];
    const totalPaid = updatedHistory.reduce((acc, curr) => acc + curr.amount, 0);
    
    setFormData({
      ...formData,
      paymentHistory: updatedHistory,
      feesPaid: totalPaid
    });
    setPayAmount(0);
    setPayNote('');
  };

  const handleBulkAttendanceSave = () => {
    Object.keys(bulkAttStatus).forEach(usn => {
      const student = list.search(usn);
      if (student) {
        const records = student.attendance || [];
        const filtered = records.filter(r => r.date !== attDate);
        filtered.push({ date: attDate, status: bulkAttStatus[usn] });
        filtered.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        student.attendance = filtered;
      }
    });
    updateStudents();
    setShowClassAttendanceModal(false);
    alert(`Attendance for ${attDate} saved for all selected students.`);
  };

  const initiateDelete = (usn: string) => setDeleteConfirmUsn(usn);

  const confirmDelete = () => {
    if (deleteConfirmUsn) {
      list.delete(deleteConfirmUsn);
      updateStudents();
      setDeleteConfirmUsn(null);
    }
  };

  const handleSortChange = (criteria: keyof StudentData) => {
    let newAsc = true;
    if (sortConfig.criteria === criteria) newAsc = !sortConfig.ascending;
    setSortConfig({ criteria, ascending: newAsc });
    list.sort(criteria, newAsc);
    updateStudents();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 400 } } 
      });
      setVideoStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsCameraOpen(true);
    } catch (err) { alert("Camera access denied."); }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setFormData(prev => ({ ...prev, avatar: canvas.toDataURL('image/png') }));
        stopCamera();
      }
    }
  };

  const handleGenerateAvatar = async () => {
    if (!formData.name) { alert("Please enter the student's name first."); return; }
    setIsAvatarGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `A professional, 2D minimalist character avatar of a student named ${formData.name}. Friendly, circle-framed style.`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setFormData(prev => ({ ...prev, avatar: `data:image/png;base64,${part.inlineData!.data}` }));
          break;
        }
      }
    } catch (err) { alert("Avatar generation failed."); } finally { setIsAvatarGenerating(false); }
  };

  const calculateAttendancePercentage = (attendance: AttendanceRecord[]) => {
    if (!attendance || attendance.length === 0) return 0;
    const presentCount = attendance.filter(r => r.status === 'present').length;
    return Math.round((presentCount / attendance.length) * 100);
  };

  const filteredStudents = useMemo(() => {
    let result = students;
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      result = result.filter(s => 
        s.name.toLowerCase().includes(query) || 
        s.usn.toLowerCase().includes(query) ||
        s.phone.includes(query) ||
        s.gmail.toLowerCase().includes(query) ||
        s.parentName.toLowerCase().includes(query)
      );
    }
    if (activeGroupFilter !== 'All') {
      result = result.filter(s => s.groups?.includes(activeGroupFilter));
    }
    return result;
  }, [students, searchQuery, activeGroupFilter]);

  const handleExportAttendanceReport = () => {
    if (students.length === 0) return;
    const headers = ["USN", "NAME", "ATTENDANCE_PERCENTAGE", "TOTAL_CLASSES", "PRESENT_DAYS", "ABSENT_DAYS", "LEAVES"];
    const rows = students.map(s => {
      const att = s.attendance || [];
      const perc = calculateAttendancePercentage(att);
      const present = att.filter(r => r.status === 'present').length;
      const absent = att.filter(r => r.status === 'absent').length;
      const leaves = att.filter(r => r.status === 'leave').length;
      return [s.usn, s.name, `${perc}%`, att.length, present, absent, leaves].join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const handleExportCSV = () => {
    const dataToExport = exportScope === 'all' ? students : filteredStudents;
    if (dataToExport.length === 0) return;
    const headers = ["USN", "NAME", "MARKS", "FEES_PAID", "FEES_TOTAL", "GMAIL", "PARENT_NAME", "PARENT_PHONE"];
    const rows = dataToExport.map(s => [s.usn, s.name, s.marks, s.feesPaid, s.feesTotal, s.gmail, s.parentName, s.parentPhone].join(","));
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `student_records_${new Date().getTime()}.csv`);
    link.click();
    setShowExportModal(false);
  };

  const getAiInsight = async () => {
    if (students.length === 0) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analyze academic data: ${JSON.stringify(students.slice(0, 15))}. Focus on financial health (fee collections) and student retention (attendance). Provide actionable advice in 120 words.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setAiInsight(response.text || "No insights available.");
    } catch (err) { setAiInsight("Error generating insights."); } finally { setIsAiLoading(false); }
  };

  const currentAttendanceStudent = attendanceUsn ? students.find(s => s.usn === attendanceUsn) : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md px-6 py-4 flex justify-between items-center shadow-sm border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-100">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">EduFlow</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Institutional Registry</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => {
            const initial: Record<string, AttendanceStatus> = {};
            students.forEach(s => initial[s.usn] = 'present');
            setBulkAttStatus(initial);
            setShowClassAttendanceModal(true);
          }} className="flex items-center gap-2 px-4 py-2 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-all font-bold text-sm">
            <CalendarCheck size={18} />
            <span className="hidden sm:inline">Daily Roll Call</span>
          </button>
          <button onClick={() => setShowDashboardModal(true)} className="flex items-center gap-2 px-4 py-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all font-bold text-sm">
            <LayoutDashboard size={18} />
            <span className="hidden sm:inline">Analytics</span>
          </button>
          <button onClick={openAddModal} className="bg-slate-900 text-white px-5 py-2 rounded-xl flex items-center gap-2 transition-all font-bold shadow-md active:scale-95 text-sm">
            <Plus size={20} />
            <span className="hidden sm:inline">Enroll</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 mt-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Main Directory</h2>
            <p className="text-slate-500 font-medium mt-1 italic">Dynamic Student Information System with Linked List Backend.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={getAiInsight} disabled={isAiLoading} className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-2xl hover:bg-indigo-50 transition-colors border border-indigo-100 font-black text-sm shadow-sm">
              {isAiLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              Insights
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-10">
          <div className="md:col-span-8 relative group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-300 group-focus-within:text-indigo-600 transition-colors">
              <Search size={24} />
            </div>
            <input 
              type="text" 
              placeholder="Search USN, Name, Phone, Parent..." 
              className="w-full pl-16 pr-8 py-5 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all text-lg font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="md:col-span-4 relative">
            <select 
              value={activeGroupFilter} 
              onChange={(e) => setActiveGroupFilter(e.target.value)}
              className="w-full pl-6 pr-10 py-5 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none appearance-none font-bold text-slate-700"
            >
              <option value="All">All Program Groups</option>
              {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
              <Filter size={18} />
            </div>
          </div>
        </div>

        {aiInsight && (
          <div className="mb-10 bg-indigo-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden animate-in zoom-in duration-300">
             <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <h3 className="flex items-center gap-3 font-black text-xl tracking-tight">
                  <Sparkles size={20} className="text-yellow-400" />
                  Gemini Management Advice
                </h3>
                <button onClick={() => setAiInsight(null)} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <p className="text-indigo-100 leading-relaxed font-semibold text-base">{aiInsight}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <div key={student.usn} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md bg-slate-100 border-2 border-slate-50">
                      {student.avatar ? <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={40} /></div>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditModal(student)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2.5 rounded-xl transition-all"><Edit3 size={18} /></button>
                      <button onClick={() => initiateDelete(student.usn)} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2.5 rounded-xl transition-all"><Trash2 size={18} /></button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 leading-tight mb-1">{student.name}</h3>
                      <div className="flex items-center gap-2 text-indigo-600 font-black text-xs">
                        <Hash size={12} />
                        <span className="font-mono">{student.usn}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                      {student.groups?.map(g => (
                        <span key={g} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-lg border border-indigo-100">{g}</span>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 rounded-2xl">
                        <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Academic Score</p>
                        <p className="text-base font-black text-slate-800">{student.marks}%</p>
                      </div>
                      <div onClick={() => { setAttendanceUsn(student.usn); setShowAttendanceModal(true); }} className="bg-slate-50 p-3 rounded-2xl cursor-pointer hover:bg-emerald-50 transition-colors">
                        <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Attendance</p>
                        <p className="text-base font-black text-emerald-600">{calculateAttendancePercentage(student.attendance)}%</p>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-dashed border-slate-200 space-y-2">
                       <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck size={12} className="text-indigo-500" /> Parent Guardian</p>
                       <div className="space-y-1">
                          <p className="text-xs font-black text-slate-700">{student.parentName || 'Unknown'}</p>
                          <div className="flex items-center gap-3">
                             <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold"><Phone size={10} /> {student.parentPhone || 'N/A'}</div>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 mt-4">
                  <div className="flex justify-between items-end mb-2">
                     <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5"><Wallet size={12} /> Fee Balance</p>
                     <p className={`text-base font-black ${student.feesPaid >= student.feesTotal ? 'text-emerald-600' : 'text-rose-600'}`}>₹{(student.feesTotal - student.feesPaid).toLocaleString()}</p>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${student.feesTotal > 0 ? (student.feesPaid / student.feesTotal) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-slate-100">
              <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200"><Search size={48} /></div>
              <h3 className="text-2xl font-black text-slate-800">No matching nodes found</h3>
            </div>
          )}
        </div>
      </main>

      {/* Global Persistence Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-10 py-5 rounded-full shadow-2xl flex items-center gap-10 border border-white/10 text-white z-40">
        <div className="text-center"><p className="text-[9px] text-slate-400 font-black uppercase">Cohort</p><p className="text-lg font-black">{students.length}</p></div>
        <div className="w-px bg-white/10 h-8" />
        <div className="text-center"><p className="text-[9px] text-slate-400 font-black uppercase">Outstanding</p><p className="text-lg font-black text-rose-400">₹{(students.reduce((acc, curr) => acc + (curr.feesTotal - curr.feesPaid), 0) / 1000).toFixed(1)}k</p></div>
        <div className="w-px bg-white/10 h-8" />
        <div className="text-center"><p className="text-[9px] text-slate-400 font-black uppercase">Collected</p><p className="text-lg font-black text-emerald-400">₹{(students.reduce((acc, curr) => acc + curr.feesPaid, 0) / 1000).toFixed(1)}k</p></div>
      </div>

      {/* Enrollment/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-6xl p-10 shadow-2xl overflow-y-auto max-h-[95vh] animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{editMode ? 'Edit Profile' : 'New Enrollment'}</h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Singly Linked Record Node</p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <form onSubmit={handleSaveStudent} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4 space-y-8">
                <div className="relative w-full aspect-square rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                  {isCameraOpen ? <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" /> : (
                    formData.avatar ? <img src={formData.avatar} className="w-full h-full object-cover" /> : <Camera size={48} className="text-slate-200" />
                  )}
                  {isAvatarGenerating && <div className="absolute inset-0 bg-indigo-600/20 backdrop-blur-sm flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="py-3 bg-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-600">Upload</button>
                  <button type="button" onClick={startCamera} className="py-3 bg-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-600">Camera</button>
                  <button type="button" onClick={handleGenerateAvatar} disabled={isAvatarGenerating} className="col-span-2 py-3 bg-indigo-50 rounded-xl text-[10px] font-black uppercase text-indigo-600">AI Avatar</button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><Tag size={14} className="inline mr-2" /> Groups</h3>
                    <button type="button" onClick={() => { const n = prompt("New Group Name:"); if(n) updateGroups([...availableGroups, n]) }} className="text-indigo-600"><PlusCircle size={20} /></button>
                  </div>
                  <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 min-h-[100px]">
                    {availableGroups.map(group => (
                      <button 
                        key={group}
                        type="button"
                        onClick={() => {
                          const isSelected = formData.groups.includes(group);
                          setFormData({...formData, groups: isSelected ? formData.groups.filter(g => g !== group) : [...formData.groups, group]})
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                          formData.groups.includes(group) ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-200'
                        }`}
                      >
                        {group}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Name</label><input type="text" required className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">USN / ID</label><input type="text" required className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none uppercase font-bold" value={formData.usn} onChange={e => setFormData({...formData, usn: e.target.value})} /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Academic Marks %</label><input type="number" required className="w-full px-5 py-4 rounded-xl border border-slate-200 outline-none font-black text-lg" value={formData.marks} onChange={e => setFormData({...formData, marks: Number(e.target.value)})} /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Backlogs</label><input type="number" className="w-full px-5 py-4 rounded-xl border border-slate-200 outline-none font-black text-lg" value={formData.backlog} onChange={e => setFormData({...formData, backlog: Number(e.target.value)})} /></div>
                </div>

                <div className="space-y-6 bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-2"><ShieldCheck size={18} className="text-indigo-600" /><h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Guardian Information</h3></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5 sm:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Guardian Name</label><input type="text" className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold" value={formData.parentName} onChange={e => setFormData({...formData, parentName: e.target.value})} /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Guardian Phone</label><input type="tel" className="w-full px-5 py-4 rounded-xl border border-slate-200 outline-none font-bold" value={formData.parentPhone} onChange={e => setFormData({...formData, parentPhone: e.target.value})} /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Guardian Gmail</label><input type="email" className="w-full px-5 py-4 rounded-xl border border-slate-200 outline-none font-bold" value={formData.parentGmail} onChange={e => setFormData({...formData, parentGmail: e.target.value})} /></div>
                  </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-[11px] flex items-center gap-2"><Receipt size={16} className="text-emerald-600" /> Fee Payment Ledger</h3>
                    <p className="text-xl font-black text-emerald-600">₹{formData.feesPaid.toLocaleString()}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6"><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Total Course Fee</label><input type="number" className="w-full px-5 py-4 rounded-xl border border-slate-200 outline-none font-black text-lg" value={formData.feesTotal} onChange={e => setFormData({...formData, feesTotal: Number(e.target.value)})} /></div></div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-3 rounded-2xl shadow-sm">
                    <div className="sm:col-span-5"><input type="number" placeholder="Amt (₹)" className="w-full px-4 py-3 rounded-xl bg-slate-50 text-sm font-black border-none outline-none" value={payAmount || ''} onChange={e => setPayAmount(Number(e.target.value))} /></div>
                    <div className="sm:col-span-5"><input type="text" placeholder="Note" className="w-full px-4 py-3 rounded-xl bg-slate-50 text-sm font-bold border-none outline-none" value={payNote} onChange={e => setPayNote(e.target.value)} /></div>
                    <div className="sm:col-span-2"><button type="button" onClick={handleLogPayment} className="w-full h-full bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 transition-colors"><PlusCircle size={20} /></button></div>
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {formData.paymentHistory?.length > 0 ? formData.paymentHistory.map((p, i) => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black">₹</div>
                          <div><p className="text-xs font-black text-slate-800">₹{p.amount.toLocaleString()}</p><p className="text-[9px] text-slate-400 font-bold uppercase">{p.note} • {p.date}</p></div>
                        </div>
                        <Check size={14} className="text-emerald-500" />
                      </div>
                    )).reverse() : <p className="text-center py-4 text-[10px] text-slate-400 font-black uppercase tracking-widest italic">No transactions</p>}
                  </div>
                </div>

                <button type="submit" className="w-full bg-slate-900 text-white font-black py-6 rounded-3xl shadow-xl transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-sm">Save Complete Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Attendance Modal (Bulk Roll Call) */}
      {showClassAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setShowClassAttendanceModal(false)} />
          <div className="relative bg-white rounded-[3rem] w-full max-w-4xl p-10 shadow-2xl overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl"><CalendarCheck size={28} /></div>
                <div><h2 className="text-3xl font-black text-slate-900 tracking-tight">Daily Roll Call</h2><p className="text-slate-400 font-bold text-xs">Mark attendance for the entire cohort.</p></div>
              </div>
              <button onClick={() => setShowClassAttendanceModal(false)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <div className="mb-8 flex items-center gap-4 bg-slate-50 p-6 rounded-2xl">
              <div className="space-y-1 flex-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Session Date</label>
                <input type="date" className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-white font-black text-lg" value={attDate} onChange={e => setAttDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                 <p className="text-[10px] font-black text-slate-400 uppercase text-center">Auto-fill</p>
                 <div className="flex gap-1">
                   {['present', 'absent', 'leave'].map(s => (
                     <button key={s} onClick={() => { const u: Record<string, AttendanceStatus> = {}; students.forEach(st => u[st.usn] = s as AttendanceStatus); setBulkAttStatus(u); }} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase hover:bg-slate-100 transition-colors">{s[0]}</button>
                   ))}
                 </div>
              </div>
            </div>
            <div className="space-y-3 mb-10 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {students.map(s => (
                <div key={s.usn} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-slate-400 font-black text-xs">{s.avatar ? <img src={s.avatar} className="w-full h-full object-cover" alt={s.name} /> : s.name[0]}</div>
                    <div><p className="text-sm font-black text-slate-800">{s.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{s.usn}</p></div>
                  </div>
                  <div className="flex gap-1">
                    {(['present', 'absent', 'leave'] as const).map(status => (
                      <button 
                        key={status}
                        onClick={() => setBulkAttStatus({...bulkAttStatus, [s.usn]: status as AttendanceStatus})}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                          bulkAttStatus[s.usn] === status 
                          ? status === 'present' ? 'bg-emerald-600 text-white' : status === 'absent' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                          : 'bg-slate-50 text-slate-400 border border-slate-100'
                        }`}
                      >
                        {status[0]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleBulkAttendanceSave} className="w-full bg-emerald-600 text-white font-black py-6 rounded-3xl shadow-xl hover:bg-emerald-700 transition-all uppercase tracking-[0.2em] text-sm">Synchronize Attendance Data</button>
          </div>
        </div>
      )}

      {/* Analytics Dashboard (Summary Modal) */}
      {showDashboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setShowDashboardModal(false)} />
          <div className="relative bg-white rounded-[3rem] w-full max-w-6xl p-10 shadow-2xl overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-10 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100"><LayoutDashboard size={28} /></div>
                <div><h2 className="text-3xl font-black text-slate-900 tracking-tight">Institutional Dashboard</h2><p className="text-slate-400 font-bold text-sm">Aggregated metrics from the student node network.</p></div>
              </div>
              <div className="flex gap-3">
                 <button onClick={handleExportAttendanceReport} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-black text-xs hover:bg-emerald-100"><FileSpreadsheet size={16}/> Attendance CSV</button>
                 <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs hover:bg-indigo-100"><Download size={16}/> Full CSV</button>
                 <button onClick={() => setShowDashboardModal(false)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
               <div className="bg-slate-900 p-8 rounded-[2rem] text-white space-y-4 shadow-xl">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Collection</p>
                 <p className="text-4xl font-black text-emerald-400">₹{students.reduce((acc, curr) => acc + curr.feesPaid, 0).toLocaleString()}</p>
                 <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target</span>
                    <span className="text-sm font-black text-slate-300">₹{students.reduce((acc, curr) => acc + curr.feesTotal, 0).toLocaleString()}</span>
                 </div>
               </div>
               <div className="bg-indigo-600 p-8 rounded-[2rem] text-white space-y-4 shadow-xl">
                 <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Average Marks</p>
                 <p className="text-4xl font-black">{students.length ? (students.reduce((acc, curr) => acc + curr.marks, 0) / students.length).toFixed(1) : 0}%</p>
                 <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Enrolled Nodes</span>
                    <span className="text-sm font-black text-indigo-100">{students.length}</span>
                 </div>
               </div>
               <div className="bg-emerald-600 p-8 rounded-[2rem] text-white space-y-4 shadow-xl">
                 <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">Cohort Presence</p>
                 <p className="text-4xl font-black">{students.length ? Math.round(students.reduce((acc, curr) => acc + calculateAttendancePercentage(curr.attendance), 0) / students.length) : 0}%</p>
                 <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Classes Logged</span>
                    <span className="text-sm font-black text-white">{students.reduce((acc, curr) => acc + (curr.attendance?.length || 0), 0)}</span>
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               <div className="lg:col-span-6 bg-slate-50 p-8 rounded-3xl border border-slate-100">
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-[11px] mb-6 flex items-center gap-2"><Tag size={16} /> Demographic Segments</h3>
                  <div className="space-y-3">
                    {availableGroups.map(group => {
                      const count = students.filter(s => s.groups?.includes(group)).length;
                      const percentage = students.length ? Math.round((count / students.length) * 100) : 0;
                      return (
                        <div key={group} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-xs font-black text-slate-700 uppercase">{group}</span>
                             <span className="text-xs font-black text-indigo-600">{count} Members</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 shadow-sm" style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
               </div>
               <div className="lg:col-span-6 bg-slate-50 p-8 rounded-3xl border border-slate-100">
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-[11px] mb-6 flex items-center gap-2"><AlertTriangle size={16} className="text-rose-500" /> Short Attendance Watchlist</h3>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {students.filter(s => calculateAttendancePercentage(s.attendance) < 75).map(s => (
                      <div key={s.usn} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-rose-500 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-black text-slate-800">{s.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{s.usn}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-rose-600">{calculateAttendancePercentage(s.attendance)}% Presence</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{"Critical Threshold < 75%"}</p>
                        </div>
                      </div>
                    ))}
                    {students.filter(s => calculateAttendancePercentage(s.attendance) < 75).length === 0 && (
                      <div className="py-12 text-center">
                        <Check size={40} className="mx-auto text-emerald-500 mb-2" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">All students meet compliance</p>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowExportModal(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-lg p-10 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><FileSpreadsheet size={28} /></div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise Export</h2>
              </div>
              <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <div className="space-y-6">
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Export Scale</label>
                 <div className="grid grid-cols-2 gap-4">
                   <button onClick={() => setExportScope('all')} className={`p-4 rounded-2xl border-2 font-black text-sm transition-all ${exportScope === 'all' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-500'}`}>Full Repository</button>
                   <button onClick={() => setExportScope('filtered')} className={`p-4 rounded-2xl border-2 font-black text-sm transition-all ${exportScope === 'filtered' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-500'}`}>Current View</button>
                 </div>
              </div>
              <button onClick={handleExportCSV} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs shadow-emerald-100"><Download size={20} /> Generate Detailed Report</button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Attendance Modal */}
      {showAttendanceModal && attendanceUsn && currentAttendanceStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setShowAttendanceModal(false)} />
          <div className="relative bg-white rounded-[3rem] w-full max-w-4xl p-10 shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><CalendarCheck size={32} /></div>
                <div><h2 className="text-2xl font-black text-slate-900 tracking-tight">Attendance Record</h2><p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{currentAttendanceStudent.name} • {currentAttendanceStudent.usn}</p></div>
              </div>
              <button onClick={() => setShowAttendanceModal(false)} className="p-3 bg-slate-50 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
              <div className="md:col-span-5 space-y-6">
                 <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-[11px] flex items-center gap-2"><Clock size={14} /> Log Manual Session</h3>
                    <input type="date" className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-white font-bold" value={attDate} onChange={e => setAttDate(e.target.value)} />
                    <div className="grid grid-cols-3 gap-1">
                      {(['present', 'absent', 'leave'] as const).map(s => (
                        <button key={s} onClick={() => setAttStatus(s as AttendanceStatus)} className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all ${attStatus === s ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200'}`}>{s[0]}</button>
                      ))}
                    </div>
                    <button onClick={() => {
                      const student = list.search(attendanceUsn);
                      if (student) {
                        const records = student.attendance || [];
                        const updatedRecords = records.filter(r => r.date !== attDate);
                        updatedRecords.push({ date: attDate, status: attStatus });
                        updatedRecords.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        student.attendance = updatedRecords;
                        updateStudents();
                      }
                    }} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl uppercase tracking-widest text-[10px]">Commit Log Entry</button>
                 </div>
                 <div className="p-6 bg-indigo-600 rounded-3xl text-white"><p className="text-[10px] font-black uppercase opacity-60 mb-1">Success Metric</p><p className="text-4xl font-black">{calculateAttendancePercentage(currentAttendanceStudent.attendance)}%</p></div>
              </div>
              <div className="md:col-span-7 space-y-4">
                 <h3 className="font-black text-slate-800 uppercase tracking-widest text-[11px] flex items-center gap-2"><History size={16} /> Chronological Logs</h3>
                 <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {currentAttendanceStudent.attendance?.length > 0 ? currentAttendanceStudent.attendance.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${r.status === 'present' ? 'bg-emerald-500' : r.status === 'absent' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                          <div><p className="text-xs font-black text-slate-800 capitalize">{r.status}</p><p className="text-[10px] text-slate-400 font-bold">{r.date}</p></div>
                        </div>
                        <button onClick={() => {
                           const student = list.search(attendanceUsn);
                           if (student) {
                             student.attendance = student.attendance.filter(rec => rec.date !== r.date);
                             updateStudents();
                           }
                        }} className="p-2 text-slate-300 hover:text-rose-500 transition-all"><Trash2 size={16} /></button>
                      </div>
                    )) : <p className="text-center py-12 text-slate-400 font-bold text-xs italic uppercase tracking-widest">No node data</p>}
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmUsn && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setDeleteConfirmUsn(null)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl text-center animate-in zoom-in duration-200">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-8"><AlertTriangle size={40} /></div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Confirm Delete</h3>
            <p className="text-slate-500 font-semibold mb-10 text-sm">Removal of <span className="text-rose-600 font-black">{deleteConfirmUsn}</span> is permanent.</p>
            <button onClick={confirmDelete} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-5 rounded-2xl shadow-xl mb-3 uppercase tracking-widest text-xs">Purge Student Node</button>
            <button onClick={() => setDeleteConfirmUsn(null)} className="w-full bg-slate-50 text-slate-500 font-black py-4 rounded-2xl hover:bg-slate-100 uppercase tracking-widest text-xs">Cancel</button>
          </div>
        </div>
      )}

      {/* Global CSS for Custom Scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);