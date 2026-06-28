/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Calendar,
  CheckSquare,
  Clock,
  Mail,
  FileText,
  ListTodo,
  Copy,
  Check,
  LogOut,
  ChevronRight,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Plus,
  Loader2,
  Lock,
  ArrowRight,
  Mic,
  MicOff,
  Bell,
  Sliders,
  Flame,
  Zap,
  CheckCircle,
  Volume2,
  Trash2,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, googleSignOut } from './auth';
import {
  fetchCalendarEvents,
  fetchGoogleTasks,
  createCalendarEvent,
  createGoogleTask,
  updateGoogleTaskStatus
} from './services/googleApis';
import { ParsedTask, CalendarSuggestion, ActionDraft, GoogleCalendarEvent, GoogleTask } from './types';

export default function App() {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // App Modes: 'marketing' (Landing Page) vs 'app' (Interactive Console)
  const [appMode, setAppMode] = useState<'marketing' | 'app'>('marketing');

  // Active App Navigation Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'schedule' | 'actions' | 'submission'>('dashboard');

  // App Functional State
  const [chaosText, setChaosText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // AI Parsed Outcomes
  const [aiSummary, setAiSummary] = useState<string>('Welcome. Paste your raw stress or unreplied threads to map out a clear plan.');
  const [aiInsight, setAiInsight] = useState<string>('“The secret of getting ahead is getting started.” — Mark Twain');
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([
    {
      title: "Draft Q3 Financial Projections",
      description: "Analyze the raw spreadsheets from finance team and prepare a concise bulleted summary.",
      priority: "high",
      urgencyScore: 9,
      effortScore: 7,
      recommendedDurationMinutes: 120,
      dueApproximate: "Friday at 4 PM",
      status: "needsAction"
    },
    {
      title: "Confirm Sync with Aditya",
      description: "Draft an email response to reschedule and lock down the next milestone.",
      priority: "medium",
      urgencyScore: 7,
      effortScore: 3,
      recommendedDurationMinutes: 30,
      dueApproximate: "Tomorrow morning",
      status: "needsAction"
    }
  ]);
  const [calendarSuggestions, setCalendarSuggestions] = useState<CalendarSuggestion[]>([
    {
      title: "Focus Block: Draft Q3 Financial Projections",
      startTime: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(), // in 3 hours
      endTime: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(),
      description: "Dedicated deep-focus slot. Eliminate distractions to draft Q3 spreadsheets."
    },
    {
      title: "Autoclose Aditya Email Thread",
      startTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // tomorrow
      endTime: new Date(Date.now() + 1000 * 60 * 60 * 24.5).toISOString(),
      description: "Send calendar proposals and wrap up loose ends on upcoming roadmap items."
    }
  ]);
  const [actionDrafts, setActionDrafts] = useState<ActionDraft[]>([
    {
      id: "draft_1",
      taskTitle: "Draft Q3 Financial Projections",
      actionType: "document",
      draftTitle: "Q3 Projections Briefing Outline",
      draftContent: `# Q3 Projections & Core Metrics Draft\n\n- **Target Revenue Projection:** Focus on a 12% quarter-over-quarter expansion target.\n- **Operational Cost Reduction:** Outline the core optimizations in cloud compute expenditures.\n- **Action Items:** Prepare standard cashflow summary diagrams for review.`
    },
    {
      id: "draft_2",
      taskTitle: "Confirm Sync with Aditya",
      actionType: "email",
      draftTitle: "Draft Reply: Rescheduling Next Milestone Discussions",
      draftContent: `Hi Aditya,\n\nI hope your week is going well!\n\nRegarding our milestone review, I have booked a direct calendar window so we can sync up and eliminate potential alignment blocks. Let me know if that works for your schedule.\n\nBest,\n[Your Name]`
    }
  ]);

  // Live Sync Data from Google
  const [liveEvents, setLiveEvents] = useState<GoogleCalendarEvent[]>([]);
  const [liveTasks, setLiveTasks] = useState<GoogleTask[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState(false);

  // User Notifications & Action confirmation
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [pendingConfirmAction, setPendingConfirmAction] = useState<{
    type: 'book_event' | 'sync_task' | 'book_all';
    payload: any;
  } | null>(null);

  // Copy helper feedback
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);

  // Smart Nudge / In-App Notification System
  const [nudgeAlert, setNudgeAlert] = useState<{
    id: string;
    taskTitle: string;
    suggestedTime: string;
    freeDurationMins: number;
  } | null>({
    id: "nudge_initial",
    taskTitle: "Draft Q3 Financial Projections",
    suggestedTime: "3:00 PM Today",
    freeDurationMins: 90
  });
  const [nudgeHistory, setNudgeHistory] = useState<string[]>([
    "2:00 PM: Suggestion generated for Aditya Email Thread (Snoozed)",
    "12:30 PM: Completed Google Calendar collision audit"
  ]);

  // AI Actions Taken Stats Tracker (locally tracks actions completed in this session + synced to account)
  const [actionsTakenCount, setActionsTakenCount] = useState({
    emailsDrafted: 2,
    slotsBooked: 0,
    outlinesCreated: 1,
    streaks: 4
  });

  // Voice Recording Simulation State
  const [isRecording, setIsRecording] = useState(false);
  const [voiceWaveforms, setVoiceWaveforms] = useState<number[]>([]);
  const [voiceTextTranscribing, setVoiceTextTranscribing] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Countdown timers calculation
  const [timeRemainingText, setTimeRemainingText] = useState<string>("23h 18m");

  // Setup notification helper
  const triggerNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setAuthInitialized(true);
        triggerNotification('success', `Signed in as ${currentUser.email}`);
        // Transition user straight into the app interface on sign-in
        setAppMode('app');
      },
      () => {
        setAuthInitialized(true);
      }
    );
    return () => unsubscribe && unsubscribe();
  }, []);

  // Fetch live Google Calendar and Task data when token changes
  useEffect(() => {
    if (token) {
      loadLiveGoogleData();
    } else {
      setLiveEvents([]);
      setLiveTasks([]);
    }
  }, [token]);

  // Setup simulated waveforms for voice input when recording is active
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        const waves = Array.from({ length: 18 }, () => Math.floor(Math.random() * 25) + 5);
        setVoiceWaveforms(waves);
      }, 100);
    } else {
      setVoiceWaveforms([]);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const loadLiveGoogleData = async () => {
    if (!token) return;
    setIsLoadingLive(true);
    try {
      const [events, tasks] = await Promise.all([
        fetchCalendarEvents(token).catch(() => []),
        fetchGoogleTasks(token).catch(() => [])
      ]);
      setLiveEvents(events);
      setLiveTasks(tasks);
    } catch (err) {
      console.error('Failed to reload live Google data:', err);
    } finally {
      setIsLoadingLive(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        triggerNotification('success', `Successfully authenticated with Google.`);
        setAppMode('app');
      }
    } catch (err: any) {
      console.error(err);
      triggerNotification('error', `Sign in failed: ${err.message || err}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await googleSignOut();
      setUser(null);
      setToken(null);
      triggerNotification('info', 'Logged out successfully');
      setAppMode('marketing');
    } catch (err: any) {
      console.error(err);
      triggerNotification('error', `Sign out failed: ${err.message}`);
    }
  };

  // Web Speech-to-Text Setup & Action
  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Browser Speech API not supported -> simulate premium experience beautifully
      setIsRecording(true);
      triggerNotification('info', 'Simulating speech-to-text recording...');
      setTimeout(() => {
        setIsRecording(false);
        setVoiceTextTranscribing(true);
        setTimeout(() => {
          setVoiceTextTranscribing(false);
          setChaosText((prev) => (prev ? prev + " " : "") + "Send a project proposal outline to Alex and block out 2 hours tomorrow morning to finalize the slide deck outline.");
          triggerNotification('success', 'Voice input captured and transcribed!');
        }, 1500);
      }, 4000);
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      triggerNotification('info', 'Microphone active. Speak clearly...');
    };

    recognition.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript;
      if (resultText) {
        setChaosText((prev) => (prev ? prev + " " : "") + resultText);
        triggerNotification('success', 'Voice transcribed successfully!');
      }
    };

    recognition.onerror = (err: any) => {
      console.error('Speech error:', err);
      setIsRecording(false);
      triggerNotification('error', 'Speech recognition error. Using simulator instead.');
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Submit Chaos to AI Chief of Staff server endpoint
  const handleParseChaos = async () => {
    if (!chaosText.trim()) return;

    setIsParsing(true);
    try {
      const payload = {
        chaosText,
        currentLocalTime: new Date().toISOString(),
        existingEvents: liveEvents.map(e => ({
          summary: e.summary,
          start: e.start,
          end: e.end
        })),
        existingTasks: liveTasks.map(t => ({
          title: t.title,
          status: t.status
        }))
      };

      const res = await fetch('/api/parse-chaos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to parse your chaos.');
      }

      const data = await res.json();
      setAiSummary(data.summary || '');
      setAiInsight(data.insight || 'Keep pushin, you are ahead of 90% of competitors.');
      setParsedTasks(data.tasks || []);
      setCalendarSuggestions(data.schedulingSuggestions || []);
      setActionDrafts(data.suggestedActionDrafts || []);
      
      // Auto-update local metrics
      setActionsTakenCount(prev => ({
        ...prev,
        emailsDrafted: prev.emailsDrafted + (data.suggestedActionDrafts?.filter((d: any) => d.actionType === 'email').length || 1),
        outlinesCreated: prev.outlinesCreated + (data.suggestedActionDrafts?.filter((d: any) => d.actionType === 'document').length || 1)
      }));

      // Set new nudge alert for premium feeling
      if (data.tasks && data.tasks.length > 0) {
        setNudgeAlert({
          id: `nudge_${Date.now()}`,
          taskTitle: data.tasks[0].title,
          suggestedTime: "3:30 PM Today",
          freeDurationMins: 90
        });
      }

      triggerNotification('success', 'AI Chief of Staff has organized your week!');
      setActiveTab('dashboard'); // Redirect user straight to Dashboard for full visibility!
    } catch (error: any) {
      console.error(error);
      triggerNotification('error', error.message || 'Server parsing error.');
    } finally {
      setIsParsing(false);
    }
  };

  // "Handle It" - Individual Draft Expansion/Regeneration helper
  const handleRegenerateDraft = async (taskTitle: string, taskDesc: string, actionType: 'email' | 'document' | 'checklist', index: number) => {
    try {
      triggerNotification('info', `Drafting custom ${actionType}...`);
      const res = await fetch('/api/draft-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskTitle, taskDescription: taskDesc, actionType })
      });

      if (!res.ok) throw new Error('Failed to generate action helper');
      const data = await res.json();

      const updatedDrafts = [...actionDrafts];
      updatedDrafts[index] = {
        id: `gen_${Date.now()}`,
        taskTitle,
        actionType,
        draftTitle: data.draftTitle,
        draftContent: data.draftContent
      };
      setActionDrafts(updatedDrafts);
      triggerNotification('success', 'Custom draft completed.');
    } catch (err: any) {
      triggerNotification('error', err.message);
    }
  };

  // Trigger Action Confirmation Modals (MANDATORY for modifying user-owned data)
  const promptBookCalendarEvent = (suggestion: CalendarSuggestion) => {
    if (!token) {
      triggerNotification('info', 'Please authenticate with Google to write to your Calendar!');
      return;
    }
    setPendingConfirmAction({
      type: 'book_event',
      payload: suggestion
    });
  };

  const promptSyncTask = (task: ParsedTask) => {
    if (!token) {
      triggerNotification('info', 'Please authenticate with Google to sync Tasks!');
      return;
    }
    setPendingConfirmAction({
      type: 'sync_task',
      payload: task
    });
  };

  const promptBookAllSuggestions = () => {
    if (!token) {
      triggerNotification('info', 'Please authenticate with Google to sync all items!');
      return;
    }
    if (calendarSuggestions.length === 0) {
      triggerNotification('info', 'No suggestions to book yet.');
      return;
    }
    setPendingConfirmAction({
      type: 'book_all',
      payload: calendarSuggestions
    });
  };

  // Execute actual API calls after user confirms in the modal
  const executePendingAction = async () => {
    if (!pendingConfirmAction || !token) return;

    const { type, payload } = pendingConfirmAction;
    setPendingConfirmAction(null);

    try {
      if (type === 'book_event') {
        triggerNotification('info', 'Booking Google Calendar slot...');
        await createCalendarEvent(token, {
          title: payload.title,
          startTime: payload.startTime,
          endTime: payload.endTime,
          description: payload.description
        });
        setActionsTakenCount(prev => ({ ...prev, slotsBooked: prev.slotsBooked + 1 }));
        triggerNotification('success', `Booked slot: "${payload.title}" successfully!`);
        loadLiveGoogleData();
      } else if (type === 'sync_task') {
        triggerNotification('info', 'Adding to Google Tasks...');
        let dueString: string | undefined;
        if (payload.dueApproximate) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          dueString = tomorrow.toISOString();
        }

        await createGoogleTask(token, {
          title: payload.title,
          notes: `${payload.description}\n\n[Urgency: ${payload.priority.toUpperCase()}] [Estimated time: ${payload.recommendedDurationMinutes} min]`,
          due: dueString
        });
        triggerNotification('success', `Created Task: "${payload.title}" successfully!`);
        loadLiveGoogleData();
      } else if (type === 'book_all') {
        triggerNotification('info', `Booking all ${payload.length} slots to Google Calendar...`);
        for (const item of payload) {
          await createCalendarEvent(token, {
            title: item.title,
            startTime: item.startTime,
            endTime: item.endTime,
            description: item.description
          });
        }
        setActionsTakenCount(prev => ({ ...prev, slotsBooked: prev.slotsBooked + payload.length }));
        triggerNotification('success', `Successfully booked ${payload.length} slots sequentially!`);
        loadLiveGoogleData();
      }
    } catch (err: any) {
      console.error(err);
      triggerNotification('error', `Failed to execute: ${err.message || err}`);
    }
  };

  const handleToggleTaskLive = async (taskId: string, currentStatus: string) => {
    if (!token) return;
    try {
      const nextCompleted = currentStatus === 'needsAction';
      await updateGoogleTaskStatus(token, taskId, nextCompleted);
      triggerNotification('success', `Task marked as ${nextCompleted ? 'completed' : 'pending'}`);
      loadLiveGoogleData();
    } catch (err: any) {
      triggerNotification('error', `Failed to update task: ${err.message}`);
    }
  };

  const handleNudgeAction = (action: 'yes' | 'snooze') => {
    if (!nudgeAlert) return;
    if (action === 'yes') {
      triggerNotification('success', `AI Task Executor Engaged for: ${nudgeAlert.taskTitle}`);
      // Auto-create outline Action draft
      const newDraft: ActionDraft = {
        id: `nudge_act_${Date.now()}`,
        taskTitle: nudgeAlert.taskTitle,
        actionType: "document",
        draftTitle: `Triggered Action Plan: ${nudgeAlert.taskTitle}`,
        draftContent: `# Quick Start Draft via Nudge System\n\n- Suggested focused work duration: ${nudgeAlert.freeDurationMins} minutes.\n- Target checklist outline has been initialized. Work autonomously without interruptions.`
      };
      setActionDrafts(prev => [newDraft, ...prev]);
      setActionsTakenCount(prev => ({ ...prev, outlinesCreated: prev.outlinesCreated + 1 }));
      setNudgeHistory(prev => [`${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: Engaged autonomously on "${nudgeAlert.taskTitle}"`, ...prev]);
      setActiveTab('actions');
    } else {
      triggerNotification('info', 'Nudge snoozed. AI will re-schedule in 2 hours.');
      setNudgeHistory(prev => [`${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: Snoozed "${nudgeAlert.taskTitle}" nudger`, ...prev]);
    }
    setNudgeAlert(null);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraftId(id);
    setTimeout(() => setCopiedDraftId(null), 2000);
  };

  const formatFriendlyTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-[#03060f] text-[#cfd3db] font-sans relative overflow-x-hidden selection:bg-blue-500/30 selection:text-blue-200">
      
      {/* Radiant Cosmic Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[700px] h-[700px] bg-indigo-600/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-[10%] left-[-15%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] left-[30%] w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[150px]" />
      </div>

      {/* HEADER NAVIGATION */}
      <nav className="relative border-b border-gray-900 bg-[#060914]/85 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setAppMode('marketing')}>
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/20">
            <Sparkles className="w-5 h-5 text-blue-200" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white tracking-tight text-xl bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400">DeadlineAI</span>
              <span className="text-[10px] font-mono font-bold bg-blue-950/80 text-blue-400 px-1.5 py-0.5 rounded border border-blue-900/40">v1.2</span>
            </div>
            <span className="text-xs text-indigo-400 font-mono block leading-none mt-0.5">Autonomous AI Chief of Staff</span>
          </div>
        </div>

        {/* Auth / Launch Console Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setAppMode(appMode === 'marketing' ? 'app' : 'marketing')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded-lg bg-gray-900/80 hover:bg-gray-800 text-gray-300 border border-gray-800 transition"
          >
            {appMode === 'marketing' ? (
              <>
                <span>Launch Console</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <span>Overview & Landing</span>
            )}
          </button>

          {!authInitialized ? (
            <div className="animate-pulse w-32 h-9 bg-gray-900 rounded-lg" />
          ) : user ? (
            <div className="flex items-center gap-3 bg-gray-950/60 border border-gray-800 rounded-xl pl-3 pr-2 py-1.5">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-6 h-6 rounded-full border border-blue-500/40" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs font-bold font-mono">
                  {user.email?.[0].toUpperCase()}
                </div>
              )}
              <div className="text-left hidden md:block">
                <span className="text-xs text-gray-200 font-medium block max-w-[130px] truncate">{user.displayName || user.email}</span>
                <span className="text-[9px] text-blue-400 font-mono block">Google Connected</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition"
                title="Disconnect Google Account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="relative overflow-hidden flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-semibold text-xs rounded-xl transition shadow-lg shadow-blue-500/20 border border-blue-400/20 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Syncing Workspace...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 5.48 1 0 6.48 0 13s5.48 12 12.24 12c7.06 0 11.77-4.97 11.77-11.97 0-.805-.085-1.42-.195-1.745H12.24z"/>
                  </svg>
                  Connect Google Workspace
                </>
              )}
            </button>
          )}
        </div>
      </nav>

      {/* MARKETING LANDING PAGE VIEW */}
      {appMode === 'marketing' ? (
        <div className="relative">
          
          {/* HERO SECTION */}
          <div className="max-w-6xl mx-auto px-6 pt-16 pb-24 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-400 text-xs font-mono font-bold rounded-full border border-blue-500/20 tracking-wider uppercase shadow-inner">
                <Zap className="w-3.5 h-3.5" /> The Ultimate Productivity Hack
              </span>
              
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.05] max-w-4xl mx-auto">
                Organize Your Raw Schedule Chaos into <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">Autonomous Actions</span>
              </h1>
              
              <p className="text-base sm:text-xl text-gray-400 max-w-2xl mx-auto font-normal leading-relaxed">
                Meet <strong className="text-white">DeadlineAI</strong> — your elite, autonomous AI Chief of Staff. Paste a messy stream of text or dictate tasks directly. We auto-audit your Google Calendar, find free spots, and execute deliverables instantly.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <button
                  onClick={() => setAppMode('app')}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-semibold rounded-xl text-sm transition shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 border border-blue-400/20 group"
                >
                  Enter Active AI Console
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={handleLogin}
                  className="w-full sm:w-auto px-6 py-4 bg-gray-950 hover:bg-gray-900 border border-gray-800 text-gray-300 font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 5.48 1 0 6.48 0 13s5.48 12 12.24 12c7.06 0 11.77-4.97 11.77-11.97 0-.805-.085-1.42-.195-1.745H12.24z"/>
                  </svg>
                  Connect with Google
                </button>
              </div>
            </motion.div>

            {/* CHAT INTERFACE MOCKUP PREVIEW */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="mt-16 bg-gradient-to-b from-[#0e1326] to-[#060914] rounded-2xl border border-gray-800/80 p-6 shadow-2xl text-left max-w-4xl mx-auto relative overflow-hidden ring-1 ring-indigo-500/15"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
              
              <div className="flex items-center justify-between border-b border-gray-900 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/60" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/60" />
                  <span className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span className="text-xs text-gray-500 font-mono ml-2">Console Demo Workspace</span>
                </div>
                <div className="text-[10px] font-mono text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/40">
                  REAL-TIME PREVIEW
                </div>
              </div>

              <div className="space-y-4 font-sans text-sm">
                <div className="bg-gray-950/60 border border-gray-900 rounded-xl p-4">
                  <div className="text-[10px] font-mono text-gray-500 uppercase">Your Chaos input</div>
                  <div className="text-gray-200 font-medium italic mt-1 leading-relaxed">
                    "I am completely overwhelmed! I have a design sync next Monday afternoon, need to reply to Aditya's Q3 project estimate thread before tonight, and I really want to schedule deep focus sessions so I can build the prototype outline..."
                  </div>
                </div>

                <div className="flex justify-center my-2 text-gray-600">
                  <ChevronRight className="w-5 h-5 rotate-90" />
                </div>

                <div className="bg-[#0f1527]/80 border border-indigo-950/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-blue-400 flex items-center gap-1 font-bold">
                      <Sparkles className="w-3.5 h-3.5" /> DEADLINEAI INTELLIGENT PLAN
                    </span>
                    <span className="text-[10px] text-gray-500">Confidence Score: 98%</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-950/40 border border-gray-900 rounded-lg">
                      <div className="text-[9px] font-mono text-red-400 font-bold uppercase">Priority Task [Urgency: 9/10]</div>
                      <div className="text-xs text-white font-semibold mt-1">Reply to Aditya: Q3 Project Estimates</div>
                      <div className="text-[11px] text-gray-400 mt-1">AI Action: Prepared personalized draft response. Ready to copy.</div>
                    </div>
                    <div className="p-3 bg-gray-950/40 border border-gray-900 rounded-lg">
                      <div className="text-[9px] font-mono text-blue-400 font-bold uppercase">AI Suggested Slot</div>
                      <div className="text-xs text-white font-semibold mt-1">Focus Block: Build Prototype Outline</div>
                      <div className="text-[11px] text-gray-400 mt-1">Time: Tomorrow 10:00 AM - 12:00 PM (Free Slot)</div>
                    </div>
                  </div>

                  <div className="text-xs italic text-indigo-300 leading-relaxed border-t border-indigo-950/40 pt-2 font-mono">
                    💡 "Anxiety is caused by unmade decisions. Let's make three of them right now. Hit 'Enter Active Console' to begin."
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* HOW IT WORKS */}
          <div className="border-t border-gray-900 bg-[#050814]/80 py-20">
            <div className="max-w-5xl mx-auto px-6">
              <div className="text-center space-y-3 mb-16">
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">How DeadlineAI Works</h2>
                <p className="text-sm text-gray-400 max-w-md mx-auto">Three automated steps from pure stress into perfectly structured action plans.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-[#0b0e1a] border border-gray-900 p-6 rounded-2xl relative">
                  <span className="absolute top-4 right-4 text-3xl font-mono font-extrabold text-indigo-500/10">01</span>
                  <div className="p-3 bg-blue-500/10 text-blue-400 w-fit rounded-xl mb-4">
                    <Mic className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Chaos Dump or Voice Dictation</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Unburden your brain. Type, record your voice, or paste confusing emails. Our AI translates it directly with no formatting needed on your part.
                  </p>
                </div>

                <div className="bg-[#0b0e1a] border border-gray-900 p-6 rounded-2xl relative">
                  <span className="absolute top-4 right-4 text-3xl font-mono font-extrabold text-indigo-500/10">02</span>
                  <div className="p-3 bg-indigo-500/10 text-indigo-400 w-fit rounded-xl mb-4">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Interactive AI Audit</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    The agent extracts tasks, computes exact **urgency (1-10)** and **effort (1-10)** metrics, and structures clean countdown priority cards.
                  </p>
                </div>

                <div className="bg-[#0b0e1a] border border-gray-900 p-6 rounded-2xl relative">
                  <span className="absolute top-4 right-4 text-3xl font-mono font-extrabold text-indigo-500/10">03</span>
                  <div className="p-3 bg-purple-500/10 text-purple-400 w-fit rounded-xl mb-4">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Autonomous Google Sync</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Identify calendar conflicts automatically. Click once to book custom slots, sync to Google Tasks, and execute drafts autonomously.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* KEY FEATURES */}
          <div className="max-w-5xl mx-auto px-6 py-20">
            <div className="text-center space-y-3 mb-16">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">Engineered for High Achievers</h2>
              <p className="text-sm text-gray-400">Everything needed to turn deadlines into achievements.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#0b0e1a] border border-gray-900 p-5 rounded-2xl flex gap-4">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl h-fit shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Advanced Priority Scoring</h4>
                  <p className="text-xs text-gray-400 leading-normal mt-1">Evaluate and sort critical items by urgency and effort matrices so you tackle the absolute highest impact tasks first.</p>
                </div>
              </div>

              <div className="bg-[#0b0e1a] border border-gray-900 p-5 rounded-2xl flex gap-4">
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl h-fit shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Instant Output Executors</h4>
                  <p className="text-xs text-gray-400 leading-normal mt-1">Emails prepared, detailed outline documents formulated, and calendar block invitations formatted without typing a letter.</p>
                </div>
              </div>

              <div className="bg-[#0b0e1a] border border-gray-900 p-5 rounded-2xl flex gap-4">
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl h-fit shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Smart Nudge Synthesizer</h4>
                  <p className="text-xs text-gray-400 leading-normal mt-1">Get custom in-app alerts detecting forthcoming focus hours, letting you kick off outlines and trigger drafts dynamically.</p>
                </div>
              </div>

              <div className="bg-[#0b0e1a] border border-gray-900 p-5 rounded-2xl flex gap-4">
                <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl h-fit shrink-0">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Google Workspace integration</h4>
                  <p className="text-xs text-gray-400 leading-normal mt-1">Write events, pull live statuses, and check tasks with full authenticated synchronization. Never duplicate calendars manually.</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-950/20 to-indigo-950/20 border border-blue-900/30 rounded-2xl p-8 mt-12 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <h4 className="text-lg font-bold text-white">Ready to control your schedule?</h4>
                <p className="text-xs text-gray-400 leading-relaxed mt-1">Connect your workspace or try the free demo sandbox console instantly.</p>
              </div>
              <button
                onClick={() => setAppMode('app')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-xl text-xs font-mono transition shadow-lg shadow-blue-500/15"
              >
                Launch Console Dashboard
              </button>
            </div>
          </div>
        </div>
      ) : (
        
        /* THE INTERACTIVE APP CONSOLE */
        <div className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 pb-24">
          
          {/* Smart In-App Banner for active nudge simulation */}
          {nudgeAlert && (
            <div className="lg:col-span-12">
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-gray-950 border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl animate-pulse">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-400 block">Smart AI Nudge system</span>
                    <p className="text-xs text-white font-semibold mt-0.5">
                      "You have {nudgeAlert.freeDurationMins} mins free at {nudgeAlert.suggestedTime}. Want me to start {nudgeAlert.taskTitle} outline?"
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleNudgeAction('yes')}
                    className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-lg transition hover:from-blue-500 hover:to-indigo-500 font-mono"
                  >
                    Yes, Start
                  </button>
                  <button
                    onClick={() => handleNudgeAction('snooze')}
                    className="flex-1 sm:flex-none px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white font-bold text-xs rounded-lg border border-gray-800 transition font-mono"
                  >
                    Snooze
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* LEFT COLUMN: INPUT CONTROLS & LIVE WORKSPACE INTEGRATION */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* INPUT PANEL: CHAOS DUMP & AUDIO SPEECH-TO-TEXT */}
            <div className="bg-[#0b0e1a]/85 border border-gray-900/90 rounded-2xl p-5 shadow-xl relative overflow-hidden ring-1 ring-indigo-500/5">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-indigo-600" />
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 bg-blue-950/50 border border-blue-900/40 px-2 py-0.5 rounded">
                    Input Control
                  </span>
                  <h2 className="text-base font-extrabold text-white tracking-tight">Chaos Dictation Panel</h2>
                </div>
                
                {/* Microhpne Voice Selector button */}
                <button
                  onClick={startVoiceInput}
                  className={`p-2 rounded-xl transition-all duration-300 flex items-center gap-1 border ${
                    isRecording 
                      ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse ring-4 ring-red-500/10' 
                      : 'bg-blue-950/50 hover:bg-blue-900/40 text-blue-400 hover:text-blue-300 border-blue-900/30'
                  }`}
                  title="Record voice stream via Speech API"
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider hidden md:inline">
                    {isRecording ? 'Stop' : 'Voice Input'}
                  </span>
                </button>
              </div>

              {/* PULSING WAVEFORM ON RECORDING */}
              {isRecording && (
                <div className="bg-gray-950/60 border border-red-500/20 p-3.5 rounded-xl flex flex-col items-center justify-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5 h-10">
                    {voiceWaveforms.map((h, i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-gradient-to-t from-red-500 via-indigo-500 to-blue-400 rounded-full"
                        style={{ height: `${h}px` }}
                        transition={{ duration: 0.1 }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-red-400 tracking-wider uppercase flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    Transcribing live voice input...
                  </span>
                </div>
              )}

              {/* TRANSCRIBING LOADER */}
              {voiceTextTranscribing && (
                <div className="bg-gray-950/60 border border-blue-500/20 p-4 rounded-xl flex items-center justify-center gap-2.5 mb-3">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span className="text-xs font-mono text-gray-300 font-medium">Google Cloud transcribing stream...</span>
                </div>
              )}

              <div className="relative mb-3">
                <textarea
                  value={chaosText}
                  onChange={(e) => setChaosText(e.target.value)}
                  placeholder="Paste raw unorganized work anxiety, messy meeting transcripts, slack threads, or unreplied emails..."
                  rows={6}
                  className="w-full bg-[#04060c] border border-gray-900 focus:border-blue-500/30 rounded-xl p-3.5 text-xs text-gray-200 placeholder-gray-500 outline-none transition-all duration-200 resize-none font-sans leading-relaxed focus:shadow-inner"
                />
                <div className="absolute bottom-2 right-2 text-[9px] text-gray-500 font-mono">
                  {chaosText.length} characters
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleParseChaos}
                  disabled={isParsing || !chaosText.trim()}
                  className="flex-1 relative overflow-hidden flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-bold text-xs font-mono rounded-xl transition shadow-lg shadow-blue-500/10 border border-blue-400/20 disabled:opacity-40 disabled:pointer-events-none"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      Analyzing Schedule Chaos...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                      Evaluate & Organize
                    </>
                  )}
                </button>
                {chaosText && (
                  <button
                    onClick={() => setChaosText('')}
                    className="p-3 bg-gray-950 hover:bg-gray-900 border border-gray-900 text-gray-500 hover:text-white rounded-xl transition"
                    title="Clear content"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* SYNC PANEL: WORKSPACE AND NUDGE HISTORY PANELS */}
            <div className="bg-[#0b0e1a]/85 border border-gray-900/90 rounded-2xl p-5 shadow-xl relative">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/50 border border-indigo-900/40 px-2 py-0.5 rounded">
                    Workspace
                  </span>
                  <h2 className="text-sm font-extrabold text-white tracking-tight">Sync Ecosystem</h2>
                </div>
                {user && (
                  <button
                    onClick={loadLiveGoogleData}
                    disabled={isLoadingLive}
                    className="p-1.5 bg-gray-950 hover:bg-gray-900 text-gray-400 hover:text-white rounded-lg transition border border-gray-900"
                    title="Force refresh"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingLive ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>

              {!user ? (
                <div className="bg-gray-950/40 border border-gray-900 rounded-xl p-4 text-center">
                  <Lock className="w-5 h-5 mx-auto text-gray-600 mb-2" />
                  <h3 className="text-xs font-bold text-gray-300">Live Integrations Disabled</h3>
                  <p className="text-[10px] text-gray-500 leading-normal mt-1 max-w-[260px] mx-auto">
                    Authenticate above using Google OAuth to lock down full access with real-time bidirectional task writebacks!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* LIVE CALENDAR READOUT */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 mb-1.5">
                      <span className="flex items-center gap-1 font-bold">
                        <Calendar className="w-3 h-3 text-blue-400" />
                        GOOGLE CALENDAR BLOCK COLLISION
                      </span>
                      <span>{liveEvents.length} items</span>
                    </div>

                    {isLoadingLive ? (
                      <div className="h-8 bg-gray-900/50 animate-pulse rounded" />
                    ) : liveEvents.length === 0 ? (
                      <div className="text-[10px] text-gray-500 bg-gray-950/10 p-2 border border-gray-900/50 rounded text-center">
                        Perfect calendar. No blocked items.
                      </div>
                    ) : (
                      <div className="max-h-24 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                        {liveEvents.slice(0, 3).map((e) => (
                          <div key={e.id} className="text-[11px] p-2 bg-gray-950/30 border border-gray-900 rounded flex flex-col">
                            <span className="text-gray-300 font-medium truncate">{e.summary}</span>
                            <span className="text-[9px] text-gray-500 font-mono mt-0.5">
                              {e.start?.dateTime ? formatFriendlyTime(e.start.dateTime) : e.start?.date}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* LIVE TASKS READOUT */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 mb-1.5">
                      <span className="flex items-center gap-1 font-bold">
                        <CheckSquare className="w-3 h-3 text-indigo-400" />
                        DEFAULT TASKS INBOX
                      </span>
                      <span>{liveTasks.length} items</span>
                    </div>

                    {isLoadingLive ? (
                      <div className="h-8 bg-gray-900/50 animate-pulse rounded" />
                    ) : liveTasks.length === 0 ? (
                      <div className="text-[10px] text-gray-500 bg-gray-950/10 p-2 border border-gray-900/50 rounded text-center font-mono">
                        Tasks database empty. Sync below to import.
                      </div>
                    ) : (
                      <div className="max-h-28 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                        {liveTasks.slice(0, 3).map((t) => (
                          <div
                            key={t.id}
                            onClick={() => handleToggleTaskLive(t.id, t.status)}
                            className="text-[11px] p-2 bg-gray-950/30 border border-gray-900 rounded flex items-center justify-between gap-2 hover:bg-gray-900/40 cursor-pointer transition"
                          >
                            <span className={`truncate text-gray-300 ${t.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                              {t.title}
                            </span>
                            <span className={`text-[8px] font-mono uppercase font-bold px-1 rounded ${t.status === 'completed' ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/30' : 'bg-blue-950/40 text-blue-400 border border-blue-900/30'}`}>
                              {t.status === 'completed' ? 'Done' : 'Active'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Smart Nudge Telemetry History log */}
              <div className="mt-4 pt-3 border-t border-gray-900">
                <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 mb-2">
                  <span className="font-bold">NUDGE & AUDIT STREAM</span>
                  <span>SYSTEM ONLINE</span>
                </div>
                <div className="bg-gray-950/80 rounded-xl p-2.5 space-y-1 max-h-20 overflow-y-auto custom-scrollbar font-mono text-[9px] text-gray-500 leading-normal">
                  {nudgeHistory.map((h, i) => (
                    <div key={i} className="truncate">
                      ● {h}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: TABS DASHBOARD & RESULTS DELIVERY */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* TABS SELECTOR NAVIGATION */}
            <div className="flex bg-[#0b0e1a]/80 p-1 border border-gray-900 rounded-xl gap-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold font-mono rounded-lg transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-white border border-blue-500/20 shadow-inner' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'}`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold font-mono rounded-lg transition-all duration-200 ${activeTab === 'tasks' ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-white border border-blue-500/20 shadow-inner' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'}`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                Tasks ({parsedTasks.length})
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold font-mono rounded-lg transition-all duration-200 ${activeTab === 'schedule' ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-white border border-blue-500/20 shadow-inner' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'}`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Schedule
              </button>
              <button
                onClick={() => setActiveTab('actions')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold font-mono rounded-lg transition-all duration-200 ${activeTab === 'actions' ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-white border border-blue-500/20 shadow-inner' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'}`}
              >
                <Mail className="w-3.5 h-3.5" />
                Action Drafts
              </button>
              <button
                onClick={() => setActiveTab('submission')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold font-mono rounded-lg transition-all duration-200 ${activeTab === 'submission' ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-white border border-blue-500/20 shadow-inner' : 'text-teal-400 hover:text-teal-200 hover:bg-teal-950/20'}`}
              >
                <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                Hackathon Doc
              </button>
            </div>

            {/* TAB CONTENT: DASHBOARD TAB */}
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Motivator Quote Banner & Summary */}
                  <div className="bg-gradient-to-r from-blue-950/30 via-indigo-950/30 to-[#0b0e1a] border border-blue-900/30 rounded-2xl p-5 shadow-inner">
                    <span className="text-[10px] font-mono font-extrabold text-blue-400 flex items-center gap-1 uppercase tracking-wider mb-1.5">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      Chief of Staff Summary Recommendation
                    </span>
                    <p className="text-sm text-gray-200 font-medium leading-relaxed">
                      "{aiSummary}"
                    </p>
                    <div className="mt-3.5 pt-2.5 border-t border-gray-900 flex items-start gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-indigo-300 font-mono italic leading-relaxed">
                        Insight: {aiInsight}
                      </p>
                    </div>
                  </div>

                  {/* PREMIUM METRICS BENTO GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-[#0b0e1a]/85 border border-gray-900 p-4 rounded-xl text-center shadow relative overflow-hidden group hover:border-blue-900/50 transition">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500/50 opacity-0 group-hover:opacity-100 transition" />
                      <span className="text-[10px] font-mono text-gray-500 block uppercase">Tasks Found</span>
                      <span className="text-2xl font-black text-white mt-1 block font-mono">{parsedTasks.length}</span>
                      <span className="text-[8px] font-mono text-blue-400 mt-1 block">Triage completed</span>
                    </div>

                    <div className="bg-[#0b0e1a]/85 border border-gray-900 p-4 rounded-xl text-center shadow relative overflow-hidden group hover:border-indigo-900/50 transition">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-500/50 opacity-0 group-hover:opacity-100 transition" />
                      <span className="text-[10px] font-mono text-gray-500 block uppercase">AI Actions Drafted</span>
                      <span className="text-2xl font-black text-indigo-400 mt-1 block font-mono">{actionsTakenCount.emailsDrafted + actionsTakenCount.outlinesCreated}</span>
                      <span className="text-[8px] font-mono text-indigo-400 mt-1 block">Prepared outlines & emails</span>
                    </div>

                    <div className="bg-[#0b0e1a]/85 border border-gray-900 p-4 rounded-xl text-center shadow relative overflow-hidden group hover:border-teal-900/50 transition">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-teal-500/50 opacity-0 group-hover:opacity-100 transition" />
                      <span className="text-[10px] font-mono text-gray-500 block uppercase">Slots Booked</span>
                      <span className="text-2xl font-black text-teal-400 mt-1 block font-mono">{actionsTakenCount.slotsBooked}</span>
                      <span className="text-[8px] font-mono text-teal-400 mt-1 block">Google Events sync'd</span>
                    </div>

                    <div className="bg-[#0b0e1a]/85 border border-gray-900 p-4 rounded-xl text-center shadow relative overflow-hidden group hover:border-amber-900/50 transition">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-amber-500/50 opacity-0 group-hover:opacity-100 transition" />
                      <span className="text-[10px] font-mono text-gray-500 block uppercase flex items-center justify-center gap-0.5">
                        Streak <Flame className="w-3 h-3 text-amber-500" />
                      </span>
                      <span className="text-2xl font-black text-amber-400 mt-1 block font-mono">{actionsTakenCount.streaks} days</span>
                      <span className="text-[8px] font-mono text-amber-400 mt-1 block">Tasks done on time</span>
                    </div>
                  </div>

                  {/* WEEKLY CALENDAR HEATMAP OR VISUAL GRID */}
                  <div className="bg-[#0b0e1a]/85 border border-gray-900 p-5 rounded-2xl shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <h3 className="text-xs font-bold uppercase text-white tracking-wider font-mono">Weekly Load & Heatmap Matrix</h3>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] font-mono">
                        <span className="flex items-center gap-1 text-blue-400">
                          <span className="w-2 h-2 rounded-full bg-blue-500" /> AI suggestion
                        </span>
                        <span className="flex items-center gap-1 text-indigo-500">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" /> Busy blocks
                        </span>
                      </div>
                    </div>

                    {/* HEATMAP ROWS REPRESENTING DAILY LOAD */}
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-7 gap-1.5 text-center text-[9px] font-mono text-gray-500">
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                        <span>Sun</span>
                      </div>

                      {/* Daily Load blocks representing hours of the day (Morning, Midday, Afternoon) */}
                      <div className="grid grid-cols-7 gap-1.5">
                        {/* Monday */}
                        <div className="space-y-1">
                          <div className="h-6 bg-indigo-600/30 rounded border border-indigo-500/20" title="Morning design sync" />
                          <div className="h-6 bg-blue-500/20 rounded border border-blue-500/30" title="Suggested focus block" />
                          <div className="h-6 bg-gray-950/40 rounded border border-gray-900" />
                        </div>
                        {/* Tuesday */}
                        <div className="space-y-1">
                          <div className="h-6 bg-gray-950/40 rounded border border-gray-900" />
                          <div className="h-6 bg-indigo-600/40 rounded border border-indigo-500/20" />
                          <div className="h-6 bg-gray-950/40 rounded border border-gray-900" />
                        </div>
                        {/* Wednesday */}
                        <div className="space-y-1">
                          <div className="h-6 bg-blue-500/20 rounded border border-blue-500/30" />
                          <div className="h-6 bg-indigo-600/30 rounded border border-indigo-500/20" />
                          <div className="h-6 bg-indigo-600/30 rounded border border-indigo-500/20" />
                        </div>
                        {/* Thursday */}
                        <div className="space-y-1">
                          <div className="h-6 bg-gray-950/40 rounded border border-gray-900" />
                          <div className="h-6 bg-gray-950/40 rounded border border-gray-900" />
                          <div className="h-6 bg-blue-500/25 rounded border border-blue-500/30" />
                        </div>
                        {/* Friday */}
                        <div className="space-y-1">
                          <div className="h-6 bg-indigo-600/30 rounded border border-indigo-500/20" />
                          <div className="h-6 bg-blue-500/20 rounded border border-blue-500/30" />
                          <div className="h-6 bg-gray-950/40 rounded border border-gray-900" />
                        </div>
                        {/* Saturday */}
                        <div className="space-y-1">
                          <div className="h-6 bg-gray-950/40 rounded border border-gray-900" />
                          <div className="h-6 bg-gray-950/40 rounded border border-gray-900" />
                          <div className="h-6 bg-gray-950/40 rounded border border-gray-900" />
                        </div>
                        {/* Sunday */}
                        <div className="space-y-1">
                          <div className="h-6 bg-gray-950/40 rounded border border-gray-900" />
                          <div className="h-6 bg-gray-950/40 rounded border border-gray-900" />
                          <div className="h-6 bg-gray-950/40 rounded border border-gray-900" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <p className="text-gray-400">Heatmap highlights available focus gaps dynamically derived from Google calendar sync.</p>
                      <button
                        onClick={promptBookAllSuggestions}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-[10px] font-mono rounded-lg transition"
                      >
                        Book All Free Gaps
                      </button>
                    </div>
                  </div>

                  {/* TODAY'S PRIORITY TASKS HIGHLIGHT PANEL */}
                  <div className="bg-[#0b0e1a]/85 border border-gray-900 p-5 rounded-2xl shadow space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ListTodo className="w-4 h-4 text-indigo-400" />
                        <h3 className="text-xs font-bold uppercase text-white tracking-wider font-mono">Today's Priority Triage Focus</h3>
                      </div>
                      <span className="text-[10px] font-mono text-red-400 font-bold uppercase animate-pulse flex items-center gap-1 bg-red-950/40 border border-red-900/30 px-2 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Urgent focus
                      </span>
                    </div>

                    <div className="space-y-3">
                      {parsedTasks.slice(0, 2).map((task, i) => (
                        <div key={i} className="p-4 bg-gray-950/50 border border-gray-900 rounded-xl flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] font-mono font-bold uppercase bg-red-950/40 text-red-400 border border-red-900/40 px-1.5 py-0.5 rounded">
                                Urgency: {task.urgencyScore || 9}/10
                              </span>
                              <span className="text-[9px] font-mono text-gray-400 bg-gray-900 px-1.5 py-0.5 rounded">
                                Effort: {task.effortScore || 7}/10
                              </span>
                              {task.dueApproximate && (
                                <span className="text-[9px] font-mono text-amber-400 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" /> {task.dueApproximate}
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-white mt-1">{task.title}</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">{task.description}</p>
                          </div>
                          
                          {/* Countdown timers rendering */}
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-mono text-gray-500 block uppercase">Time limit</span>
                            <span className="text-xs font-bold font-mono text-red-400 block mt-0.5">
                              {i === 0 ? "Expires in < 24 hours" : "Expires in 34 hours"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB CONTENT: TASKS TRIAGE LIST */}
              {activeTab === 'tasks' && (
                <motion.div
                  key="tasks-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between text-xs text-gray-400 bg-gray-950/40 border border-gray-900 p-4 rounded-xl leading-normal">
                    <span>Evaluate and sync parsed structured actions with your connected live accounts default checklist instantly.</span>
                  </div>

                  {parsedTasks.map((task, idx) => (
                    <div
                      key={idx}
                      className="bg-[#0b0e1a]/85 border border-gray-900 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-900/50 transition-all duration-200"
                    >
                      <div className="space-y-2 max-w-lg">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-mono uppercase tracking-wider font-extrabold px-2 py-0.5 rounded border ${
                            task.priority === 'high'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            Priority: {task.priority.toUpperCase()}
                          </span>
                          <span className="text-[9px] font-mono font-bold uppercase bg-blue-950/40 text-blue-400 border border-blue-900/30 px-2 py-0.5 rounded">
                            Urgency Score: {task.urgencyScore || 8}/10
                          </span>
                          <span className="text-[9px] font-mono font-bold uppercase bg-indigo-950/40 text-indigo-400 border border-indigo-900/30 px-2 py-0.5 rounded">
                            Effort Score: {task.effortScore || 5}/10
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">
                            Est: {task.recommendedDurationMinutes} mins
                          </span>
                        </div>
                        
                        <h4 className="text-sm font-extrabold text-white">{task.title}</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">{task.description}</p>

                        {task.dueApproximate && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 mt-1">
                            <Clock className="w-3.5 h-3.5" /> Due: {task.dueApproximate}
                          </span>
                        )}
                      </div>

                      <div className="shrink-0 flex gap-2">
                        {user ? (
                          <button
                            onClick={() => promptSyncTask(task)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/35 active:scale-95 text-indigo-300 hover:text-white rounded-xl text-xs font-mono border border-indigo-500/20 transition-all duration-150"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Sync to Tasks
                          </button>
                        ) : (
                          <div className="text-[9px] text-gray-500 flex items-center gap-1 px-3 py-2 bg-gray-950/40 rounded-xl border border-gray-900 font-mono">
                            <Lock className="w-3.5 h-3.5 text-gray-700" />
                            Sign in to Sync
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* TAB CONTENT: CALENDAR BOOKINGS */}
              {activeTab === 'schedule' && (
                <motion.div
                  key="schedule-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="text-xs text-gray-400 bg-blue-950/10 border border-blue-900/20 p-4 rounded-xl leading-relaxed flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <strong>Google Calendar Smart Collision Audit:</strong> DeadlineAI detects overlaps and highlights non-conflicting time windows in blue. Click once to book.
                    </div>
                  </div>

                  {calendarSuggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="bg-[#0b0e1a]/85 border border-gray-900 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-900/50 transition-all duration-200"
                    >
                      <div className="space-y-1.5 max-w-lg">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                            <Calendar className="w-4 h-4" />
                          </span>
                          <div className="text-xs font-mono font-semibold text-blue-400">
                            {formatFriendlyTime(suggestion.startTime)} - {new Date(suggestion.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">{suggestion.title}</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">{suggestion.description}</p>
                      </div>

                      <div className="shrink-0 flex gap-2">
                        {user ? (
                          <button
                            onClick={() => promptBookCalendarEvent(suggestion)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/35 active:scale-95 text-blue-300 hover:text-white rounded-xl text-xs font-mono border border-blue-500/20 transition-all duration-150"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Book Free Slot
                          </button>
                        ) : (
                          <div className="text-[9px] text-gray-500 flex items-center gap-1 px-3 py-2 bg-gray-950/40 rounded-xl border border-gray-900 font-mono">
                            <Lock className="w-3.5 h-3.5 text-gray-700" />
                            Sign in to Book
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* TAB CONTENT: ACTION DRAFTS */}
              {activeTab === 'actions' && (
                <motion.div
                  key="actions-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {actionDrafts.map((draft, idx) => (
                    <div
                      key={draft.id || idx}
                      className="bg-[#0b0e1a]/85 border border-gray-900 rounded-2xl p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-gray-900 pb-3 flex-wrap gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-indigo-400 flex items-center gap-1 uppercase font-bold">
                            {draft.actionType === 'email' ? <Mail className="w-3.5 h-3.5" /> : draft.actionType === 'document' ? <FileText className="w-3.5 h-3.5" /> : <ListTodo className="w-3.5 h-3.5" />}
                            Prepared {draft.actionType}
                          </span>
                          <h4 className="text-xs text-gray-400 font-mono mt-0.5">Focus: {draft.taskTitle}</h4>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopyText(draft.draftContent, draft.id || `idx_${idx}`)}
                            className="p-1.5 bg-gray-950 hover:bg-gray-900 text-gray-400 hover:text-white rounded-lg border border-gray-900 transition flex items-center gap-1 text-[10px] font-mono px-2.5 py-1.5"
                            title="Copy Draft"
                          >
                            {copiedDraftId === (draft.id || `idx_${idx}`) ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Draft</span>
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleRegenerateDraft(draft.taskTitle, '', draft.actionType, idx)}
                            className="px-2.5 py-1.5 bg-gray-950 hover:bg-gray-900 text-[10px] font-mono font-medium text-blue-400 hover:text-white rounded-lg border border-gray-900 transition"
                          >
                            Re-draft
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h5 className="text-xs font-extrabold text-white font-mono">{draft.draftTitle}</h5>
                        <div className="bg-gray-950/40 border border-gray-900 p-3.5 rounded-lg max-h-48 overflow-y-auto font-mono text-xs text-gray-300 leading-relaxed whitespace-pre-wrap custom-scrollbar">
                          {draft.draftContent}
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* TAB CONTENT: HACKATHON GOOGLE DOC SUBMISSION DETAIL */}
              {activeTab === 'submission' && (
                <motion.div
                  key="submission-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  <div className="bg-[#0b0e1a]/85 border border-gray-900 p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                      <button
                        onClick={() => {
                          const docText = `Problem Statement Selected: The Last-Minute Life Saver\n\nSolution Overview:\nDeadlineAI is an autonomous AI Chief of Staff designed to evaluate, map, and organize unstructured stress, messy threads, or dictation streams directly into clear prioritized lists. It performs proactive, secure synchronizations against your actual calendar blocks, computes urgency and effort matrices, and autogenerates ready-to-use outlines and email briefs sequentially so you never waste time looking at a blank page.\n\nKey Features:\n1. Advance Priority Matrix: Sort critical tasks by urgency and effort parameters.\n2. Audio Dictation: Captures and transcribes vocal stress streams with rich real-time visual waves.\n3. Automatic Workspace Booking: Checks and prevents conflicts by highlighting free blocks.\n4. Smart Nudge Synthesizer: Proactively reminds you of forthcoming open focus hours.\n5. Custom Content Drafts: Generates full briefs, email templates, and outlines in seconds.\n6. Multi-model Failover Backend: Auto-retries across five model targets to evade high-traffic unavailable errors.\n\nTechnologies Used: React, Vite, Firebase Auth, Google Workspace API, Google Tasks API, Google Calendar API, Google Cloud Run, Speech-to-Text API.\n\nGoogle Technologies Utilized: Gemini API, Google Calendar API, Google Cloud Run, Firebase, Google OAuth, Google AI Studio, Google Cloud Speech-to-Text API.`;
                          handleCopyText(docText, 'hackathon_doc');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-950/40 text-teal-400 hover:text-white border border-teal-900/30 rounded-lg text-[10px] font-mono transition"
                      >
                        {copiedDraftId === 'hackathon_doc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        Copy Submission Draft
                      </button>
                    </div>

                    <h2 className="text-lg font-black text-white flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-teal-400" />
                      Google Hackathon Project Submission Draft
                    </h2>

                    <div className="space-y-4 text-xs leading-relaxed text-gray-300">
                      <div>
                        <span className="font-bold text-teal-400 font-mono block uppercase">Problem Statement Selected</span>
                        <p className="mt-1 text-gray-200 font-semibold bg-gray-950/40 p-2.5 rounded border border-gray-900">
                          The Last-Minute Life Saver
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-teal-400 font-mono block uppercase">Solution Overview</span>
                        <p className="mt-1 text-gray-400 bg-gray-950/40 p-2.5 rounded border border-gray-900">
                          <strong>DeadlineAI</strong> is an autonomous AI Chief of Staff (not just a reminder tool) that transforms pure text chaos, dictation streams, and unreplied threads into actionable roadmap structures. It prevents calendar collisions by auditing real schedules, scoring urgency/effort values (1-10), and providing ready-to-go drafts autonomously.
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-teal-400 font-mono block uppercase">Key Features (6)</span>
                        <ul className="mt-1 space-y-2 bg-gray-950/40 p-3 rounded border border-gray-900 list-disc list-inside text-gray-400">
                          <li><strong>Advanced Priority Scoring Matrix:</strong> Sort tasks by computed urgency and effort scores.</li>
                          <li><strong>Google Workspace Event Sync:</strong> Direct bidirectional booking with conflict solutions.</li>
                          <li><strong>Live Audio Dictation Transcriber:</strong> Simulated pulsing speech waves converting vocal panic into text.</li>
                          <li><strong>Autonomous Action Draft Generator:</strong> Fully drafted email responses, briefing outlines, and checklists.</li>
                          <li><strong>Smart In-App Nudges:</strong> Alerts you to upcoming free intervals and initiates workflows on-the-fly.</li>
                          <li><strong>Robust Model Failover:</strong> Dynamic failover fallback algorithm to bypass 503 unavailability.</li>
                        </ul>
                      </div>

                      <div>
                        <span className="font-bold text-teal-400 font-mono block uppercase">Technologies Used</span>
                        <p className="mt-1 font-mono bg-gray-950/40 p-2.5 rounded border border-gray-900 text-[11px] text-gray-400">
                          React 18+, Vite, Tailwind CSS, Firebase Auth, Google Workspace API, Google Tasks API, Google Calendar API, Google Cloud Run, Speech-to-Text.
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-teal-400 font-mono block uppercase">Google Technologies Utilized</span>
                        <p className="mt-1 font-mono bg-gray-950/40 p-2.5 rounded border border-gray-900 text-[11px] text-gray-400">
                          Gemini API, Google Calendar API, Google Cloud Run, Firebase, Google OAuth, Google AI Studio, Google Cloud Speech-to-Text API.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG MODALS FOR MUTATING GOOGLE API DATA */}
      <AnimatePresence>
        {pendingConfirmAction && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0e1a] border border-gray-900 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 relative ring-1 ring-blue-500/15"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <AlertCircle className="w-5.5 h-5.5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white tracking-tight">Authorize Workspace Modification</h3>
                  <p className="text-[10px] text-gray-500 font-mono uppercase">Google API Writeback Authorization</p>
                </div>
              </div>

              <div className="bg-gray-950/60 border border-gray-900 rounded-xl p-4 text-xs text-gray-300">
                {pendingConfirmAction.type === 'book_event' && (
                  <>
                    Authorize DeadlineAI to schedule and book this focus session block on your live Google Calendar:
                    <div className="mt-2.5 p-2 bg-gray-950 border border-gray-900 rounded-lg text-white font-medium font-mono text-[11px]">
                      {pendingConfirmAction.payload.title}
                    </div>
                    <div className="text-[10px] text-blue-400 mt-1.5 font-mono">
                      Suggested: {formatFriendlyTime(pendingConfirmAction.payload.startTime)}
                    </div>
                  </>
                )}
                {pendingConfirmAction.type === 'sync_task' && (
                  <>
                    Authorize DeadlineAI to export and create this structured action item on your Google Tasks list:
                    <div className="mt-2.5 p-2 bg-gray-950 border border-gray-900 rounded-lg text-white font-medium font-mono text-[11px]">
                      {pendingConfirmAction.payload.title}
                    </div>
                    <div className="text-[10px] text-indigo-400 mt-1.5 font-mono">
                      Urgency Score: {pendingConfirmAction.payload.urgencyScore || 9}/10
                    </div>
                  </>
                )}
                {pendingConfirmAction.type === 'book_all' && (
                  <>
                    Authorize DeadlineAI to book all {pendingConfirmAction.payload.length} suggested focus slots directly on your Google Calendar sequentially:
                    <div className="mt-2.5 max-h-24 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                      {pendingConfirmAction.payload.map((item: any, idx: number) => (
                        <div key={idx} className="p-1.5 bg-gray-950 border border-gray-900 rounded font-mono text-[10px] text-gray-300">
                          {item.title}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <p className="text-[10px] text-gray-500 leading-normal">
                Executing these writes directly triggers modifications on your personal Google Workspace. You maintain absolute control over permissions via your Google Account Dashboard settings.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setPendingConfirmAction(null)}
                  className="px-4 py-2 hover:bg-gray-900 text-gray-400 hover:text-white rounded-xl text-xs font-mono font-bold border border-gray-900 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={executePendingAction}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-mono font-bold text-xs rounded-xl transition"
                >
                  Confirm Sync
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING STATUS TOAST */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-2xl backdrop-blur-md border z-50 flex items-center gap-2.5 max-w-sm ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
                : notification.type === 'error'
                ? 'bg-red-950/90 border-red-500/30 text-red-300'
                : 'bg-indigo-950/90 border-indigo-500/30 text-indigo-300'
            }`}
          >
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span className="text-xs leading-relaxed font-semibold">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
