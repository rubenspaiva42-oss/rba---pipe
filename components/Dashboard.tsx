import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
  Phone,
  Users,
  Calendar,
  LogOut,
  TrendingUp,
  X,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Share2,
  Globe,
  List,
  Pencil,
  Briefcase,
  UserCircle,
  Camera,
  CheckCircle2,
  Target,
  Trophy,
  PieChart,
  Tag,
  ShieldCheck,
  Wallet,
  History,
  MoreHorizontal,
  Filter,
  Download,
  Edit3,
  Clock,
  FileText,
  Gem,
  ChevronLeft,
  ChevronRight,
  Mail,
  Smartphone,
  Upload,
  Minus,
  PhoneOff,
  PhoneForwarded,
  ThumbsDown,
  ThumbsUp,
  Bell,
  Layout,
  Check,
  BarChart2,
  Activity as ActivityIcon,
  DollarSign,
  Search,
  Info,
  Image as ImageIcon,
  Key,
  UserPlus,
  UserMinus
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  AreaChart,
  Area,
  ReferenceLine,
  LineChart,
  Line,
  Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import { Lead, LeadSource, Advisor, ProductType, ProductItem, Activity, ActivityType } from '../types';
import { Button } from './ui/Button';
import { supabaseService } from '../src/services/supabaseService';
import { authService } from '../src/services/authService';

interface DashboardProps {
  onLogout: () => void;
  currentUser: { name: string; xpId: string } | null;
}

// Helper para formatar telefone
const formatPhoneNumber = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length > 11) return value.substring(0, 15);

  if (numbers.length === 11) {
    return numbers.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  } else if (numbers.length === 10) {
    return numbers.replace(/^(\d{2})(\d{4})(\d{4}).*/, '($1) $2-$3');
  } else if (numbers.length > 2) {
    return numbers.replace(/^(\d{2})/, '($1) ');
  }
  return numbers;
};

// Helper para formatar data de agendamento
const formatScheduledDate = (dateString?: string) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

// Helper para formatação abreviada no card
const formatScheduledDateShort = (dateString?: string) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// IDs que possuem permissão de gestor automaticamente
const MANAGER_IDS = ['A69037', 'A12345'];

// --- Componente Interno para Texto Editável ---
const EditableText = ({
  value,
  onSave,
  className = "",
  inputClassName = "",
  darkTheme = false
}: {
  value: string;
  onSave: (val: string) => void;
  className?: string;
  inputClassName?: string;
  darkTheme?: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (tempValue.trim() !== "") {
      onSave(tempValue);
    } else {
      setTempValue(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  if (isEditing) {
    return (
      <input
        autoFocus
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${darkTheme ? 'bg-slate-700 text-white border-slate-500' : 'bg-white text-slate-900 border-slate-300'} border rounded px-2 py-1 outline-none w-full min-w-[150px] ${inputClassName}`}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer hover:opacity-80 transition-all flex items-center gap-2 group border border-transparent hover:border-slate-300/50 rounded px-1 -ml-1 ${className}`}
      title="Clique para editar"
    >
      {value}
      <Edit3 className={`w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ${darkTheme ? 'text-slate-400' : 'text-slate-400'}`} />
    </div>
  );
};

const getDaysInPipe = (dateString: string) => {
  const created = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfWeek = (date: Date) => {
  const d = getStartOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
};

const formatDateRange = (start: Date, end: Date) => {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${start.toLocaleDateString('pt-BR', options)} - ${end.toLocaleDateString('pt-BR', options)}`;
};

const getMonthName = (date: Date) => {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};



const PRODUCT_LABELS: Record<ProductType, string> = {
  investimentos: 'Investimentos',
  seguros: 'Seguros',
  consorcio: 'Consórcio',
  previdencia: 'Previdência',
  cambio: 'Câmbio',
  credito: 'Crédito',
  outros: 'Outros'
};

const INITIAL_TEAM: Advisor[] = [
  {
    id: 'adv_rubens',
    name: 'Rubens Paiva',
    photoUrl: '',
    role: 'Gestor',
    activities: [],
    leads: []
  },
  {
    id: 'adv_alexander',
    name: 'Alexander Silva',
    photoUrl: '',
    role: 'Assessor',
    activities: [],
    leads: []
  },
  {
    id: 'adv_fernando',
    name: 'Fernando Henrique',
    photoUrl: '',
    role: 'Assessor',
    activities: [],
    leads: []
  },
  {
    id: 'adv_frederico',
    name: 'Frederico Brandao',
    photoUrl: '',
    role: 'Assessor',
    activities: [],
    leads: []
  },
  {
    id: 'adv_gabriel',
    name: 'Gabriel Darze',
    photoUrl: '',
    role: 'Assessor',
    activities: [],
    leads: []
  },
  {
    id: 'adv_glaucia',
    name: 'Glaucia Medici',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'Assessor Especialista',
    activities: [],
    leads: []
  },
  {
    id: 'adv_jose',
    name: 'Jose Augusto Camilo',
    photoUrl: '',
    role: 'Assessor',
    activities: [],
    leads: []
  },
  {
    id: 'adv_marcos',
    name: 'Marcos Milet',
    photoUrl: '',
    role: 'Assessor',
    activities: [],
    leads: []
  },
  {
    id: 'adv_wallace',
    name: 'Wallace Almeida',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'Assessor Senior',
    activities: [],
    leads: []
  }
];

const DEFAULT_COLUMNS = [
  { id: 'lead', title: 'Leads (300k+)', color: 'border-slate-300', step: 1 },
  { id: 'ligacao', title: 'A Ligar', color: 'border-blue-400', step: 2 },
  { id: 'reuniao1', title: '1ª Reunião', color: 'border-indigo-400', step: 3 },
  { id: 'reuniao2', title: '2ª Reunião', color: 'border-purple-400', step: 4 },
  { id: 'fechamento', title: 'Fechamento', color: 'border-green-400', step: 5 },
];



export const Dashboard: React.FC<DashboardProps> = ({ onLogout, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'funnel' | 'metrics' | 'team'>('funnel');
  const [team, setTeam] = useState<Advisor[]>(INITIAL_TEAM);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const remoteTeam = await supabaseService.getTeam();
        if (remoteTeam && remoteTeam.length > 0) {
          setTeam(remoteTeam);
        } else {
          // Se não houver dados no Supabase, inicializa com INITIAL_TEAM
          for (const advisor of INITIAL_TEAM) {
            await supabaseService.saveAdvisor(advisor);
            for (const lead of advisor.leads) {
              await supabaseService.saveLead(advisor.id, lead);
            }
            for (const activity of advisor.activities) {
              await supabaseService.saveActivity(advisor.id, activity);
            }
          }
        }
      } catch (error) {
        console.error('Error loading data from Supabase:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>(INITIAL_TEAM[0].id);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(3000000); // Meta Mensal Padrão (3MM)
  const [weeklyCallsGoal, setWeeklyCallsGoal] = useState<number>(50); // Meta semanal de ligações
  const [weeklyMeeting1Goal, setWeeklyMeeting1Goal] = useState<number>(2); // Meta semanal de 1ª reunião
  const [weeklyMeeting2Goal, setWeeklyMeeting2Goal] = useState<number>(1); // Meta semanal de 2ª reunião
  const [monthlyOpeningsGoal, setMonthlyOpeningsGoal] = useState<number>(5); // Meta mensal de aberturas qualificados

  // Custom Branding State
  const [brandName, setBrandName] = useState('Pipe Semanal');
  const [brandLogo, setBrandLogo] = useState<string | null>(null);

  // Drag and Drop State
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [draggedOverColumnId, setDraggedOverColumnId] = useState<string | null>(null);

  // Filters State
  const [sourceFilter, setSourceFilter] = useState<LeadSource | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<string>(''); // YYYY-MM-DD

  // Refs for File Inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // --- Security: Is Manager Check ---
  const isManager = useMemo(() => {
    return currentUser && MANAGER_IDS.includes(currentUser.xpId.trim().toUpperCase());
  }, [currentUser]);

  // --- Login Effect Logic ---
  useEffect(() => {
    if (currentUser) {
      const normalizedId = `adv_${currentUser.xpId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;

      setTeam(prevTeam => {
        const existingAdvisor = prevTeam.find(adv => adv.id === normalizedId || adv.name === currentUser.name);

        if (existingAdvisor) {
          setSelectedAdvisorId(existingAdvisor.id);
          return prevTeam;
        } else {
          const isManagerId = MANAGER_IDS.includes(currentUser.xpId.trim().toUpperCase());
          const newAdvisor: Advisor = {
            id: normalizedId,
            name: currentUser.name,
            role: isManagerId ? 'Gestor' : 'Assessor',
            photoUrl: '',
            leads: [],
            activities: []
          };
          setSelectedAdvisorId(normalizedId);
          return [...prevTeam, newAdvisor];
        }
      });
    }
  }, [currentUser]);

  const [selectedWeekDate, setSelectedWeekDate] = useState(new Date());
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date());
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);

  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

  // Qualified Opening Modal State
  const [isQualifiedModalOpen, setIsQualifiedModalOpen] = useState(false);
  const [pendingMoveLeadId, setPendingMoveLeadId] = useState<string | null>(null);
  const [pendingMoveTargetStatus, setPendingMoveTargetStatus] = useState<Lead['status'] | null>(null);

  // Appointment Modal State
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [selectedAppointmentLead, setSelectedAppointmentLead] = useState<Lead | null>(null);
  const [newAppointmentDate, setNewAppointmentDate] = useState('');

  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadSource, setNewLeadSource] = useState<LeadSource>('indicacao');
  const [newLeadStatus, setNewLeadStatus] = useState<Lead['status']>('lead');
  const [newLeadNotes, setNewLeadNotes] = useState('');
  const [newLeadScheduledFor, setNewLeadScheduledFor] = useState('');
  const [leadProducts, setLeadProducts] = useState<ProductItem[]>([]);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closingLeadId, setClosingLeadId] = useState<string | null>(null);
  const [closingProducts, setClosingProducts] = useState<ProductItem[]>([]);

  // Password Change Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!pwdCurrent.trim()) {
      setPwdError('Informe a senha atual.');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdError('A nova senha e a confirmação não coincidem.');
      return;
    }
    if (pwdNew.length < 6) {
      setPwdError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    const result = await authService.changePassword(currentUser?.xpId || '', pwdCurrent, pwdNew);
    if (!result.success) {
      setPwdError(result.error || 'Erro ao alterar senha.');
      return;
    }

    setPwdSuccess('Senha alterada com sucesso!');
    setPwdCurrent('');
    setPwdNew('');
    setPwdConfirm('');
    setTimeout(() => {
      setIsPasswordModalOpen(false);
      setPwdSuccess('');
    }, 1500);
  };

  // --- Add Assessor Modal State ---
  const [isAddAdvisorModalOpen, setIsAddAdvisorModalOpen] = useState(false);
  const [newAdvisorName, setNewAdvisorName] = useState('');
  const [newAdvisorXpId, setNewAdvisorXpId] = useState('A');
  const [newAdvisorRole, setNewAdvisorRole] = useState<'Assessor' | 'Assessor Senior' | 'Assessor Especialista'>('Assessor');
  const [addAdvisorError, setAddAdvisorError] = useState('');
  const [addAdvisorSuccess, setAddAdvisorSuccess] = useState('');

  const handleAddAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddAdvisorError('');
    setAddAdvisorSuccess('');

    if (!newAdvisorName.trim()) {
      setAddAdvisorError('Nome é obrigatório.');
      return;
    }
    if (!newAdvisorXpId.trim() || newAdvisorXpId === 'A') {
      setAddAdvisorError('Matrícula XP é obrigatória.');
      return;
    }

    const result = await authService.createAdvisor(newAdvisorXpId, newAdvisorName, newAdvisorRole);
    if (!result.success) {
      setAddAdvisorError(result.error || 'Erro ao cadastrar.');
      return;
    }

    // Add to team state
    const normalizedId = `adv_${newAdvisorXpId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
    const newAdvisor: Advisor = {
      id: normalizedId,
      name: newAdvisorName.trim(),
      photoUrl: '',
      role: newAdvisorRole,
      leads: [],
      activities: []
    };
    setTeam(prev => [...prev, newAdvisor]);
    supabaseService.saveAdvisor(newAdvisor).catch(err => console.error('Error saving advisor:', err));

    setAddAdvisorSuccess(`${newAdvisorName.trim()} cadastrado com sucesso!`);
    setNewAdvisorName('');
    setNewAdvisorXpId('A');
    setNewAdvisorRole('Assessor');
    setTimeout(() => {
      setIsAddAdvisorModalOpen(false);
      setAddAdvisorSuccess('');
    }, 1500);
  };

  const handleRemoveAdvisor = async (advisorId: string, advisorName: string) => {
    // Find the XP ID from the advisor ID
    const xpIdMatch = advisorId.replace('adv_', '').toUpperCase();
    const advisor = team.find(a => a.id === advisorId);
    if (!advisor) return;

    if (!confirm(`Tem certeza que deseja remover ${advisorName} da equipe? Esta ação não pode ser desfeita.`)) {
      return;
    }

    const result = await authService.deactivateAdvisor(xpIdMatch);
    if (!result.success) {
      alert(result.error || 'Erro ao remover assessor.');
      return;
    }

    setTeam(prev => prev.filter(a => a.id !== advisorId));
  };

  const openAddAdvisorModal = () => {
    setNewAdvisorName('');
    setNewAdvisorXpId('A');
    setNewAdvisorRole('Assessor');
    setAddAdvisorError('');
    setAddAdvisorSuccess('');
    setIsAddAdvisorModalOpen(true);
  };

  const openPasswordModal = () => {
    setPwdCurrent('');
    setPwdNew('');
    setPwdConfirm('');
    setPwdError('');
    setPwdSuccess('');
    setIsPasswordModalOpen(true);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  const formatNumberCompact = (num: number) => Intl.NumberFormat('pt-BR', { notation: "compact", maximumFractionDigits: 1 }).format(num);

  const getSourceConfig = (source: LeadSource) => {
    switch (source) {
      case 'indicacao': return { label: 'Indicação', icon: Share2, className: 'bg-purple-100 text-purple-700 border-purple-200' };
      case 'redes_sociais': return { label: 'Redes Sociais', icon: Globe, className: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'lista_fria': return { label: 'Lista Fria', icon: List, className: 'bg-slate-100 text-slate-700 border-slate-200' };
      default: return { label: 'Outros', icon: List, className: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const getProgressWidth = (status: string) => {
    const col = columns.find(c => c.id === status);
    if (!col) return '0%';
    return `${(col.step / 5) * 100}%`;
  };

  const calculateTotalValue = (items: ProductItem[]) => items.reduce((acc, item) => acc + (item.value || 0), 0);

  const handleOpenCalendar = (leadName: string, dateString?: string) => {
    const title = encodeURIComponent(`Reunião com ${leadName}`);
    let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}`;
    if (dateString) {
      const date = new Date(dateString);
      const start = date.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
      const endDate = new Date(date.getTime() + 60 * 60 * 1000);
      const end = endDate.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
      url += `&dates=${start}/${end}`;
    }
    window.open(url, '_blank');
  };

  const handleColumnTitleChange = (id: string, newTitle: string) => setColumns(columns.map(col => col.id === id ? { ...col, title: newTitle } : col));
  const changeWeek = (offset: number) => {
    const newDate = new Date(selectedWeekDate);
    newDate.setDate(newDate.getDate() + (offset * 7));
    setSelectedWeekDate(newDate);
  };
  const changeMonth = (offset: number) => {
    const newDate = new Date(selectedMonthDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setSelectedMonthDate(newDate);
  };

  const isInSelectedWeek = (dateString: string) => {
    const date = new Date(dateString);
    const startOfWeek = getStartOfWeek(selectedWeekDate);
    const endOfWeek = getEndOfWeek(selectedWeekDate);
    return date >= startOfWeek && date <= endOfWeek;
  };

  const isTodayAndSelected = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() && isInSelectedWeek(now.toISOString());
  };

  const isDateToday = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  };

  const isInSelectedMonth = (dateString: string) => {
    const date = new Date(dateString);
    return date.getMonth() === selectedMonthDate.getMonth() && date.getFullYear() === selectedMonthDate.getFullYear();
  };

  const currentAdvisor = team.find(a => a.id === selectedAdvisorId) || team[0];

  // Branding Handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBrandLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTeam(team.map(adv => adv.id === selectedAdvisorId ? { ...adv, photoUrl: reader.result as string } : adv));
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter Logic
  const filteredLeads = useMemo(() => {
    return currentAdvisor.leads.filter(lead => {
      const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
      const matchesDate = !dateFilter || lead.createdAt.startsWith(dateFilter);
      return matchesSource && matchesDate;
    });
  }, [currentAdvisor.leads, sourceFilter, dateFilter]);

  const todaysAppointments = useMemo(() => {
    return filteredLeads.filter(lead => lead.scheduledFor && isDateToday(lead.scheduledFor));
  }, [filteredLeads]);

  // Calculo de produção (Investimentos)
  const { monthlyProduction, informativeProduction, monthlyQualifiedOpenings } = useMemo(() => {
    let validTotal = 0;
    let informativeTotal = 0;
    let qualifiedOpenings = 0;

    filteredLeads.forEach(l => {
      if (l.isQualifiedOpening) {
        // Precisamos verificar se a abertura foi no mês selecionado. 
        // Como não temos uma data específica de abertura, vamos assumir que foi na data de criação ou última atividade.
        // Idealmente teríamos um 'qualifiedAt'. Por enquanto usaremos createdAt se estiver no mês.
        if (isInSelectedMonth(l.createdAt)) qualifiedOpenings++;
      }
      if (l.status === 'fechamento' && l.closedData && isInSelectedMonth(l.closedData.closedAt)) {
        l.closedData.products.forEach(p => {
          if (p.isSold && p.type === 'investimentos') {
            // Regra de Negócio: Somente investimentos >= 300k contam para a meta principal
            if (p.value >= 300000) {
              validTotal += p.value;
            } else if (p.value >= 100000) {
              // Informativo: entre 100k e 300k
              informativeTotal += p.value;
            }
          }
        });
      }
    });
    return { monthlyProduction: validTotal, informativeProduction: informativeTotal, monthlyQualifiedOpenings: qualifiedOpenings };
  }, [filteredLeads, selectedMonthDate]);

  const getWeeklyActivityStats = (advisor: Advisor) => {
    const callsInSelectedWeek = advisor.activities.filter(a => a.type === 'call' && isInSelectedWeek(a.timestamp)).length;
    const callsToday = advisor.activities.filter(a => a.type === 'call' && isTodayAndSelected(a.timestamp)).length;
    const meetings1 = advisor.activities.filter(a => a.type === 'meeting1' && isInSelectedWeek(a.timestamp)).length;
    const meetings1Today = advisor.activities.filter(a => a.type === 'meeting1' && isTodayAndSelected(a.timestamp)).length;
    const meetings2 = advisor.activities.filter(a => a.type === 'meeting2' && isInSelectedWeek(a.timestamp)).length;
    const meetings2Today = advisor.activities.filter(a => a.type === 'meeting2' && isTodayAndSelected(a.timestamp)).length;
    return { callsToday, callsInSelectedWeek, meetings1, meetings1Today, meetings2, meetings2Today };
  };

  const currentStats = getWeeklyActivityStats(currentAdvisor);

  const getAdvisorMonthlyMetrics = (advisor: Advisor) => {
    let captacao = 0;
    let producao = 0;
    let qualifiedOpenings = 0;
    advisor.leads.forEach(l => {
      if (l.isQualifiedOpening && isInSelectedMonth(l.createdAt)) qualifiedOpenings++;
      if (l.status === 'fechamento' && l.closedData && isInSelectedMonth(l.closedData.closedAt)) {
        l.closedData.products.forEach(p => {
          if (p.isSold) {
            if (p.type === 'investimentos') {
              // Aplica a mesma regra de 300k para os KPIs de gestão também
              if (p.value >= 300000) captacao += p.value;
            }
            else producao += p.value;
          }
        });
      }
    });
    return { captacao, producao, qualifiedOpenings };
  };

  const teamManagementStats = useMemo(() => {
    const stats = team.map(adv => {
      const monthActivities = adv.activities.filter(act => isInSelectedMonth(act.timestamp));
      const callsCount = monthActivities.filter(a => a.type === 'call').length;
      const meetings1Count = monthActivities.filter(a => a.type === 'meeting1').length;
      const meetings2Count = monthActivities.filter(a => a.type === 'meeting2').length;
      const meetingsTotal = meetings1Count + meetings2Count;

      const leads = adv.leads;
      const countLead = leads.filter(l => l.status === 'lead').length;
      const countLigacao = leads.filter(l => l.status === 'ligacao').length;
      const countReuniao1 = leads.filter(l => l.status === 'reuniao1').length;
      const countReuniao2 = leads.filter(l => l.status === 'reuniao2').length;
      const countFechamento = leads.filter(l => l.status === 'fechamento' && l.closedData && isInSelectedMonth(l.closedData.closedAt)).length;
      const activeLeads = countLead + countLigacao + countReuniao1 + countReuniao2;

      const financial = getAdvisorMonthlyMetrics(adv);

      const goalAchievement = (financial.captacao / (monthlyGoal || 1)) * 100;
      const efficiency = callsCount > 0 ? (meetingsTotal / callsCount) * 100 : 0;
      const conversionRate = meetingsTotal > 0 ? (countFechamento / meetingsTotal) * 100 : 0;

      const intensityScore = (callsCount * 1) + (meetingsTotal * 5) + (countFechamento * 20);

      return {
        id: adv.id,
        name: adv.name,
        calls: callsCount,
        meetings: meetingsTotal,
        proposals: countReuniao2,
        closedDeals: countFechamento,
        captacao: financial.captacao,
        qualifiedOpenings: financial.qualifiedOpenings,
        intensityScore,
        goalAchievement,
        efficiency,
        conversionRate,
        funnel: { lead: countLead, ligacao: countLigacao, reuniao1: countReuniao1, reuniao2: countReuniao2, fechamento: countFechamento }
      };
    });

    const ranked = [...stats].sort((a, b) => b.captacao - a.captacao || b.intensityScore - a.intensityScore);
    const totalCallsTeam = stats.reduce((acc, curr) => acc + curr.calls, 0);
    const totalMeetingsTeam = stats.reduce((acc, curr) => acc + curr.meetings, 0);
    const totalCaptacaoTeam = stats.reduce((acc, curr) => acc + curr.captacao, 0);
    const totalQualifiedOpeningsTeam = stats.reduce((acc, curr) => acc + curr.qualifiedOpenings, 0);
    const totalActiveLeads = stats.reduce((acc, curr) => acc + curr.funnel.lead + curr.funnel.ligacao + curr.funnel.reuniao1 + curr.funnel.reuniao2, 0);

    const avgConversionTeam = totalMeetingsTeam > 0 ? (stats.reduce((acc, curr) => acc + curr.closedDeals, 0) / totalMeetingsTeam) * 100 : 0;
    const avgGoalAchievementTeam = (totalCaptacaoTeam / ((monthlyGoal * team.length) || 1)) * 100;
    const ticketMedioTeam = stats.reduce((acc, curr) => acc + curr.closedDeals, 0) > 0
      ? totalCaptacaoTeam / stats.reduce((acc, curr) => acc + curr.closedDeals, 0)
      : 0;

    const daysInMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0).getDate();
    const dailyEvolution = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      let calls = 0;
      let meetings = 0;
      team.forEach(adv => {
        adv.activities.forEach(act => {
          const actDate = new Date(act.timestamp);
          if (isInSelectedMonth(act.timestamp) && actDate.getDate() === day) {
            if (act.type === 'call') calls++;
            else meetings++;
          }
        });
      });
      return { day: day.toString(), calls, meetings };
    });

    return {
      ranked,
      totalCallsTeam,
      totalMeetingsTeam,
      totalCaptacaoTeam,
      totalActiveLeads,
      totalQualifiedOpeningsTeam,
      avgConversionTeam,
      avgGoalAchievementTeam,
      ticketMedioTeam,
      dailyEvolution
    };
  }, [team, selectedMonthDate]);


  const { captacao: totalCaptacaoMonth, producao: totalProducaoMonth } = getAdvisorMonthlyMetrics(currentAdvisor);

  const registerActivity = async (type: ActivityType) => {
    const newActivity = { id: Date.now().toString(), type, timestamp: new Date().toISOString() };
    setTeam(team.map(adv => adv.id === selectedAdvisorId ? { ...adv, activities: [...adv.activities, newActivity] } : adv));
    try {
      await supabaseService.saveActivity(selectedAdvisorId, newActivity);
    } catch (error) {
      console.error('Error saving activity to Supabase:', error);
    }
  };

  const removeLastActivity = async (type: ActivityType) => {
    let activityToDelete: string | null = null;
    setTeam(team.map(adv => {
      if (adv.id === selectedAdvisorId) {
        const activities = [...adv.activities];
        let lastIndex = -1;
        for (let i = activities.length - 1; i >= 0; i--) { if (activities[i].type === type) { lastIndex = i; break; } }
        if (lastIndex !== -1) {
          activityToDelete = activities[lastIndex].id;
          activities.splice(lastIndex, 1);
        }
        return { ...adv, activities };
      }
      return adv;
    }));

    if (activityToDelete) {
      try {
        await supabaseService.deleteActivity(activityToDelete);
      } catch (error) {
        console.error('Error deleting activity from Supabase:', error);
      }
    }
  };



  const handleImportClick = () => fileInputRef.current?.click();
  const normalizeSource = (rawSource: any): LeadSource => {
    if (!rawSource) return 'lista_fria';
    const s = String(rawSource).toLowerCase().trim();
    if (s.includes('indica') || s.includes('indicacao')) return 'indicacao';
    if (s.includes('rede') || s.includes('social') || s.includes('insta') || s.includes('linkedin')) return 'redes_sociais';
    return 'lista_fria';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
      if (jsonData.length === 0) { alert("A planilha parece estar vazia."); return; }
      const keys = Object.keys(jsonData[0]);
      const findKey = (candidates: string[]) => keys.find(k => candidates.includes(k.toLowerCase().trim()));
      const nameKey = findKey(['nome', 'client', 'name', 'cliente']);
      if (!nameKey) { alert("Erro: Não encontramos a coluna 'Nome' na planilha."); return; }
      const phoneKey = findKey(['telefone', 'phone', 'whatsapp', 'celular', 'tel']);
      const emailKey = findKey(['email', 'e-mail', 'mail', 'contato']);
      const sourceKey = findKey(['origem', 'source', 'como conheceu']);
      const newLeads: Lead[] = jsonData.map((row: any): Lead => ({ id: Date.now().toString() + Math.random().toString().slice(2), createdAt: new Date().toISOString(), name: String(row[nameKey] || '').trim(), phone: String(row[phoneKey] || '').trim(), email: String(row[emailKey] || '').trim(), source: normalizeSource(row[sourceKey]), status: 'lead', value: 0, products: [{ id: Date.now().toString() + Math.random(), type: 'investimentos', value: 0 }], lastActivity: 'Importado', notes: 'Importado via planilha' })).filter((l: Lead) => l.name && l.name !== 'undefined');
      setTeam(team.map(adv => adv.id === selectedAdvisorId ? { ...adv, leads: [...adv.leads, ...newLeads] } : adv));
      alert(`${newLeads.length} leads importados com sucesso!`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) { alert("Erro ao ler o arquivo."); }
  };

  const addLeadProduct = () => setLeadProducts([...leadProducts, { id: Date.now().toString(), type: 'investimentos', value: 0 }]);
  const updateLeadProduct = (id: string, field: keyof ProductItem, value: any) => setLeadProducts(leadProducts.map(p => p.id === id ? { ...p, [field]: value } : p));
  const removeLeadProduct = (id: string) => setLeadProducts(leadProducts.filter(p => p.id !== id));

  const saveLeadInternal = (overrideStatus?: Lead['status'], overrideNotes?: string, overrideLastActivity?: string, activityToAdd?: ActivityType) => {
    if (!newLeadName) return;
    const totalValue = calculateTotalValue(leadProducts);

    const finalNotes = overrideNotes !== undefined ? overrideNotes : newLeadNotes;
    const finalStatus = overrideStatus !== undefined ? overrideStatus : (editingLeadId ? newLeadStatus : (newLeadStatus || 'lead'));
    const finalActivity = overrideLastActivity || (editingLeadId ? 'Editado agora' : 'Agora');
    const finalScheduledFor = newLeadScheduledFor || undefined;

    setTeam(team.map(advisor => {
      if (advisor.id === selectedAdvisorId) {
        const newActivityObj = activityToAdd
          ? { id: Date.now().toString(), type: activityToAdd, timestamp: new Date().toISOString() }
          : null;
        const updatedActivities = newActivityObj
          ? [...advisor.activities, newActivityObj]
          : advisor.activities;

        if (newActivityObj) {
          supabaseService.saveActivity(selectedAdvisorId, newActivityObj).catch(err => console.error('Error saving activity to Supabase:', err));
        }

        if (editingLeadId) {
          const updatedLeads = advisor.leads.map(l => {
            if (l.id === editingLeadId) {
              const updatedLead = {
                ...l,
                name: newLeadName,
                phone: newLeadPhone,
                email: newLeadEmail,
                value: totalValue,
                products: leadProducts,
                source: newLeadSource,
                notes: finalNotes,
                status: (finalStatus || l.status) as Lead['status'],
                lastActivity: finalActivity,
                scheduledFor: finalScheduledFor || l.scheduledFor
              };
              supabaseService.saveLead(selectedAdvisorId, updatedLead).catch(err => console.error('Error saving lead to Supabase:', err));
              return updatedLead;
            }
            return l;
          });
          return {
            ...advisor,
            activities: updatedActivities,
            leads: updatedLeads
          };
        } else {
          const newLead: Lead = {
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            name: newLeadName,
            phone: newLeadPhone,
            email: newLeadEmail,
            value: totalValue,
            products: leadProducts,
            status: (finalStatus || 'lead') as Lead['status'],
            source: newLeadSource,
            notes: finalNotes,
            lastActivity: finalActivity,
            scheduledFor: finalScheduledFor
          };
          supabaseService.saveLead(selectedAdvisorId, newLead).catch(err => console.error('Error saving lead to Supabase:', err));
          return {
            ...advisor,
            activities: updatedActivities,
            leads: [...advisor.leads, newLead]
          };
        }
      }
      return advisor;
    }));
    closeLeadModal();
  };

  const handleSaveLead = (e: React.FormEvent) => {
    e.preventDefault();
    saveLeadInternal();
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: Lead['status']) => {
    e.preventDefault();
    setDraggedOverColumnId(null);
    if (draggedLeadId) {
      const lead = filteredLeads.find(l => l.id === draggedLeadId);
      if (lead && lead.status === 'reuniao1' && targetStatus === 'reuniao2') {
        setPendingMoveLeadId(draggedLeadId);
        setPendingMoveTargetStatus(targetStatus);
        setIsQualifiedModalOpen(true);
      } else {
        updateLeadStatus(draggedLeadId, targetStatus);
      }
      setDraggedLeadId(null);
    }
  };

  const handleInteractionAction = (actionType: 'no_contact' | 'call_again' | 'contact_failed' | 'success') => {
    const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const date = new Date().toLocaleDateString('pt-BR');
    let noteToAppend = '';
    let newStatus: Lead['status'] | undefined = undefined;
    let newActivityNote = '';
    let activityTypeToAdd: ActivityType | undefined;

    if ((actionType === 'call_again' || actionType === 'success') && !newLeadScheduledFor) {
      alert("⚠️ Atenção: Para agendar, por favor selecione uma DATA e HORA no campo 'Agendamento / Próximo Passo' logo acima.");
      return;
    }

    switch (actionType) {
      case 'no_contact':
        noteToAppend = `[${date} ${timestamp}] ❌ Não consegui contato`;
        newActivityNote = 'Tentativa s/ contato';
        activityTypeToAdd = 'call';
        break;
      case 'call_again':
        const fmtDate1 = formatScheduledDate(newLeadScheduledFor);
        noteToAppend = `[${date} ${timestamp}] 📞 Ligar novamente (Agendado para: ${fmtDate1})`;
        newStatus = 'ligacao';
        newActivityNote = 'Agendado Retentativa';
        activityTypeToAdd = 'call';
        handleOpenCalendar(newLeadName, newLeadScheduledFor);
        break;
      case 'contact_failed':
        noteToAppend = `[${date} ${timestamp}] 👎 Atendido sem sucesso`;
        newActivityNote = 'Contato Realizado';
        activityTypeToAdd = 'call';
        break;
      case 'success':
        const fmtDate2 = formatScheduledDate(newLeadScheduledFor);
        noteToAppend = `[${date} ${timestamp}] ✅ Sucesso - Agendado Reunião (Para: ${fmtDate2})`;
        newStatus = 'reuniao1';
        newActivityNote = 'Agendado Reunião';
        activityTypeToAdd = 'meeting1';
        handleOpenCalendar(newLeadName, newLeadScheduledFor);
        break;
    }
    const updatedNotes = newLeadNotes ? `${newLeadNotes}\n${noteToAppend}` : noteToAppend;
    saveLeadInternal(newStatus, updatedNotes, newActivityNote, activityTypeToAdd);
  };

  const openAppointmentModal = (lead: Lead) => {
    setSelectedAppointmentLead(lead);
    setNewAppointmentDate('');
    setIsAppointmentModalOpen(true);
  };

  const closeAppointmentModal = () => {
    setIsAppointmentModalOpen(false);
    setSelectedAppointmentLead(null);
  };

  const handleConfirmAppointment = () => {
    if (!selectedAppointmentLead) return;
    const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const date = new Date().toLocaleDateString('pt-BR');
    const noteToAppend = `[${date} ${timestamp}] ✅ Compromisso realizado conforme agendamento.`;

    const updatedLead = {
      ...selectedAppointmentLead,
      notes: selectedAppointmentLead.notes ? `${selectedAppointmentLead.notes}\n${noteToAppend}` : noteToAppend,
      lastActivity: 'Compromisso Realizado',
      scheduledFor: undefined
    };

    setTeam(team.map(adv => adv.id === selectedAdvisorId ? {
      ...adv,
      leads: adv.leads.map(l => l.id === updatedLead.id ? updatedLead : l)
    } : adv));

    closeAppointmentModal();
  };

  const handleReschedule = () => {
    if (!selectedAppointmentLead || !newAppointmentDate) return;
    const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const date = new Date().toLocaleDateString('pt-BR');
    const fmtDate = formatScheduledDate(newAppointmentDate);
    const noteToAppend = `[${date} ${timestamp}] 🗓️ Compromisso reagendado para: ${fmtDate}`;
    const updatedLead = { ...selectedAppointmentLead, notes: selectedAppointmentLead.notes ? `${selectedAppointmentLead.notes}\n${noteToAppend}` : noteToAppend, lastActivity: 'Reagendado', scheduledFor: newAppointmentDate };
    setTeam(team.map(adv => adv.id === selectedAdvisorId ? { ...adv, leads: adv.leads.map(l => l.id === updatedLead.id ? updatedLead : l) } : adv));
    handleOpenCalendar(updatedLead.name, newAppointmentDate);
    closeAppointmentModal();
  };

  const handleConvertToClient = () => {
    if (!editingLeadId) return;
    const lead = filteredLeads.find(l => l.id === editingLeadId);
    if (lead) {
      setClosingLeadId(lead.id);
      setClosingProducts(lead.products.map(p => ({ ...p, isSold: true })));
      setIsClosingModalOpen(true);
      closeLeadModal();
    }
  };

  const openNewLeadModal = () => { setEditingLeadId(null); setNewLeadName(''); setNewLeadPhone(''); setNewLeadEmail(''); setNewLeadSource('indicacao'); setNewLeadStatus('lead'); setNewLeadNotes(''); setNewLeadScheduledFor(''); setLeadProducts([{ id: Date.now().toString(), type: 'investimentos', value: 0 }]); setIsLeadModalOpen(true); };
  const openEditLeadModal = (lead: Lead) => { setEditingLeadId(lead.id); setNewLeadName(lead.name); setNewLeadPhone(lead.phone || ''); setNewLeadEmail(lead.email || ''); setNewLeadSource(lead.source); setNewLeadStatus(lead.status); setNewLeadNotes(lead.notes || ''); setNewLeadScheduledFor(lead.scheduledFor || ''); setLeadProducts(lead.products.map(p => ({ ...p }))); setIsLeadModalOpen(true); };
  const closeLeadModal = () => { setIsLeadModalOpen(false); setEditingLeadId(null); setLeadProducts([]); };
  const deleteLead = async (leadId: string) => {
    if (confirm('Tem certeza que deseja excluir permanentemente este lead?')) {
      setTeam(team.map(adv => adv.id === selectedAdvisorId ? { ...adv, leads: adv.leads.filter(l => l.id !== leadId) } : adv));
      if (isLeadModalOpen) closeLeadModal();
      try {
        await supabaseService.deleteLead(leadId);
      } catch (error) {
        console.error('Error deleting lead from Supabase:', error);
      }
    }
  };

  const moveLead = (leadId: string, direction: 'next' | 'prev', currentStatus: string) => {
    const statusOrder = ['lead', 'ligacao', 'reuniao1', 'reuniao2', 'fechamento'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    if (direction === 'next' && currentStatus === 'reuniao2') {
      const lead = filteredLeads.find(l => l.id === leadId);
      if (lead) { setClosingLeadId(leadId); setClosingProducts(lead.products.map(p => ({ ...p, isSold: true }))); setIsClosingModalOpen(true); }
      return;
    }

    let newStatus = currentStatus;
    if (direction === 'next' && currentIndex < statusOrder.length - 1) newStatus = statusOrder[currentIndex + 1];
    else if (direction === 'prev' && currentIndex > 0) newStatus = statusOrder[currentIndex - 1];

    if (newStatus !== currentStatus) {
      if (currentStatus === 'reuniao1' && newStatus === 'reuniao2') {
        setPendingMoveLeadId(leadId);
        setPendingMoveTargetStatus(newStatus as Lead['status']);
        setIsQualifiedModalOpen(true);
      } else {
        updateLeadStatus(leadId, newStatus as Lead['status']);
      }
    }
  };

  const updateLeadStatus = async (leadId: string, status: Lead['status'], closedData?: any, isQualifiedOpening?: boolean) => {
    let updatedLead: Lead | null = null;
    setTeam(team.map(adv => {
      if (adv.id === selectedAdvisorId) {
        const updatedLeads = adv.leads.map(l => {
          if (l.id === leadId) {
            updatedLead = { ...l, status, lastActivity: 'Agora', closedData: closedData || l.closedData, isQualifiedOpening: isQualifiedOpening !== undefined ? isQualifiedOpening : l.isQualifiedOpening };
            return updatedLead;
          }
          return l;
        });

        // Se mover para reunião, registra atividade automaticamente
        const newActivities = [...adv.activities];
        let newActivity: Activity | null = null;
        if (status === 'reuniao1') {
          newActivity = { id: Date.now().toString(), type: 'meeting1', timestamp: new Date().toISOString(), leadId };
          newActivities.push(newActivity);
        } else if (status === 'reuniao2') {
          newActivity = { id: Date.now().toString(), type: 'meeting2', timestamp: new Date().toISOString(), leadId };
          newActivities.push(newActivity);
        }

        // Sync with Supabase
        if (updatedLead) {
          supabaseService.saveLead(selectedAdvisorId, updatedLead).catch(err => console.error('Error saving lead to Supabase:', err));
        }
        if (newActivity) {
          supabaseService.saveActivity(selectedAdvisorId, newActivity).catch(err => console.error('Error saving activity to Supabase:', err));
        }

        return { ...adv, leads: updatedLeads, activities: newActivities };
      }
      return adv;
    }));
  };

  const addClosingProduct = () => setClosingProducts([...closingProducts, { id: Date.now().toString(), type: 'investimentos', value: 0, isSold: true }]);
  const updateClosingProduct = (id: string, field: keyof ProductItem, value: any) => setClosingProducts(closingProducts.map(p => p.id === id ? { ...p, [field]: value } : p));
  const toggleClosingProductSold = (id: string) => setClosingProducts(closingProducts.map(p => p.id === id ? { ...p, isSold: !p.isSold } : p));
  const confirmClosing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingLeadId) return;
    const soldProducts = closingProducts.filter(p => p.isSold);
    if (soldProducts.length === 0) { alert("Selecione pelo menos um produto vendido."); return; }
    updateLeadStatus(closingLeadId, 'fechamento', { finalValue: calculateTotalValue(soldProducts), products: closingProducts, closedAt: new Date().toISOString() });
    setIsClosingModalOpen(false); setClosingLeadId(null); setClosingProducts([]);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600 font-bold animate-pulse">Carregando dados do Supabase...</p>
        </div>
      )}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div
                className="flex-shrink-0 flex items-center gap-2 mr-8 group relative cursor-pointer"
                onClick={() => logoInputRef.current?.click()}
                title="Clique para alterar o logo"
              >
                {brandLogo ? (
                  <img src={brandLogo} alt="Logo" className="w-8 h-8 rounded object-cover" />
                ) : (
                  <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center text-white font-bold transition-colors group-hover:bg-slate-700">P</div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit3 className="w-2 h-2 text-slate-500" />
                </div>
                <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />

                <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <span className="font-bold text-xl tracking-tight text-slate-800 hidden md:block leading-none">
                    <EditableText value={brandName} onSave={setBrandName} />
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium mt-1">
                    <button onClick={() => changeWeek(-1)} className="hover:text-blue-600 hover:bg-slate-100 rounded"><ChevronLeft className="w-3 h-3" /></button>
                    <span>{formatDateRange(getStartOfWeek(selectedWeekDate), getEndOfWeek(selectedWeekDate))}</span>
                    <button onClick={() => changeWeek(1)} className="hover:text-blue-600 hover:bg-slate-100 rounded"><ChevronRight className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex md:space-x-8">
                <button onClick={() => setActiveTab('funnel')} className={`${activeTab === 'funnel' ? 'border-blue-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-16 transition-colors`}><List className="w-4 h-4 mr-2" />Meu Pipe</button>
                <button onClick={() => setActiveTab('metrics')} className={`${activeTab === 'metrics' ? 'border-blue-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-16 transition-colors`}><Target className="w-4 h-4 mr-2" />Metas</button>
                {isManager && (<button onClick={() => setActiveTab('team')} className={`${activeTab === 'team' ? 'border-blue-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-16 transition-colors`}><Users className="w-4 h-4 mr-2" />Gestão</button>)}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center bg-slate-100 rounded-lg p-1 px-3 gap-2 border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold uppercase">Visão:</span>
                {isManager ? (
                  <select value={selectedAdvisorId} onChange={(e) => setSelectedAdvisorId(e.target.value)} className="bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer">
                    {team.map(adv => (<option key={adv.id} value={adv.id}>{adv.name}</option>))}
                  </select>
                ) : (<span className="text-sm font-bold text-slate-800 px-1 cursor-default">{currentAdvisor.name}</span>)}
              </div>
              <button onClick={openPasswordModal} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all" title="Alterar Senha"><Key className="w-5 h-5" /></button>
              <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all ml-1" title="Sair"><LogOut className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'funnel' && (
          <div className="animate-in fade-in duration-300">
            <div className="mb-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-bold text-slate-700">Filtros:</span>

                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as any)}
                  className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-slate-50 outline-none focus:border-blue-500"
                >
                  <option value="all">Todas Origens</option>
                  <option value="indicacao">Indicação</option>
                  <option value="redes_sociais">Redes Sociais</option>
                  <option value="lista_fria">Lista Fria</option>
                </select>

                <div className="relative flex items-center">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2" />
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="text-sm border border-slate-300 rounded-md pl-7 pr-2 py-1 bg-slate-50 outline-none focus:border-blue-500"
                    placeholder="Data"
                  />
                  {dateFilter && <button onClick={() => setDateFilter('')} className="ml-1 text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>}
                </div>
              </div>


            </div>

            {todaysAppointments.length > 0 && (
              <div className="mb-6 bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-4 shadow-sm animate-in slide-in-from-top-4">
                <div className="p-2 bg-orange-100 rounded-full text-orange-600 shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 mb-1">Compromissos de Hoje ({todaysAppointments.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {todaysAppointments.map(lead => (
                      <div key={lead.id} className="bg-white p-2 rounded border border-orange-100 flex items-center gap-2 cursor-pointer hover:shadow-md transition-shadow group" onClick={() => openAppointmentModal(lead)}>
                        <div className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded group-hover:bg-orange-100 transition-colors">
                          {formatScheduledDate(lead.scheduledFor)?.split(' ')[1]}
                        </div>
                        <div className="text-sm font-semibold text-slate-700 truncate">{lead.name}</div>
                        <ArrowRight className="w-3 h-3 text-slate-300 ml-auto group-hover:text-orange-500" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
              <div className="md:col-span-8 bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div
                      className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden border-2 border-slate-100 shrink-0 relative group cursor-pointer"
                      onClick={() => avatarInputRef.current?.click()}
                      title="Alterar foto"
                    >
                      {currentAdvisor.photoUrl ? (<img src={currentAdvisor.photoUrl} alt={currentAdvisor.name} className="w-full h-full object-cover" />) : (<UserCircle className="w-full h-full text-slate-300" />)}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                      <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{currentAdvisor.name}</h2>
                      <p className="text-sm text-slate-500">{currentAdvisor.role}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1"><Phone className="w-3 h-3" /> {currentStats.callsInSelectedWeek} calls/sem</span>
                        <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full flex items-center gap-1"><Calendar className="w-3 h-3" /> {currentStats.meetings1 + currentStats.meetings2} mtgs/sem</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <div className="flex-1 md:flex-none flex items-stretch h-full shadow-lg shadow-blue-500/10 rounded-lg">
                      <button onClick={() => registerActivity('call')} className="flex-grow px-2 md:px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-l-lg border-y border-l border-blue-200 transition-all active:scale-95 flex flex-col items-center justify-center min-w-[60px] md:min-w-[80px]">
                        <Phone className="w-4 h-4 md:w-5 md:h-5 mb-1" />
                        <span className="text-[10px] md:text-xs font-bold">+1 Ligação</span>
                        <span className="text-[9px] md:text-[10px] opacity-80 font-medium">Hoje: {currentStats.callsToday}</span>
                      </button>
                      <button onClick={() => removeLastActivity('call')} className="w-6 md:w-8 bg-blue-100 hover:bg-red-50 text-blue-400 hover:text-red-500 border border-blue-200 rounded-r-lg flex items-center justify-center transition-colors"><Minus className="w-3 h-3 md:w-4 md:h-4" /></button>
                    </div>
                    <div className="flex-1 md:flex-none flex items-stretch h-full shadow-lg shadow-indigo-500/10 rounded-lg">
                      <button onClick={() => registerActivity('meeting1')} className="flex-grow px-2 md:px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-l-lg border-y border-l border-indigo-200 transition-all active:scale-95 flex flex-col items-center justify-center min-w-[60px] md:min-w-[80px]">
                        <Calendar className="w-4 h-4 md:w-5 md:h-5 mb-1" />
                        <span className="text-[10px] md:text-xs font-bold">+1 Reunião</span>
                        <span className="text-[9px] md:text-[10px] opacity-80 font-medium">Hoje: {currentStats.meetings1Today}</span>
                      </button>
                      <button onClick={() => removeLastActivity('meeting1')} className="w-6 md:w-8 bg-indigo-100 hover:bg-red-50 text-indigo-400 hover:text-red-500 border border-indigo-200 rounded-r-lg flex items-center justify-center transition-colors"><Minus className="w-3 h-3 md:w-4 md:h-4" /></button>
                    </div>
                    <div className="flex-1 md:flex-none flex items-stretch h-full shadow-lg shadow-purple-500/10 rounded-lg">
                      <button onClick={() => registerActivity('meeting2')} className="flex-grow px-2 md:px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-l-lg border-y border-l border-purple-200 transition-all active:scale-95 flex flex-col items-center justify-center min-w-[60px] md:min-w-[80px]">
                        <Calendar className="w-4 h-4 md:w-5 md:h-5 mb-1" />
                        <span className="text-[10px] md:text-xs font-bold">+1 2ª Reunião</span>
                        <span className="text-[9px] md:text-[10px] opacity-80 font-medium">Hoje: {currentStats.meetings2Today}</span>
                      </button>
                      <button onClick={() => removeLastActivity('meeting2')} className="w-6 md:w-8 bg-purple-100 hover:bg-red-50 text-purple-400 hover:text-red-500 border border-purple-200 rounded-r-lg flex items-center justify-center transition-colors"><Minus className="w-3 h-3 md:w-4 md:h-4" /></button>
                    </div>
                  </div>
                </div>
                {/* Ações de Lead - Sempre visíveis */}
                <div className="flex gap-2 w-full justify-end border-t border-slate-100 pt-3">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls, .csv" />
                  <button onClick={handleImportClick} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-all active:scale-95"><Upload className="w-4 h-4" /><span className="text-xs font-bold">Importar Planilha</span></button>
                  <button onClick={openNewLeadModal} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-lg transition-all active:scale-95"><Plus className="w-4 h-4" /><span className="text-xs font-bold whitespace-nowrap">Novo Lead</span></button>
                </div>
              </div>
              <div className="md:col-span-4 bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-center">
                <div className="relative z-10 flex flex-col gap-4">
                  <div className="absolute top-0 right-0 bg-slate-800 text-xs px-2 py-0.5 rounded text-slate-400">{getMonthName(selectedMonthDate)}</div>
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1"><TrendingUp className="w-3 h-3 inline mr-1" /> Captação (Investimentos)</p>
                    <h3 className="text-3xl font-bold">{formatCurrency(monthlyProduction)}</h3>
                    {informativeProduction > 0 && (
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                        <Info className="w-3 h-3" /> + {formatCurrency(informativeProduction)} (Vol. Informativo)
                      </p>
                    )}
                  </div>
                  <div className="w-full h-px bg-slate-700/50"></div>
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1"><ShieldCheck className="w-3 h-3 inline mr-1" /> Produção (Seguros/Outros)</p>
                    <h3 className="text-xl font-bold text-slate-300">{formatCurrency(totalProducaoMonth)}</h3>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 overflow-x-auto pb-4 h-[calc(100vh-350px)]">
              {columns.map((col) => (
                <div
                  key={col.id}
                  className={`min-w-[280px] w-full lg:w-1/5 bg-slate-50 rounded-xl flex flex-col h-full border transition-all duration-200 ${draggedOverColumnId === col.id
                    ? 'border-blue-400 border-2 shadow-sm'
                    : 'border-slate-200'
                    }`}
                  onDragOver={(e) => {
                    handleDragOver(e);
                    if (draggedOverColumnId !== col.id) setDraggedOverColumnId(col.id);
                  }}
                  onDragLeave={() => setDraggedOverColumnId(null)}
                  onDrop={(e) => handleDrop(e, col.id as Lead['status'])}
                >
                  <div className={`p-3 border-t-4 ${col.color} bg-white rounded-t-xl shadow-sm flex justify-between items-center`}>
                    <h3 className="font-bold text-slate-700 text-sm flex-1"><EditableText value={col.title} onSave={(val) => handleColumnTitleChange(col.id, val)} /></h3>
                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium ml-2">{filteredLeads.filter(l => l.status === col.id).length}</span>
                  </div>
                  <div className="p-2 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                    {filteredLeads.filter(lead => lead.status === col.id).map((lead) => {
                      const sourceConfig = getSourceConfig(lead.source);
                      const SourceIcon = sourceConfig.icon;
                      const isClosed = lead.status === 'fechamento';
                      const daysInPipe = getDaysInPipe(lead.createdAt);
                      const scheduledDate = formatScheduledDateShort(lead.scheduledFor);
                      return (
                        <div
                          key={lead.id}
                          className={`bg-white p-3 rounded-lg shadow-sm border ${isClosed ? 'border-green-200 bg-green-50/30' : 'border-slate-100'} hover:shadow-md transition-all group relative cursor-move`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onDragEnd={() => {
                            setDraggedLeadId(null);
                            setDraggedOverColumnId(null);
                          }}
                          onClick={() => openEditLeadModal(lead)}
                        >
                          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 rounded-t-lg overflow-hidden"><div className={`h-full transition-all duration-500 ${isClosed ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: getProgressWidth(lead.status) }}></div></div>
                          <div className="flex justify-between items-start mb-2 mt-2">
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${sourceConfig.className}`}><SourceIcon className="w-3 h-3" />{sourceConfig.label}</div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity items-center">
                              {lead.status !== 'lead' && (<button onClick={(e) => { e.stopPropagation(); moveLead(lead.id, 'prev', lead.status); }} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><ArrowLeft className="w-3 h-3" /></button>)}
                              {lead.status !== 'fechamento' && (<button onClick={(e) => { e.stopPropagation(); moveLead(lead.id, 'next', lead.status); }} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><ArrowRight className="w-3 h-3" /></button>)}
                              <button onClick={(e) => { e.stopPropagation(); openEditLeadModal(lead); }} className="p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-500 rounded"><Pencil className="w-3 h-3" /></button>
                              <button onClick={(e) => { e.stopPropagation(); deleteLead(lead.id); }} className="p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-800 mb-0">{lead.name}</h4>
                            {scheduledDate && !isClosed && (
                              <div className="flex items-center gap-1 bg-orange-100 text-orange-700 text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse" title="Agendamento Futuro">
                                <Calendar className="w-3 h-3" /> {scheduledDate}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium mb-1 block">{daysInPipe} dias na fase</span>

                          <div className="mb-2 flex flex-wrap gap-1">
                            {(isClosed && lead.closedData ? lead.closedData.products.filter(p => p.isSold) : lead.products).map(p => (
                              <span key={p.id} className={`text-[10px] px-1.5 py-0.5 rounded border font-medium flex items-center gap-1 ${isClosed ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                {p.type === 'investimentos' ? <Wallet className="w-3 h-3 text-blue-500" /> : <Tag className="w-3 h-3 text-slate-400" />}
                                {p.type === 'outros' ? (p.customName || 'Outros') : (p.type === 'investimentos' && p.investmentType ? p.investmentType : PRODUCT_LABELS[p.type])}
                              </span>
                            ))}
                          </div>
                          <div className="flex justify-between items-center mb-3">
                            <div className={`text-sm font-bold text-white inline-block px-2.5 py-1 rounded shadow-sm ${isClosed ? 'bg-green-600' : 'bg-emerald-600'}`}>{isClosed && lead.closedData ? formatCurrency(lead.closedData.finalValue) : formatCurrency(lead.value)}</div>
                            <span className="text-[10px] text-slate-400">{new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          </div>
                          {!isClosed && (
                            <div className="pt-2 flex gap-2">
                              <button onClick={(e) => { e.stopPropagation(); openEditLeadModal(lead); }} className="flex-1 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 text-xs py-1.5 rounded flex items-center justify-center gap-1 transition-colors font-medium"><Phone className="w-3 h-3" /> Ligar</button>
                              <button onClick={(e) => { e.stopPropagation(); handleOpenCalendar(lead.name, lead.scheduledFor); }} className="flex-1 bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-orange-600 text-xs py-1.5 rounded flex items-center justify-center gap-1 transition-colors font-medium"><Calendar className="w-3 h-3" /> Agenda</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="animate-in fade-in duration-300 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Metas do Mês</h2>
                  <p className="text-slate-500 text-sm">Acompanhe sua performance mensal de captação e produção.</p>
                </div>
                <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1 text-sm bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span className="font-bold text-slate-700">{getMonthName(selectedMonthDate)}</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Meta Investimentos</span>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">R$</span>
                      <input
                        type="number"
                        disabled={!isManager}
                        value={monthlyGoal}
                        onChange={(e) => setMonthlyGoal(Number(e.target.value))}
                        className="pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold w-36 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Meta Ligações (Semanal)</span>
                    <input
                      type="number"
                      disabled={!isManager}
                      value={weeklyCallsGoal}
                      onChange={(e) => setWeeklyCallsGoal(Number(e.target.value))}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold w-24 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Meta 1ª Reunião</span>
                    <input
                      type="number"
                      disabled={!isManager}
                      value={weeklyMeeting1Goal}
                      onChange={(e) => setWeeklyMeeting1Goal(Number(e.target.value))}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold w-24 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Meta 2ª Reunião</span>
                    <input
                      type="number"
                      disabled={!isManager}
                      value={weeklyMeeting2Goal}
                      onChange={(e) => setWeeklyMeeting2Goal(Number(e.target.value))}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold w-24 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Meta Aberturas (300k+)</span>
                    <input
                      type="number"
                      disabled={!isManager}
                      value={monthlyOpeningsGoal}
                      onChange={(e) => setMonthlyOpeningsGoal(Number(e.target.value))}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-bold w-24 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card Meta Investimentos */}
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-center relative overflow-hidden">
                  <div className="w-full flex justify-between items-end mb-2 relative z-10">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Investimentos (Mês)</p>
                      <p className="text-2xl font-extrabold text-blue-600">{formatNumberCompact(monthlyProduction)}</p>
                      {informativeProduction > 0 && (
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                          + {formatNumberCompact(informativeProduction)} (Informativo)
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Meta</p>
                      <p className="text-lg font-bold text-slate-400">{formatNumberCompact(monthlyGoal)}</p>
                    </div>
                  </div>
                  <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden relative z-10">
                    <div
                      className={`h-full transition-all duration-1000 ${monthlyProduction >= monthlyGoal ? 'bg-green-500' : 'bg-blue-600'}`}
                      style={{ width: `${Math.min((monthlyProduction / (monthlyGoal || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-[10px] font-bold text-slate-400 z-10">{((monthlyProduction / (monthlyGoal || 1)) * 100).toFixed(1)}% da meta atingida</p>
                </div>

                {/* Card Meta Ligações */}
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-center relative overflow-hidden">
                  <div className="w-full flex justify-between items-end mb-2 relative z-10">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Ligações (Semana)</p>
                      <p className="text-2xl font-extrabold text-indigo-600">{currentStats.callsInSelectedWeek}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Meta</p>
                      <p className="text-lg font-bold text-slate-400">{weeklyCallsGoal}</p>
                    </div>
                  </div>
                  <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden relative z-10">
                    <div
                      className={`h-full transition-all duration-1000 ${currentStats.callsInSelectedWeek >= weeklyCallsGoal ? 'bg-green-500' : 'bg-indigo-600'}`}
                      style={{ width: `${Math.min((currentStats.callsInSelectedWeek / (weeklyCallsGoal || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-[10px] font-bold text-slate-400 z-10">{((currentStats.callsInSelectedWeek / (weeklyCallsGoal || 1)) * 100).toFixed(1)}% da meta atingida</p>
                </div>

                {/* Card Meta 1ª Reunião */}
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-center relative overflow-hidden">
                  <div className="w-full flex justify-between items-end mb-2 relative z-10">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">1ª Reunião (Semana)</p>
                      <p className="text-2xl font-extrabold text-indigo-600">{currentStats.meetings1}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Meta</p>
                      <p className="text-lg font-bold text-slate-400">{weeklyMeeting1Goal}</p>
                    </div>
                  </div>
                  <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden relative z-10">
                    <div
                      className={`h-full transition-all duration-1000 ${currentStats.meetings1 >= weeklyMeeting1Goal ? 'bg-green-500' : 'bg-indigo-600'}`}
                      style={{ width: `${Math.min((currentStats.meetings1 / (weeklyMeeting1Goal || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-[10px] font-bold text-slate-400 z-10">{((currentStats.meetings1 / (weeklyMeeting1Goal || 1)) * 100).toFixed(1)}% da meta atingida</p>
                </div>

                {/* Card Meta 2ª Reunião */}
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-center relative overflow-hidden">
                  <div className="w-full flex justify-between items-end mb-2 relative z-10">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">2ª Reunião (Semana)</p>
                      <p className="text-2xl font-extrabold text-indigo-600">{currentStats.meetings2}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Meta</p>
                      <p className="text-lg font-bold text-slate-400">{weeklyMeeting2Goal}</p>
                    </div>
                  </div>
                  <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden relative z-10">
                    <div
                      className={`h-full transition-all duration-1000 ${currentStats.meetings2 >= weeklyMeeting2Goal ? 'bg-green-500' : 'bg-indigo-600'}`}
                      style={{ width: `${Math.min((currentStats.meetings2 / (weeklyMeeting2Goal || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-[10px] font-bold text-slate-400 z-10">{((currentStats.meetings2 / (weeklyMeeting2Goal || 1)) * 100).toFixed(1)}% da meta atingida</p>
                </div>

                {/* Card Meta Aberturas */}
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-center relative overflow-hidden">
                  <div className="w-full flex justify-between items-end mb-2 relative z-10">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Aberturas 300k+ (Mês)</p>
                      <p className="text-2xl font-extrabold text-purple-600">{monthlyQualifiedOpenings}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Meta</p>
                      <p className="text-lg font-bold text-slate-400">{monthlyOpeningsGoal}</p>
                    </div>
                  </div>
                  <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden relative z-10">
                    <div
                      className={`h-full transition-all duration-1000 ${monthlyQualifiedOpenings >= monthlyOpeningsGoal ? 'bg-green-500' : 'bg-purple-600'}`}
                      style={{ width: `${Math.min((monthlyQualifiedOpenings / (monthlyOpeningsGoal || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-[10px] font-bold text-slate-400 z-10">{((monthlyQualifiedOpenings / (monthlyOpeningsGoal || 1)) * 100).toFixed(1)}% da meta atingida</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && isManager && (
          <div className="animate-in fade-in duration-300 space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Painel de Gestão - Intensidade Comercial</h2>
                <p className="text-slate-500 text-sm">Visão consolidada de produtividade e conversão do time.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-full transition-colors"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
                <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  {getMonthName(selectedMonthDate)}
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-full transition-colors"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Phone className="w-5 h-5" /></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Contatos</span>
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900">{teamManagementStats.totalCallsTeam}</h3>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Calendar className="w-5 h-5" /></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Reuniões</span>
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900">{teamManagementStats.totalMeetingsTeam}</h3>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg text-green-600"><Wallet className="w-5 h-5" /></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Captação</span>
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900">{formatNumberCompact(teamManagementStats.totalCaptacaoTeam)}</h3>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><Target className="w-5 h-5" /></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Meta Filial</span>
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900">{teamManagementStats.avgGoalAchievementTeam.toFixed(1)}%</h3>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><TrendingUp className="w-5 h-5" /></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Conv. Média</span>
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900">{teamManagementStats.avgConversionTeam.toFixed(1)}%</h3>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><DollarSign className="w-5 h-5" /></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Ticket Médio</span>
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900">{formatNumberCompact(teamManagementStats.ticketMedioTeam)}</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2"><ActivityIcon className="w-4 h-4 text-blue-500" /> Evolução de Intensidade (Dia a Dia)</h4>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={teamManagementStats.dailyEvolution}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend />
                      <Line type="monotone" dataKey="calls" name="Ligações" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="meetings" name="Reuniões" stroke="#6366f1" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-orange-500" /> Intensidade por Assessor</h4>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={teamManagementStats.ranked.slice(0, 5)} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip cursor={{ fill: '#f1f5f9' }} />
                      <Legend />
                      <Bar dataKey="calls" name="Ligações" stackId="a" fill="#93c5fd" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="meetings" name="Reuniões" stackId="a" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h4 className="text-lg font-bold text-slate-900">Ranking de Performance Comercial</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Assessor</th>
                      <th className="px-6 py-4 text-center">Ligações</th>
                      <th className="px-6 py-4 text-center">Reuniões</th>
                      <th className="px-6 py-4 text-center">Eficiência %</th>
                      <th className="px-6 py-4 text-center">Fechamentos</th>
                      <th className="px-6 py-4 text-right">Captação (R$)</th>
                      <th className="px-6 py-4 text-center">Atingimento %</th>
                      <th className="px-6 py-4 text-center">Conv. Final %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamManagementStats.ranked.map((adv, index) => {
                      return (
                        <tr key={adv.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-orange-400' : 'bg-slate-200 text-slate-500'}`}>{index + 1}</span>
                            {adv.name}
                          </td>
                          <td className="px-6 py-4 text-center text-slate-600">{adv.calls}</td>
                          <td className="px-6 py-4 text-center text-slate-600">{adv.meetings}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-xs font-bold text-slate-500">
                              {adv.efficiency.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-green-600">{adv.closedDeals}</td>
                          <td className="px-6 py-4 text-right font-bold text-slate-800">{formatNumberCompact(adv.captacao)}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${adv.goalAchievement >= 100 ? 'bg-green-100 text-green-700' : adv.goalAchievement >= 50 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                {adv.goalAchievement.toFixed(1)}%
                              </span>
                              <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${adv.goalAchievement >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(adv.goalAchievement, 100)}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${adv.conversionRate > 20 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                              {adv.conversionRate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gerenciar Equipe - Manager Only */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Users className="w-5 h-5 text-blue-500" /> Gerenciar Equipe</h4>
                <button
                  onClick={openAddAdvisorModal}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 transition-all"
                >
                  <UserPlus className="w-4 h-4" /> Novo Assessor
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {team.map((adv) => (
                  <div key={adv.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                        {adv.photoUrl ? (
                          <img src={adv.photoUrl} alt={adv.name} className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{adv.name}</p>
                        <p className="text-xs text-slate-500">{adv.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">{adv.leads.length} leads</span>
                      {adv.role !== 'Gestor' && (
                        <button
                          onClick={() => handleRemoveAdvisor(adv.id, adv.name)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                          title={`Remover ${adv.name}`}
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {isAppointmentModalOpen && selectedAppointmentLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative animate-in zoom-in-95">
            <button onClick={closeAppointmentModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3 text-orange-600">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Compromisso com {selectedAppointmentLead.name}</h3>
              <p className="text-sm text-slate-500">Agendado para hoje às {formatScheduledDate(selectedAppointmentLead.scheduledFor)?.split(' ')[1]}</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleConfirmAppointment}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <CheckCircle2 className="w-5 h-5" /> Confirmar Realização
              </button>
              <div className="relative border-t border-slate-100 pt-3 mt-3">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 text-center">Ou Reagendar</label>
                <input
                  type="datetime-local"
                  value={newAppointmentDate}
                  onChange={(e) => setNewAppointmentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-slate-800 text-sm font-semibold outline-none focus:border-blue-500 mb-2"
                />
                <button onClick={handleReschedule} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm transition-all">Salvar Nova Data</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative my-8">
            <button onClick={closeLeadModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">{editingLeadId ? 'Editar Lead' : 'Novo Lead'}</h2>
            <form onSubmit={handleSaveLead} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Cliente</label>
                  <input type="text" value={newLeadName} onChange={(e) => setNewLeadName(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 transition-all font-bold" placeholder="Ex: Roberto Almeida" required autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefone / WhatsApp</label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={newLeadPhone}
                        onChange={(e) => setNewLeadPhone(formatPhoneNumber(e.target.value))}
                        className="w-full pl-9 pr-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 text-sm font-bold"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                      <input type="email" value={newLeadEmail} onChange={(e) => setNewLeadEmail(e.target.value)} className="w-full pl-9 pr-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 text-sm font-bold" placeholder="cliente@email.com" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Origem do Lead</label>
                    <div className="relative">
                      <Share2 className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                      <select
                        value={newLeadSource}
                        onChange={(e) => setNewLeadSource(e.target.value as LeadSource)}
                        className="w-full pl-9 pr-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 outline-none focus:border-blue-500 text-sm font-bold appearance-none cursor-pointer"
                      >
                        <option value="indicacao">Indicação</option>
                        <option value="redes_sociais">Redes Sociais</option>
                        <option value="lista_fria">Lista Fria</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Etapa do Funil</label>
                    <div className="relative">
                      <Layout className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                      <select
                        value={newLeadStatus}
                        onChange={(e) => setNewLeadStatus(e.target.value as Lead['status'])}
                        className="w-full pl-9 pr-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 outline-none focus:border-blue-500 text-sm font-bold appearance-none cursor-pointer"
                      >
                        <option value="lead">Lead</option>
                        <option value="ligacao">A Ligar</option>
                        <option value="reuniao1">1ª Reunião</option>
                        <option value="reuniao2">2ª Reunião</option>
                        <option value="fechamento">Fechamento</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Produtos em Negociação</label>
                    <span className="text-sm font-bold text-blue-600">Total: {formatCurrency(calculateTotalValue(leadProducts))}</span>
                  </div>
                  <div className="space-y-3 mb-3">
                    {leadProducts.map((product) => (
                      <div key={product.id} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                        <select
                          value={product.type}
                          onChange={(e) => updateLeadProduct(product.id, 'type', e.target.value as ProductType)}
                          className="bg-slate-50 text-slate-800 text-xs font-bold border border-slate-300 rounded-md px-2 py-1.5 w-1/2 outline-none focus:border-blue-500"
                        >
                          {Object.entries(PRODUCT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </select>
                        <div className="relative w-1/2">
                          <span className="absolute left-2 top-1.5 text-[10px] text-slate-400 font-bold">R$</span>
                          <input
                            type="number"
                            value={product.value}
                            onChange={(e) => updateLeadProduct(product.id, 'value', Number(e.target.value))}
                            className="bg-slate-50 text-slate-800 text-xs font-bold border border-slate-300 rounded-md pl-7 pr-2 py-1.5 w-full outline-none focus:border-blue-500"
                            placeholder="Valor"
                          />
                        </div>
                        {leadProducts.length > 1 && (
                          <button type="button" onClick={() => removeLeadProduct(product.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addLeadProduct} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Adicionar Outro Produto</button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observações e Histórico</label>
                  <textarea
                    value={newLeadNotes}
                    onChange={(e) => setNewLeadNotes(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 transition-all text-sm mb-3"
                    rows={3}
                    placeholder="Registre o histórico de conversas ou anotações diversas..."
                  />

                  <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <label className="block text-xs font-bold text-blue-700 uppercase mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Agendamento / Próximo Passo
                    </label>
                    <input
                      type="datetime-local"
                      value={newLeadScheduledFor}
                      onChange={(e) => setNewLeadScheduledFor(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-blue-200 bg-white text-slate-800 text-sm font-semibold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="block text-xs font-bold text-slate-500 uppercase mb-2">Ações Rápidas de Interação</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleInteractionAction('no_contact')}
                        className="flex items-center justify-center gap-1.5 p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
                      >
                        <PhoneOff className="w-3.5 h-3.5" /> Não consegui
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInteractionAction('call_again')}
                        className="flex items-center justify-center gap-1.5 p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm"
                      >
                        <PhoneForwarded className="w-3.5 h-3.5" /> Ligar de novo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInteractionAction('contact_failed')}
                        className="flex items-center justify-center gap-1.5 p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-orange-600 hover:bg-orange-50 hover:border-orange-200 transition-all shadow-sm"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" /> Atendido (ruim)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInteractionAction('success')}
                        className="flex items-center justify-center gap-1.5 p-2 bg-green-500 border border-green-600 rounded-lg text-xs font-semibold text-white hover:bg-green-600 transition-all shadow-sm"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" /> Sucesso!
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button type="button" variant="outline" onClick={closeLeadModal} fullWidth>Cancelar</Button>
                  <Button type="submit" fullWidth>{editingLeadId ? 'Salvar Alterações' : 'Adicionar Lead'}</Button>
                </div>
                {editingLeadId && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleConvertToClient}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 rounded-lg shadow-sm"
                    >
                      <Target className="w-4 h-4" /> Converter
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLead(editingLeadId)}
                      className="py-2.5 text-red-500 hover:text-red-700 font-bold text-sm transition-colors flex items-center justify-center gap-2 hover:bg-red-50 rounded-lg border border-transparent"
                    >
                      <Trash2 className="w-4 h-4" /> Excluir
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Abertura Qualificada */}
      {isQualifiedModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Abertura de Conta</h3>
              <p className="text-slate-500 mb-6">
                Foi realizada abertura de conta com valor igual ou superior a <span className="font-bold text-slate-800">R$ 300.000</span>?
              </p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    if (pendingMoveLeadId && pendingMoveTargetStatus) {
                      updateLeadStatus(pendingMoveLeadId, pendingMoveTargetStatus, undefined, true);
                      setIsQualifiedModalOpen(false);
                      setPendingMoveLeadId(null);
                      setPendingMoveTargetStatus(null);
                    }
                  }}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-slate-100 hover:border-purple-500 hover:bg-purple-50 transition-all group"
                >
                  <ThumbsUp className="w-6 h-6 text-slate-400 group-hover:text-purple-600 mb-2" />
                  <span className="font-bold text-slate-700 group-hover:text-purple-700">Sim</span>
                </button>

                <button
                  onClick={() => {
                    if (pendingMoveLeadId && pendingMoveTargetStatus) {
                      updateLeadStatus(pendingMoveLeadId, pendingMoveTargetStatus, undefined, false);
                      setIsQualifiedModalOpen(false);
                      setPendingMoveLeadId(null);
                      setPendingMoveTargetStatus(null);
                    }
                  }}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all group"
                >
                  <ThumbsDown className="w-6 h-6 text-slate-400 group-hover:text-slate-600 mb-2" />
                  <span className="font-bold text-slate-700 group-hover:text-slate-700">Não</span>
                </button>
              </div>
            </div>
            <div className="bg-slate-50 p-4 flex justify-center">
              <button
                onClick={() => {
                  setIsQualifiedModalOpen(false);
                  setPendingMoveLeadId(null);
                  setPendingMoveTargetStatus(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-medium"
              >
                Cancelar movimentação
              </button>
            </div>
          </div>
        </div>
      )}

      {isClosingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 relative">
            <button onClick={() => { setIsClosingModalOpen(false); setClosingLeadId(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Trophy className="w-6 h-6 text-yellow-500" /> Registrar Fechamento</h2>
            <form onSubmit={confirmClosing}>
              <div className="space-y-3 mb-6">
                <p className="text-sm text-slate-500 mb-4 font-medium">Confirme os produtos vendidos marcando a caixa de seleção à esquerda.</p>
                {closingProducts.map((product) => (
                  <div key={product.id} className={`p-3 rounded-lg border transition-all flex items-center gap-3 ${product.isSold ? 'border-green-500 bg-green-50 shadow-sm' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                    <div onClick={() => toggleClosingProductSold(product.id)} className={`cursor-pointer w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors ${product.isSold ? 'border-green-500 bg-green-500 text-white' : 'border-slate-300 hover:border-slate-400'}`}>
                      {product.isSold && <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Produto</label>
                        <select
                          value={product.type}
                          onChange={(e) => updateClosingProduct(product.id, 'type', e.target.value as ProductType)}
                          className="w-full text-sm font-bold bg-transparent border-b border-slate-300 focus:border-green-500 outline-none pb-1"
                        >
                          {Object.entries(PRODUCT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Valor (R$)</label>
                        <input
                          type="number"
                          className="w-full text-sm font-bold bg-transparent border-b border-slate-300 focus:border-green-500 outline-none pb-1 text-slate-800"
                          value={product.value}
                          onChange={(e) => updateClosingProduct(product.id, 'value', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addClosingProduct} className="text-sm text-blue-600 font-bold hover:underline flex items-center gap-1 mt-2"><Plus className="w-4 h-4" /> Adicionar outro produto</button>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl mb-6 flex justify-between items-center text-white shadow-lg">
                <span className="font-bold text-slate-300 uppercase text-xs tracking-wider">Valor Total Confirmado</span>
                <span className="text-2xl font-bold text-green-400">{formatCurrency(calculateTotalValue(closingProducts.filter(p => p.isSold)))}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="outline" onClick={() => setIsClosingModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700 shadow-green-500/30">Confirmar Venda 🎉</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Creation / Edit Modal */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <div className="sticky top-0 bg-white z-10 p-6 pb-4 border-b border-slate-100 rounded-t-2xl">
              <button onClick={closeLeadModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                {editingLeadId ? <Pencil className="w-6 h-6 text-blue-500" /> : <Plus className="w-6 h-6 text-green-500" />}
                {editingLeadId ? 'Editar Lead' : 'Novo Lead'}
              </h2>
            </div>
            <form onSubmit={handleSaveLead} className="p-6 space-y-5">
              {/* Name, Phone, Email */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome *</label>
                  <input type="text" required value={newLeadName} onChange={(e) => setNewLeadName(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-semibold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Nome do lead" autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1"><Smartphone className="w-3 h-3 inline mr-1" />Telefone</label>
                  <input type="tel" value={newLeadPhone} onChange={(e) => setNewLeadPhone(formatPhoneNumber(e.target.value))} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-semibold outline-none focus:border-blue-500" placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1"><Mail className="w-3 h-3 inline mr-1" />Email</label>
                  <input type="email" value={newLeadEmail} onChange={(e) => setNewLeadEmail(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-semibold outline-none focus:border-blue-500" placeholder="email@exemplo.com" />
                </div>
              </div>

              {/* Source & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Origem</label>
                  <select value={newLeadSource} onChange={(e) => setNewLeadSource(e.target.value as LeadSource)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-semibold outline-none focus:border-blue-500">
                    <option value="indicacao">Indicação</option>
                    <option value="redes_sociais">Redes Sociais</option>
                    <option value="lista_fria">Lista Fria</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Etapa</label>
                  <select value={newLeadStatus} onChange={(e) => setNewLeadStatus(e.target.value as Lead['status'])} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-semibold outline-none focus:border-blue-500">
                    {columns.map(col => <option key={col.id} value={col.id}>{col.title}</option>)}
                  </select>
                </div>
              </div>

              {/* Scheduled Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1"><Calendar className="w-3 h-3 inline mr-1" />Agendamento / Próximo Passo</label>
                <input type="datetime-local" value={newLeadScheduledFor} onChange={(e) => setNewLeadScheduledFor(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-semibold outline-none focus:border-blue-500" />
              </div>

              {/* Products */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Produtos</label>
                <div className="space-y-2">
                  {leadProducts.map((product) => (
                    <div key={product.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <select value={product.type} onChange={(e) => updateLeadProduct(product.id, 'type', e.target.value as ProductType)} className="flex-1 text-sm font-semibold bg-white border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-blue-500">
                        {Object.entries(PRODUCT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                      </select>
                      {product.type === 'investimentos' && (
                        <input type="text" placeholder="Tipo (CDB, Ações...)" value={product.investmentType || ''} onChange={(e) => updateLeadProduct(product.id, 'investmentType', e.target.value)} className="w-28 text-sm bg-white border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-blue-500" />
                      )}
                      {product.type === 'outros' && (
                        <input type="text" placeholder="Descrição" value={product.customName || ''} onChange={(e) => updateLeadProduct(product.id, 'customName', e.target.value)} className="w-28 text-sm bg-white border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-blue-500" />
                      )}
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                        <input type="number" placeholder="Valor" value={product.value || ''} onChange={(e) => updateLeadProduct(product.id, 'value', Number(e.target.value))} className="w-28 text-sm font-bold bg-white border border-slate-200 rounded pl-8 pr-2 py-1.5 outline-none focus:border-blue-500" />
                      </div>
                      <input type="text" placeholder="Detalhes" value={product.details || ''} onChange={(e) => updateLeadProduct(product.id, 'details', e.target.value)} className="w-32 text-sm bg-white border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-blue-500" />
                      <button type="button" onClick={() => removeLeadProduct(product.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addLeadProduct} className="mt-2 text-sm text-blue-600 font-bold hover:underline flex items-center gap-1"><Plus className="w-4 h-4" /> Adicionar produto</button>
              </div>

              {/* Total Value */}
              <div className="bg-slate-900 p-3 rounded-xl flex justify-between items-center text-white shadow-lg">
                <span className="font-bold text-slate-300 uppercase text-xs tracking-wider">Valor Total</span>
                <span className="text-xl font-bold text-green-400">{formatCurrency(calculateTotalValue(leadProducts))}</span>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1"><FileText className="w-3 h-3 inline mr-1" />Observações / Histórico</label>
                <textarea value={newLeadNotes} onChange={(e) => setNewLeadNotes(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 text-sm outline-none focus:border-blue-500 resize-none" placeholder="Anotações sobre este lead..." />
              </div>

              {/* Interaction Actions (only when editing a lead in 'ligacao' status) */}
              {editingLeadId && newLeadStatus === 'ligacao' && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs font-bold text-blue-700 uppercase mb-3 flex items-center gap-1"><Phone className="w-3 h-3" /> Ações de Interação</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <button type="button" onClick={() => handleInteractionAction('no_contact')} className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50 transition-colors text-slate-600 hover:text-red-600">
                      <PhoneOff className="w-4 h-4" /><span className="text-[10px] font-bold">Sem Contato</span>
                    </button>
                    <button type="button" onClick={() => handleInteractionAction('call_again')} className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-slate-600 hover:text-blue-600">
                      <PhoneForwarded className="w-4 h-4" /><span className="text-[10px] font-bold">Ligar Nova/te</span>
                    </button>
                    <button type="button" onClick={() => handleInteractionAction('contact_failed')} className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-colors text-slate-600 hover:text-orange-600">
                      <ThumbsDown className="w-4 h-4" /><span className="text-[10px] font-bold">Sem Sucesso</span>
                    </button>
                    <button type="button" onClick={() => handleInteractionAction('success')} className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg border border-slate-200 hover:border-green-300 hover:bg-green-50 transition-colors text-slate-600 hover:text-green-600">
                      <ThumbsUp className="w-4 h-4" /><span className="text-[10px] font-bold">Sucesso!</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                {editingLeadId && (
                  <>
                    <button type="button" onClick={() => deleteLead(editingLeadId)} className="px-4 py-2.5 bg-red-50 text-red-600 rounded-lg font-bold text-sm hover:bg-red-100 transition-colors flex items-center gap-1"><Trash2 className="w-4 h-4" /> Excluir</button>
                    {newLeadStatus !== 'fechamento' && (
                      <button type="button" onClick={handleConvertToClient} className="px-4 py-2.5 bg-green-50 text-green-700 rounded-lg font-bold text-sm hover:bg-green-100 transition-colors flex items-center gap-1"><Trophy className="w-4 h-4" /> Fechar</button>
                    )}
                  </>
                )}
                <div className="flex-1" />
                <Button type="button" variant="outline" onClick={closeLeadModal}>Cancelar</Button>
                <Button type="submit">{editingLeadId ? 'Salvar Alterações' : 'Adicionar Lead'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Assessor Modal - Manager Only */}
      {isAddAdvisorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsAddAdvisorModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                <UserPlus className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Novo Assessor</h2>
              <p className="text-slate-500 text-sm mt-2">Cadastre um novo membro na equipe. A senha inicial será a própria matrícula.</p>
            </div>

            <form onSubmit={handleAddAdvisor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  placeholder="Ex: João Silva"
                  value={newAdvisorName}
                  onChange={(e) => { setNewAdvisorName(e.target.value); setAddAdvisorError(''); }}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Matrícula XP</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  placeholder="Ex: A12345"
                  value={newAdvisorXpId}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    if (value.startsWith('A')) {
                      const numbers = value.substring(1).replace(/\D/g, '');
                      setNewAdvisorXpId('A' + numbers);
                    } else if (value === '') {
                      setNewAdvisorXpId('A');
                    }
                    setAddAdvisorError('');
                  }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
                <select
                  value={newAdvisorRole}
                  onChange={(e) => setNewAdvisorRole(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors cursor-pointer"
                >
                  <option value="Assessor">Assessor</option>
                  <option value="Assessor Senior">Assessor Senior</option>
                  <option value="Assessor Especialista">Assessor Especialista</option>
                </select>
              </div>
              {addAdvisorError && (
                <div className="flex items-center gap-2 text-red-500 text-sm font-semibold bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                  <Info className="w-4 h-4 shrink-0" />
                  {addAdvisorError}
                </div>
              )}
              {addAdvisorSuccess && (
                <div className="flex items-center gap-2 text-green-600 text-sm font-semibold bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {addAdvisorSuccess}
                </div>
              )}
              <Button type="submit" fullWidth size="lg" className="mt-4">
                Cadastrar Assessor
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                <Key className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Alterar Senha</h2>
              <p className="text-slate-500 text-sm mt-2">Informe sua senha atual e defina uma nova senha.</p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha Atual</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  placeholder="Digite sua senha atual"
                  value={pwdCurrent}
                  onChange={(e) => { setPwdCurrent(e.target.value); setPwdError(''); }}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  placeholder="Mínimo 4 caracteres"
                  value={pwdNew}
                  onChange={(e) => { setPwdNew(e.target.value); setPwdError(''); }}
                  required
                  minLength={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nova Senha</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  placeholder="Repita a nova senha"
                  value={pwdConfirm}
                  onChange={(e) => { setPwdConfirm(e.target.value); setPwdError(''); }}
                  required
                />
              </div>
              {pwdError && (
                <div className="flex items-center gap-2 text-red-500 text-sm font-semibold bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                  <Info className="w-4 h-4 shrink-0" />
                  {pwdError}
                </div>
              )}
              {pwdSuccess && (
                <div className="flex items-center gap-2 text-green-600 text-sm font-semibold bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {pwdSuccess}
                </div>
              )}
              <Button type="submit" fullWidth size="lg" className="mt-4">
                Alterar Senha
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};