import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { api } from '../lib/api.js';
import Avatar from '../components/Avatar.jsx';
import AccountMenu from '../components/AccountMenu.jsx';
import { DemoWorkspaceBanner } from '../components/DemoWorkspaceBanner.jsx';
import { SettingsModal } from '../components/SettingsModal.jsx';
import { ComposeEmailModal } from '../components/ComposeEmailModal.jsx';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Inbox,
  Send,
  UserCheck,
  Quote,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Calendar,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  MessageSquare,
  ArrowRight,
  CornerDownRight,
  Hourglass,
  Layers,
  FileText,
  SlidersHorizontal,
  Settings,
  PenSquare,
} from 'lucide-react';
import { toast } from 'sonner';

export function ClientQueue() {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [activeNav, setActiveNav] = useState('today'); // 'today' | 'week' | 'later' | 'waiting' | 'handled'
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [lastClientAction, setLastClientAction] = useState(null); // { threadId, subject, summary, previousState }
  const [threadDetails, setThreadDetails] = useState({}); // cached threadId -> { messages, timeline, drafts }
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isHandingOver, setIsHandingOver] = useState(false);
  const [handoverNote, setHandoverNote] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showOriginalThread, setShowOriginalThread] = useState(false);
  const [draftEdits, setDraftEdits] = useState({}); // threadId -> edited draft text
  const [snoozeMenuOpen, setSnoozeMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date());
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());

  // Keep greeting & relative timestamps live if the tab stays open across time-of-day boundaries
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Optimistic tracking for 1-click Undo
  const lastActionRef = useRef(null);
  const sheetScrollRef = useRef(null);

  // Reset inline action drawers whenever switching threads
  useEffect(() => {
    setIsHandingOver(false);
    setHandoverNote('');
    setIsReplying(false);
    setReplyText('');
    setShowOriginalThread(false);
    setSnoozeMenuOpen(false);
    if (sheetScrollRef.current) {
      sheetScrollRef.current.scrollTop = 0;
    }
  }, [selectedThreadId]);

  function openComposer(mode, prefill = '') {
    if (mode === 'reply') {
      setIsHandingOver(false);
      setIsReplying(true);
      if (prefill) setReplyText(prefill);
    } else if (mode === 'handover') {
      setIsReplying(false);
      setIsHandingOver(true);
      if (prefill) setHandoverNote(prefill);
    }
    setTimeout(() => {
      if (sheetScrollRef.current) {
        sheetScrollRef.current.scrollTo({
          top: sheetScrollRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 60);
  }

  // Load threads on boot and every 10s for live synchronization
  useEffect(() => {
    loadThreads();
    const interval = setInterval(() => {
      loadThreads(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadThreads(isBackground = false) {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const res = await api.get('/threads?limit=100');
      if (res.ok && Array.isArray(res.data)) {
        setThreads(res.data);
        setLastSyncedAt(new Date());

        // Default selection if none selected or previous selection gone
        if (!selectedThreadId && res.data.length > 0) {
          const firstClientThread = res.data.find(
            (t) => t.clientStatus !== 'handled' && t.currentLabel === 'CLIENT_TO_REPLY'
          );
          if (firstClientThread) {
            setSelectedThreadId(firstClientThread._id || firstClientThread.id);
          }
        }
      }
    } catch (err) {
      if (!isBackground) {
        setError(err.message || 'Failed to load executive decision queue.');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }

  // Load thread detail (messages & drafts) when selectedThreadId changes
  useEffect(() => {
    if (!selectedThreadId) return;
    if (threadDetails[selectedThreadId]) return;

    let isMounted = true;
    setLoadingDetails(true);
    api
      .get(`/threads/${selectedThreadId}`)
      .then((res) => {
        if (isMounted && res.ok && res.data) {
          setThreadDetails((prev) => ({
            ...prev,
            [selectedThreadId]: res.data,
          }));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingDetails(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedThreadId]);

  // Derive active decision threads
  const activeDecisions = useMemo(() => {
    return threads.filter(
      (t) => t.clientStatus !== 'handled' && t.currentLabel === 'CLIENT_TO_REPLY'
    );
  }, [threads]);

  // Categorize decisions by urgency
  const categorized = useMemo(() => {
    const today = [];
    const thisWeek = [];
    const noDeadline = [];

    activeDecisions.forEach((t) => {
      const deadline = (t.aiReason?.decision?.deadline || t.dueDate || '').toLowerCase();
      if (
        deadline.includes('today') ||
        deadline.includes('4:00') ||
        deadline.includes('5:00') ||
        deadline.includes('pm') ||
        t.isImportant
      ) {
        today.push(t);
      } else if (
        deadline.includes('tomorrow') ||
        deadline.includes('thursday') ||
        deadline.includes('friday') ||
        deadline.includes('week')
      ) {
        thisWeek.push(t);
      } else {
        noDeadline.push(t);
      }
    });

    return { today, thisWeek, noDeadline };
  }, [activeDecisions]);

  // Derived counts for left navigator
  const waitingThreads = useMemo(() => {
    return threads.filter((t) => t.isWaiting === true && t.clientStatus !== 'handled');
  }, [threads]);

  const handledThreads = useMemo(() => {
    return threads.filter(
      (t) => t.clientStatus === 'handled' || t.isCompleted === true || t.currentLabel === 'NO_REPLY_NEEDED'
    );
  }, [threads]);

  // Selected thread item
  const selectedThread = useMemo(() => {
    return threads.find((t) => (t._id || t.id) === selectedThreadId) || activeDecisions[0] || null;
  }, [threads, selectedThreadId, activeDecisions]);

  // Selected thread's detail payload
  const currentDetail = selectedThreadId ? threadDetails[selectedThreadId] : null;
  const currentDraft = useMemo(() => {
    const pendingDraft = currentDetail?.drafts?.find((d) => d.status === 'pending_client');
    if (pendingDraft) return pendingDraft;
    return null;
  }, [currentDetail]);

  // Keyboard navigation & quick shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      // Ignore if focus is in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      const items =
        activeNav === 'today'
          ? categorized.today
          : activeNav === 'week'
          ? categorized.thisWeek
          : activeNav === 'later'
          ? categorized.noDeadline
          : activeNav === 'waiting'
          ? waitingThreads
          : handledThreads;

      if (!items || items.length === 0) return;

      const currentIndex = items.findIndex((t) => (t._id || t.id) === selectedThreadId);

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        setSelectedThreadId(items[nextIndex]._id || items[nextIndex].id);
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        setSelectedThreadId(items[prevIndex]._id || items[prevIndex].id);
      } else if (e.key === 'Enter') {
        if (selectedThread && typeof window !== 'undefined' && window.innerWidth < 768) {
          setShowMobileSheet(true);
        }
      } else if (e.key === 'a' && selectedThread && currentDraft) {
        // 'a' = Approve draft (only when a prepared draft exists)
        e.preventDefault();
        handleExecuteDecision(selectedThread._id, 'approve', {
          draftId: currentDraft._id,
          customText: draftEdits[selectedThread._id],
        });
      } else if (e.key === 'r' && selectedThread) {
        // 'r' = Reply myself
        e.preventDefault();
        openComposer('reply');
      } else if (e.key === 'h' && selectedThread) {
        // 'h' = Hand to Maya
        e.preventDefault();
        openComposer('handover');
      } else if (e.key === 's' && selectedThread) {
        // 's' = Snooze
        e.preventDefault();
        handleExecuteDecision(selectedThread._id, 'snooze', { duration: 'tomorrow' });
      } else if (e.key === 'd' && selectedThread) {
        // 'd' = Mark handled
        e.preventDefault();
        handleExecuteDecision(selectedThread._id, 'handled');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeNav,
    categorized,
    waitingThreads,
    handledThreads,
    selectedThreadId,
    selectedThread,
    currentDraft,
    draftEdits,
  ]);

  // Execute decision action with Optimistic Updates, Next-Email Advance & Server-Persisted Undo
  async function handleExecuteDecision(threadId, action, extra = {}) {
    const threadToUpdate = threads.find((t) => (t._id || t.id) === threadId);
    if (!threadToUpdate) return;

    // Save previous state for persistent Undo
    const previousState = { ...threadToUpdate };
    const prevSnapshot = {
      currentLabel: threadToUpdate.currentLabel,
      clientStatus: threadToUpdate.clientStatus || 'pending',
      isCompleted: Boolean(threadToUpdate.isCompleted),
      isWaiting: Boolean(threadToUpdate.isWaiting),
      isActionRequired: threadToUpdate.isActionRequired !== undefined ? Boolean(threadToUpdate.isActionRequired) : true,
      snoozedUntil: threadToUpdate.snoozedUntil || null,
    };

    // Determine sequential next email in the current visible list
    const currentList = visibleList.length > 0 ? visibleList : activeDecisions;
    const currentIdx = currentList.findIndex((t) => (t._id || t.id) === threadId);
    const remaining = currentList.filter((t) => (t._id || t.id) !== threadId);
    let nextThreadId = null;
    if (remaining.length > 0) {
      const nextItem =
        currentIdx !== -1 && currentIdx < remaining.length
          ? remaining[currentIdx]
          : remaining[remaining.length - 1];
      nextThreadId = nextItem?._id || nextItem?.id || null;
    }

    // Trigger toast + inline Undo bar message
    let successMsg = 'Marked as handled.';
    if (action === 'approve') successMsg = 'Draft approved & sent (simulated) · Moved to Handled & Waiting.';
    if (action === 'reply_direct') successMsg = 'Direct reply sent (simulated) · Moved to Handled & Waiting.';
    if (action === 'hand_to_assistant') successMsg = 'Handed to Maya · Moved to Assistant Queue.';
    if (action === 'snooze') {
      successMsg =
        extra.duration === '4h'
          ? 'Snoozed for 4 hours · Moved to Later.'
          : extra.duration === 'next_week'
          ? 'Snoozed until next week · Moved to Later.'
          : 'Snoozed until tomorrow 9 AM · Moved to Later.';
    }

    const actionRecord = {
      threadId,
      subject: threadToUpdate.subject,
      summary: successMsg,
      previousState,
      prevSnapshot,
      action,
    };
    lastActionRef.current = actionRecord;
    setLastClientAction(actionRecord);

    // Optimistically update local thread state so it moves to the proper bucket immediately
    const isSentOrDone = action === 'approve' || action === 'reply_direct';
    setThreads((prev) =>
      prev.map((t) => {
        if ((t._id || t.id) === threadId) {
          return {
            ...t,
            clientStatus:
              isSentOrDone || action === 'handled'
                ? 'handled'
                : action === 'hand_to_assistant'
                ? 'delegated'
                : action,
            isCompleted: isSentOrDone || action === 'handled',
            isWaiting: isSentOrDone ? true : t.isWaiting,
            currentLabel: isSentOrDone
              ? 'NO_REPLY_NEEDED'
              : action === 'hand_to_assistant'
              ? 'ASSISTANT_TO_REPLY'
              : t.currentLabel,
          };
        }
        return t;
      })
    );

    // Advance smoothly to the next email (or clear when queue is empty)
    if (nextThreadId) {
      setSelectedThreadId(nextThreadId);
    } else {
      setSelectedThreadId(null);
      if (showMobileSheet) {
        setShowMobileSheet(false);
      }
    }

    toast.success(successMsg, {
      duration: 6000,
      action: {
        label: 'Undo',
        onClick: () => handleUndoLastAction(actionRecord),
      },
    });

    try {
      const res = await api.post(`/threads/${threadId}/client-decision`, {
        action,
        ...extra,
      });
      if (!res.ok) throw new Error(res.error?.message || 'Server rejected action');
    } catch (err) {
      // Revert optimistic update on failure
      setThreads((prev) =>
        prev.map((t) => ((t._id || t.id) === threadId ? previousState : t))
      );
      setSelectedThreadId(threadId);
      setLastClientAction(null);
      toast.error('Action failed: ' + err.message);
    }
  }

  // Reverse last action both optimistically AND on the server
  async function handleUndoLastAction(record = lastActionRef.current) {
    if (!record) return;
    const { threadId, previousState, prevSnapshot } = record;
    setThreads((prev) =>
      prev.map((t) => ((t._id || t.id) === threadId ? previousState : t))
    );
    setSelectedThreadId(threadId);
    setLastClientAction(null);
    lastActionRef.current = null;
    toast.info('Action undone — email restored.');

    try {
      await api.post(`/threads/${threadId}/client-decision`, {
        action: 'undo',
        previousState: prevSnapshot,
      });
    } catch {
      // Keep UI restored and reload on next sync
    }
  }

  function handleStepDecision(delta) {
    if (!visibleList.length) return;
    const idx = visibleList.findIndex((t) => (t._id || t.id) === selectedThreadId);
    const nextIdx = idx === -1 ? 0 : idx + delta;
    if (nextIdx >= 0 && nextIdx < visibleList.length) {
      setSelectedThreadId(visibleList[nextIdx]._id || visibleList[nextIdx].id);
    }
  }

  // Greeting based on live client time of day (auto-updates across morning/afternoon/evening)
  const greeting = useMemo(() => {
    const name = user?.name ? user.name.split(' ')[0] : 'Priya';
    if (currentHour < 12) return `Good morning, ${name}`;
    if (currentHour < 17) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  }, [user, currentHour]);

  // Plain language summary sentence
  const summarySentence = useMemo(() => {
    const dueCount = categorized.today.length;
    const handledCount = Math.max(12, handledThreads.length);
    if (dueCount === 0) {
      return `You're completely clear. Maya and the agents handled ${handledCount} items today.`;
    }
    return `${dueCount} decision${dueCount === 1 ? ' is' : 's are'} due today. Maya and the agents handled ${handledCount} more.`;
  }, [categorized.today.length, handledThreads.length]);

  // Active items based on left navigator selection
  const visibleList = useMemo(() => {
    if (activeNav === 'today') return categorized.today;
    if (activeNav === 'week') return categorized.thisWeek;
    if (activeNav === 'later') return categorized.noDeadline;
    if (activeNav === 'waiting') return waitingThreads;
    if (activeNav === 'handled') return handledThreads;
    return activeDecisions;
  }, [activeNav, categorized, waitingThreads, handledThreads, activeDecisions]);

  const navItems = [
    {
      id: 'today',
      label: 'Today',
      count: categorized.today.length,
      highlight: categorized.today.length > 0,
      icon: Sparkles,
    },
    {
      id: 'week',
      label: 'This week',
      count: categorized.thisWeek.length,
      icon: Calendar,
    },
    {
      id: 'later',
      label: 'Later',
      count: categorized.noDeadline.length,
      icon: Clock,
    },
    {
      id: 'waiting',
      label: 'Waiting on others',
      count: waitingThreads.length,
      icon: Hourglass,
    },
    {
      id: 'handled',
      label: 'Handled for you',
      count: handledThreads.length,
      icon: CheckCircle2,
    },
  ];

  function handleSelectNav(navId) {
    setActiveNav(navId);
    if (navId === 'today' && categorized.today[0]) {
      setSelectedThreadId(categorized.today[0]._id || categorized.today[0].id);
    } else if (navId === 'week' && categorized.thisWeek[0]) {
      setSelectedThreadId(categorized.thisWeek[0]._id || categorized.thisWeek[0].id);
    } else if (navId === 'later' && categorized.noDeadline[0]) {
      setSelectedThreadId(categorized.noDeadline[0]._id || categorized.noDeadline[0].id);
    } else if (navId === 'waiting' && waitingThreads[0]) {
      setSelectedThreadId(waitingThreads[0]._id || waitingThreads[0].id);
    } else if (navId === 'handled' && handledThreads[0]) {
      setSelectedThreadId(handledThreads[0]._id || handledThreads[0].id);
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-[#FAF8F5] text-[#111827] font-sans flex flex-col select-none antialiased">
      <DemoWorkspaceBanner />

      {/* 1. Minimal Editorial Header */}
      <header className="h-14 flex-shrink-0 bg-white/95 backdrop-blur-md border-b border-black/[0.08] px-4 sm:px-8 flex items-center justify-between z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 group hover:opacity-90 transition cursor-pointer"
            title="Daybook Mail — Return to home"
          >
            <div className="h-7 w-7 rounded-lg bg-ink-900 text-white flex items-center justify-center font-serif font-bold text-xs shadow-soft group-hover:scale-105 transition-transform">
              D
            </div>
            <span className="font-serif font-bold text-sm text-ink-900 tracking-tight hidden lg:inline whitespace-nowrap">
              Daybook Mail
            </span>
          </Link>

          <div className="h-3.5 w-px bg-black/[0.1] hidden sm:block flex-shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-serif font-bold text-ink-900 whitespace-nowrap truncate">
              {user?.name || 'Priya Sharma'}
            </span>
            <span className="hidden sm:inline-flex text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-accent border border-amber-200/60 whitespace-nowrap flex-shrink-0">
              Decision Desk
            </span>
          </div>
        </div>

        {/* Right: Sync Status + Refresh | Compose + Settings + Account Menu */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1">
            <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-ink-500 font-mono whitespace-nowrap">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Synced {Math.max(0, Math.floor((Date.now() - lastSyncedAt.getTime()) / 60000))}m ago</span>
            </div>

            <button
              onClick={() => loadThreads(false)}
              className="p-1.5 rounded-full hover:bg-ink-100 text-ink-500 hover:text-ink-900 transition cursor-pointer active:scale-95"
              title="Refresh queue"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="h-4 w-px bg-black/[0.08] hidden sm:block flex-shrink-0" />

          <button
            type="button"
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold shadow-2xs transition cursor-pointer active:scale-95 whitespace-nowrap"
            title="Compose a new email"
          >
            <PenSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Compose</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-ink-700 hover:text-ink-900 hover:bg-ink-100 transition cursor-pointer"
            title="Executive Preferences & VIP Settings"
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          <AccountMenu />
        </div>
      </header>

      {/* Client Settings Modal (mounted outside backdrop-blur header) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        mode="client"
      />

      {/* Compose New Email Modal */}
      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        mode="client"
        clientId={user?.clientId}
        clientName={user?.name}
        clientEmail={user?.email}
        onComposed={() => loadThreads(true)}
      />

      {/* Tablet / Mobile Compact Segment Strip (visible below xl so 2-pane split works cleanly on 768px-1279px) */}
      <div className="xl:hidden flex-shrink-0 bg-[#FAF8F5] border-b border-black/[0.08] px-4 py-2.5 flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {navItems.map((item) => {
            const isSelected = activeNav === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-ink-900 text-white shadow-2xs'
                    : 'bg-white border border-black/[0.08] text-ink-700 hover:text-ink-900'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : item.highlight ? 'text-accent' : 'text-ink-500'}`} />
                <span>{item.label}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-black/[0.05] text-ink-600'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
        <span className="hidden md:inline text-[11px] text-ink-500 font-medium whitespace-nowrap">
          {summarySentence}
        </span>
      </div>

      {/* 2. Main Executive Workspace: 3-Pane Desktop (xl+), 2-Pane Tablet (md-xl), Single-Pane Mobile */}
      <div className="flex-1 min-h-0 max-w-[1440px] w-full mx-auto flex flex-col md:flex-row overflow-hidden">
        {/* ========================================================= */}
        {/* ZONE 1: LEFT RAIL (Desktop xl+ >= 1280px)                 */}
        {/* ========================================================= */}
        <aside className="hidden xl:flex w-[260px] flex-shrink-0 border-r border-black/[0.08] bg-[#FAF8F5] p-5 flex-col justify-between overflow-y-auto">
          <div className="space-y-5">
            {/* Executive Greeting & Summary Sentence */}
            <div className="space-y-1.5">
              <h1 className="text-xl font-serif font-bold text-ink-900 tracking-tight leading-tight">
                {greeting}
              </h1>
              <p className="text-xs text-ink-600 leading-relaxed font-medium">
                {summarySentence}
              </p>
            </div>

            {/* Vertical Navigator with Counts */}
            <nav className="space-y-1 select-none" aria-label="Executive Queue Navigation">
              {navItems.map((item) => {
                const isSelected = activeNav === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectNav(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition cursor-pointer active:scale-98 ${
                      isSelected
                        ? 'bg-ink-900 text-white shadow-soft font-bold'
                        : 'text-ink-700 hover:text-ink-900 hover:bg-white/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : item.highlight ? 'text-accent' : 'text-ink-500'}`} />
                      <span>{item.label}</span>
                    </div>

                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : item.highlight
                          ? 'bg-amber-100 text-amber-900 border border-amber-300/60'
                          : 'bg-black/[0.04] text-ink-600'
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Compact "Next Deadline" Countdown Card */}
            {categorized.today.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-white border border-black/[0.08] shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-accent font-bold uppercase tracking-wider font-mono">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>Next Deadline</span>
                  </span>
                  <span>Today 5:00 PM</span>
                </div>
                <div className="text-xs font-semibold text-ink-900 truncate">
                  {categorized.today[0].aiReason?.decision?.question || categorized.today[0].subject}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Keyboard Hints & Honest Assurance */}
          <div className="pt-4 border-t border-black/[0.06] space-y-3">
            <p className="text-[11px] text-ink-500 font-medium leading-relaxed">
              Prepared by Maya with Daybook agents. Nothing sends without your tap.
            </p>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] text-ink-500">
              {[
                { key: 'J / K', label: 'Navigate' },
                { key: 'A', label: 'Approve' },
                { key: 'R', label: 'Reply' },
                { key: 'H', label: 'Hand off' },
                { key: 'S', label: 'Snooze' },
                { key: 'D', label: 'Done' },
              ].map((s) => (
                <div key={s.key} className="flex items-center gap-1.5 min-w-0">
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-black/[0.08] font-mono text-[9px] font-semibold text-ink-700 shadow-2xs flex-shrink-0">
                    {s.key}
                  </kbd>
                  <span className="text-ink-500 truncate">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* ZONE 2: MIDDLE COLUMN (Scannable Decision Queue)          */}
        {/* ========================================================= */}
        <section
          className={`w-full md:w-[330px] lg:w-[370px] xl:w-[390px] md:flex-shrink-0 border-r border-black/[0.08] bg-white flex flex-col min-h-0 ${
            showMobileSheet ? 'hidden md:flex' : 'flex flex-1 md:flex-initial'
          }`}
        >
          {/* List Header Bar */}
          <div className="px-5 py-3 border-b border-black/[0.06] flex items-center justify-between bg-white sticky top-0 z-10">
            <span className="text-xs font-mono uppercase font-bold tracking-wider text-ink-500">
              {activeNav === 'today'
                ? `Due Today (${categorized.today.length})`
                : activeNav === 'week'
                ? `This Week (${categorized.thisWeek.length})`
                : activeNav === 'later'
                ? `Later Decisions (${categorized.noDeadline.length})`
                : activeNav === 'waiting'
                ? `Waiting on Others (${waitingThreads.length})`
                : `Resolved Archive (${handledThreads.length})`}
            </span>
            <span className="text-[11px] text-ink-400 font-medium">
              {visibleList.length} total
            </span>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-black/[0.04]">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 rounded-2xl bg-black/[0.02] animate-pulse space-y-2">
                    <div className="h-3 w-1/3 bg-black/10 rounded" />
                    <div className="h-4 w-3/4 bg-black/10 rounded" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-8 text-center space-y-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 mx-auto" />
                <p className="text-xs text-ink-600 font-medium">{error}</p>
                <button
                  onClick={() => loadThreads(false)}
                  className="px-3.5 py-1.5 rounded-full bg-ink-900 text-white text-xs font-semibold"
                >
                  Retry
                </button>
              </div>
            ) : visibleList.length === 0 ? (
              /* Calm Empty State */
              <div className="p-10 text-center space-y-4 my-auto">
                {/* SVG/CSS Desk Illustration */}
                <div className="h-20 w-20 rounded-3xl bg-[#FAF8F5] border border-black/[0.08] flex items-center justify-center mx-auto shadow-2xs">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="font-serif font-bold text-base text-ink-900">
                  {activeNav === 'handled'
                    ? 'No handled archive yet.'
                    : activeNav === 'waiting'
                    ? 'Zero threads waiting on others.'
                    : "You're all clear."}
                </h3>
                <p className="text-xs text-ink-500 max-w-xs mx-auto leading-relaxed">
                  {activeNav === 'handled'
                    ? 'Actions resolved by Maya and autonomous agents will appear here.'
                    : 'Maya and the agents handled routine threads. Nothing is currently blocked on your signature.'}
                </p>
              </div>
            ) : activeNav === 'handled' ? (
              /* HANDLED TIMELINE VIEW (Not tiles, but a calm timeline) */
              <div className="p-5 space-y-4">
                {handledThreads.map((item, idx) => (
                  <div key={item._id || idx} className="flex items-start gap-3 text-xs">
                    <div className="h-6 w-6 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-200/60 font-mono text-[10px]">
                      ✓
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between text-ink-500 font-mono text-[10px]">
                        <span>{item.participants?.[0]?.name || 'Sender'}</span>
                        <span>{new Date(item.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="font-semibold text-ink-900 truncate">
                        {item.subject}
                      </div>
                      <p className="text-[11px] text-ink-500 line-clamp-1">
                        {item.clientDecisionNote || item.agentSummary || 'Resolved autonomously.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeNav === 'waiting' ? (
              /* WAITING ON OTHERS LIST */
              <div className="divide-y divide-black/[0.04]">
                {waitingThreads.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => {
                      setSelectedThreadId(item._id);
                      if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        setShowMobileSheet(true);
                      }
                    }}
                    className={`p-4 hover:bg-[#FAF8F5]/80 transition cursor-pointer space-y-1.5 ${
                      selectedThreadId === item._id ? 'bg-[#FAF8F5] border-l-2 border-amber-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-ink-500 font-mono">
                      <span>{item.participants?.[0]?.name || 'Partner'}</span>
                      <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full font-bold">
                        Waiting 3d
                      </span>
                    </div>
                    <h4 className="font-semibold text-xs text-ink-900 truncate">{item.subject}</h4>
                    <p className="text-[11px] text-ink-500 line-clamp-1">{item.snippet}</p>
                  </div>
                ))}
              </div>
            ) : (
              /* DENSE SCANNABLE DECISION ROWS */
              visibleList.map((t) => {
                const isSelected = selectedThreadId === (t._id || t.id);
                const senderName = t.participants?.[0]?.name || t.participants?.[0]?.email || 'Sender';
                const decisionQuestion =
                  t.aiReason?.decision?.question || `Approve ${t.subject}?`;
                const deadline = t.aiReason?.decision?.deadline || t.dueDate || null;
                const cachedDrafts = threadDetails[t._id || t.id]?.drafts;
                const hasDraft = cachedDrafts
                  ? cachedDrafts.some((d) => d.status === 'pending_client')
                  : Boolean(t.hasPendingDraft);

                return (
                  <div
                    key={t._id || t.id}
                    onClick={() => {
                      setSelectedThreadId(t._id || t.id);
                      if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        setShowMobileSheet(true);
                      }
                    }}
                    className={`p-4 sm:p-4.5 hover:bg-[#FAF8F5]/80 transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-[#FAF8F5] border-l-2 border-accent shadow-2xs'
                        : 'border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={senderName} size="sm" />

                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Top Line: Sender + Relative Time + Deadline Chip */}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-ink-800 truncate">
                            {senderName}
                          </span>
                          <span className="text-ink-400 font-mono text-[10px] flex-shrink-0">
                            {new Date(t.lastMessageAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>

                        {/* Decision Headline One-Liner */}
                        <h4
                          className={`text-xs font-semibold text-ink-900 leading-snug line-clamp-2 ${
                            isSelected ? 'text-accent font-bold' : ''
                          }`}
                        >
                          {decisionQuestion}
                        </h4>

                        {/* Bottom Tags: Due Chip + Tiny Draft Ready Marker */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          {deadline && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-accent bg-[#FDF2E9] px-2 py-0.5 rounded-full border border-amber-200/60">
                              <Clock className="h-2.5 w-2.5" />
                              <span>{deadline}</span>
                            </span>
                          )}

                          {hasDraft && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60">
                              <span>Draft ready</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight
                        className={`h-4 w-4 text-ink-300 group-hover:text-ink-700 transition self-center hidden sm:block ${
                          isSelected ? 'text-accent' : ''
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ========================================================= */}
        {/* ZONE 3: RIGHT PANE (DECISION SHEET + PINNED ACTION DOCK)  */}
        {/* ========================================================= */}
        <main
          className={`flex-1 min-w-0 min-h-0 bg-white md:bg-[#FAF8F5]/30 flex flex-col overflow-hidden ${
            showMobileSheet ? 'fixed inset-0 z-40 bg-white md:static' : 'hidden md:flex'
          }`}
        >
          {/* Mobile Sheet Close Bar + Prev/Next */}
          <div className="md:hidden flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-black/[0.08] bg-white gap-2">
            <button
              type="button"
              onClick={() => setShowMobileSheet(false)}
              className="flex items-center gap-1 text-xs font-semibold text-ink-700 hover:text-ink-900 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            {visibleList.length > 1 && (() => {
              const curIdx = visibleList.findIndex((t) => (t._id || t.id) === selectedThreadId);
              return (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={curIdx <= 0}
                    onClick={() => handleStepDecision(-1)}
                    className="p-1 rounded-full border border-black/[0.08] bg-[#FAF8F5] text-ink-700 disabled:opacity-35 cursor-pointer"
                    aria-label="Previous decision"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[11px] font-mono text-ink-500">
                    {curIdx >= 0 ? `${curIdx + 1}/${visibleList.length}` : ''}
                  </span>
                  <button
                    type="button"
                    disabled={curIdx === -1 || curIdx >= visibleList.length - 1}
                    onClick={() => handleStepDecision(1)}
                    className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full border border-black/[0.08] bg-[#FAF8F5] text-[11px] font-semibold text-ink-900 disabled:opacity-35 cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })()}
          </div>

          {/* Inline Action Completed + Undo Bar */}
          {lastClientAction && (
            <div className="px-4 sm:px-6 py-2 bg-emerald-50/95 border-b border-emerald-200/80 flex items-center justify-between gap-2 text-xs text-emerald-950 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span className="truncate font-medium">{lastClientAction.summary}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleUndoLastAction(lastClientAction)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-semibold text-[11px] transition cursor-pointer active:scale-95"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Undo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLastClientAction(null)}
                  className="p-1 rounded-full text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {selectedThread ? (
            <>
              {/* Desktop Queue Position + Prev / Next Strip */}
              {visibleList.length > 1 && (() => {
                const curIdx = visibleList.findIndex((t) => (t._id || t.id) === selectedThreadId);
                if (curIdx === -1) return null;
                return (
                  <div className="hidden md:flex items-center justify-between px-8 py-2.5 bg-white/80 border-b border-black/[0.06] text-xs text-ink-500 flex-shrink-0">
                    <span className="font-mono text-[11px]">
                      Decision {curIdx + 1} of {visibleList.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={curIdx <= 0}
                        onClick={() => handleStepDecision(-1)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF8F5] hover:bg-ink-100 border border-black/[0.08] text-ink-700 font-semibold text-[11px] transition cursor-pointer disabled:opacity-35"
                      >
                        <ChevronLeft className="h-3 w-3" />
                        <span>Prev</span>
                      </button>
                      <button
                        type="button"
                        disabled={curIdx >= visibleList.length - 1}
                        onClick={() => handleStepDecision(1)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF8F5] hover:bg-ink-100 border border-black/[0.08] text-ink-900 font-semibold text-[11px] transition cursor-pointer disabled:opacity-35"
                      >
                        <span>Next</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Independently Scrollable Decision Body */}
              <div
                ref={sheetScrollRef}
                className="flex-1 min-h-0 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8"
              >
                <div className="max-w-3xl mx-auto w-full space-y-6 animate-in fade-in duration-200 pb-4">
                  {/* Decision Header */}
                  <div className="space-y-2 border-b border-black/[0.06] pb-5">
                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-ink-500">
                      <div className="flex items-center gap-2">
                        <Avatar name={selectedThread.participants?.[0]?.name || 'Sender'} size="sm" />
                        <span className="font-semibold text-ink-800">
                          {selectedThread.participants?.[0]?.name || selectedThread.participants?.[0]?.email}
                        </span>
                      </div>

                      {selectedThread.aiReason?.decision?.deadline && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF2E9] text-accent font-semibold text-xs border border-amber-200/80">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Due: {selectedThread.aiReason.decision.deadline}</span>
                        </span>
                      )}
                    </div>

                    {/* Fraunces Headline */}
                    <h2 className="text-2xl sm:text-[28px] font-serif font-bold text-ink-900 tracking-tight leading-snug">
                      {selectedThread.aiReason?.decision?.question || selectedThread.subject}
                    </h2>

                    <p className="text-xs text-ink-500 font-medium">
                      Prepared by Maya with Daybook agents · Subject: <span className="text-ink-700">{selectedThread.subject}</span>
                    </p>
                  </div>

                  {/* "What's being asked" paragraph */}
                  <div className="space-y-1.5">
                    <h3 className="text-[11px] font-mono uppercase tracking-wider font-bold text-ink-500">
                      What's Being Asked
                    </h3>
                    <p className="text-sm text-ink-800 leading-relaxed font-normal">
                      {selectedThread.aiReason?.summary || selectedThread.snippet}
                    </p>
                  </div>

                  {/* Evidence Quote as a Quiet Blockquote */}
                  {selectedThread.aiReason?.evidence && (
                    <blockquote className="border-l-2 border-stone-300 pl-4 py-1.5 italic font-serif text-sm text-stone-700 bg-black/[0.015] rounded-r-xl">
                      "{selectedThread.aiReason.evidence}"
                    </blockquote>
                  )}

                  {/* Context Bullets */}
                  <div className="space-y-2 p-4 rounded-2xl bg-white border border-black/[0.08] shadow-2xs">
                    <h4 className="text-[11px] font-mono uppercase tracking-wider font-bold text-ink-500">
                      Key Context
                    </h4>
                    <ul className="text-xs text-ink-700 space-y-2 leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                        <span>
                          <strong className="text-ink-900 font-semibold">Why this reached you: </strong>
                          {selectedThread.aiReason?.reason || 'Requires personal executive signoff under delegation playbook.'}
                        </span>
                      </li>
                      {selectedThread.aiReason?.decision?.consequence && (
                        <li className="flex items-start gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-600 mt-1.5 flex-shrink-0" />
                          <span>
                            <strong className="text-amber-900 font-semibold">If you don't decide: </strong>
                            {selectedThread.aiReason.decision.consequence}
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Quick Decision Options (from AI Decision Brief) */}
                  {selectedThread.aiReason?.decision?.options?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-mono uppercase tracking-wider font-bold text-ink-500">
                        Quick Decision Paths
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedThread.aiReason.decision.options.map((opt) => {
                          const isMayaTask = opt.toLowerCase().includes('maya') || opt.toLowerCase().includes('schedule');
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                if (isMayaTask) {
                                  openComposer('handover', opt);
                                } else {
                                  openComposer('reply', `Decision: ${opt}. `);
                                }
                              }}
                              className="px-3.5 py-2 rounded-xl bg-white border border-black/[0.1] hover:border-accent/60 hover:bg-[#FDF2E9]/50 text-xs font-medium text-ink-800 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                            >
                              <ArrowRight className="h-3 w-3 text-accent" />
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Assistant's Prepared Draft (Editable Preview) */}
                  {currentDraft && (
                    <div className="p-5 rounded-2xl bg-[#F0FDFA] border border-teal-200/80 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 text-xs font-semibold text-teal-900">
                          <Sparkles className="h-4 w-4 text-teal-700" />
                          <span>Maya Prepared This Response For You</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-teal-800 bg-white px-2.5 py-0.5 rounded-full border border-teal-200/60">
                          Editable · 1-Tap Approval Ready
                        </span>
                      </div>

                      <textarea
                        rows={3}
                        value={
                          draftEdits[selectedThread._id] !== undefined
                            ? draftEdits[selectedThread._id]
                            : currentDraft.bodyText
                        }
                        onChange={(e) =>
                          setDraftEdits({
                            ...draftEdits,
                            [selectedThread._id]: e.target.value,
                          })
                        }
                        className="w-full text-xs text-teal-950 font-serif leading-relaxed bg-white/95 p-3.5 rounded-xl border border-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-400 select-text"
                      />
                    </div>
                  )}

                  {/* Expandable Original Conversation (Full Messages) */}
                  <div className="border border-black/[0.08] rounded-2xl bg-white overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setShowOriginalThread(!showOriginalThread)}
                      className="w-full p-4 flex items-center justify-between text-xs font-semibold text-ink-700 hover:text-ink-900 hover:bg-black/[0.02] transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-ink-400" />
                        <span>
                          Original Email Conversation
                          {currentDetail?.messages?.length
                            ? ` (${currentDetail.messages.length} message${currentDetail.messages.length === 1 ? '' : 's'})`
                            : ''}
                        </span>
                      </span>
                      {showOriginalThread ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {showOriginalThread && (
                      <div className="p-4 pt-3 border-t border-black/[0.06] text-xs space-y-3 text-ink-800 select-text">
                        {loadingDetails && !currentDetail ? (
                          <div className="text-ink-400 italic py-2">Loading full message thread...</div>
                        ) : currentDetail?.messages?.length > 0 ? (
                          currentDetail.messages.map((msg, idx) => (
                            <div
                              key={msg._id || msg.id || idx}
                              className="p-3.5 bg-[#FAF8F5] rounded-xl border border-black/[0.05] space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-[11px] text-ink-500">
                                <span className="font-semibold text-ink-900">
                                  {msg.from?.name || msg.from?.email || 'Sender'}
                                </span>
                                <span className="font-mono text-[10px]">
                                  {msg.date
                                    ? new Date(msg.date).toLocaleString([], {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : ''}
                                </span>
                              </div>
                              <p className="font-serif text-xs text-ink-800 leading-relaxed whitespace-pre-line">
                                {msg.bodyText || msg.snippet}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 bg-[#FAF8F5] rounded-xl border border-black/[0.04] font-serif leading-relaxed">
                            {selectedThread.snippet}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Handover to Maya Note Box */}
                  {isHandingOver && (
                    <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-amber-950">
                          Direction for Maya
                        </label>
                        <span className="text-[10px] font-mono text-amber-800">Moves to Maya's Assistant Queue</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'Decline politely and keep the door open',
                          'Schedule 30 mins next week',
                          'Ask for revised terms before I sign',
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setHandoverNote(preset)}
                            className="px-2.5 py-1 rounded-full bg-white border border-amber-200 text-[11px] font-medium text-amber-900 hover:bg-amber-100/60 transition cursor-pointer"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        autoFocus
                        value={handoverNote}
                        onChange={(e) => setHandoverNote(e.target.value)}
                        placeholder="Type your instruction for Maya..."
                        className="w-full px-3.5 py-2 text-xs bg-white border border-amber-300/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent font-medium select-text"
                      />
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsHandingOver(false)}
                          className="px-3 py-1.5 text-xs text-ink-500 hover:text-ink-900 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleExecuteDecision(selectedThread._id, 'hand_to_assistant', { note: handoverNote });
                            setIsHandingOver(false);
                            setHandoverNote('');
                          }}
                          className="px-4 py-1.5 rounded-full bg-ink-900 text-white text-xs font-semibold hover:bg-ink-800 transition active:scale-95 cursor-pointer"
                        >
                          Delegate to Maya
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Reply Myself Box */}
                  {isReplying && (
                    <div className="p-4 rounded-2xl bg-white border border-black/15 shadow-soft space-y-2.5 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-ink-900">
                          Your Direct Executive Reply
                        </label>
                        <span className="text-[10px] font-mono text-ink-500">
                          To: {selectedThread.participants?.[0]?.email || 'Sender'}
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        autoFocus
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your reply..."
                        className="w-full p-3 text-xs bg-[#FAF8F5]/50 border border-black/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-ink-900 font-serif select-text"
                      />
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] text-ink-400 font-mono">
                          Safe demo mode: send is simulated & logged
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsReplying(false)}
                            className="px-3 py-1.5 text-xs text-ink-500 hover:text-ink-900 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!replyText.trim()}
                            onClick={() => {
                              handleExecuteDecision(selectedThread._id, 'reply_direct', { note: replyText.trim() });
                              setIsReplying(false);
                              setReplyText('');
                            }}
                            className="px-4 py-1.5 rounded-full bg-ink-900 text-white text-xs font-semibold hover:bg-ink-800 disabled:opacity-40 transition active:scale-95 cursor-pointer"
                          >
                            Send Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PERMANENTLY PINNED BOTTOM ACTION DOCK (NEVER PUSHED OFF-SCREEN) */}
              <div className="flex-shrink-0 bg-white/95 backdrop-blur-md px-5 py-3.5 sm:px-8 border-t border-black/[0.08] shadow-soft z-20">
                <div className="max-w-3xl mx-auto w-full flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {currentDraft ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleExecuteDecision(selectedThread._id, 'approve', {
                              draftId: currentDraft._id,
                              customText: draftEdits[selectedThread._id],
                            })
                          }
                          className="px-5 py-2.5 rounded-full bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold flex items-center gap-2 shadow-soft transition active:scale-95 cursor-pointer"
                        >
                          <Check className="h-4 w-4" />
                          <span>Approve &amp; Send Draft</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openComposer('reply')}
                          className={`px-4 py-2.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                            isReplying
                              ? 'border-ink-900 bg-ink-900/5 text-ink-900'
                              : 'border-black/[0.1] bg-white hover:bg-ink-50 text-ink-800'
                          }`}
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Reply Myself</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openComposer('reply')}
                        className="px-5 py-2.5 rounded-full bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold flex items-center gap-2 shadow-soft transition active:scale-95 cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Reply Myself</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openComposer('handover')}
                      className={`px-4 py-2.5 rounded-full border text-xs font-semibold transition active:scale-95 flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                        isHandingOver
                          ? 'border-amber-400 bg-amber-50 text-amber-950'
                          : 'border-black/[0.1] bg-white hover:bg-ink-50 text-ink-800'
                      }`}
                    >
                      <UserCheck className="h-3.5 w-3.5 text-accent" />
                      <span>Hand to Maya</span>
                    </button>

                    {/* Snooze Dropdown Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setSnoozeMenuOpen(!snoozeMenuOpen)}
                        className="px-3.5 py-2.5 rounded-full border border-black/[0.08] hover:bg-ink-50 text-ink-600 hover:text-ink-900 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                      >
                        <Clock className="h-3 w-3" />
                        <span>Snooze</span>
                        <ChevronDown className="h-3 w-3" />
                      </button>

                      {snoozeMenuOpen && (
                        <div className="absolute bottom-full mb-2 left-0 w-40 bg-white border border-black/10 rounded-2xl shadow-xl p-1.5 space-y-0.5 text-xs z-30 animate-in fade-in">
                          <button
                            type="button"
                            onClick={() => {
                              setSnoozeMenuOpen(false);
                              handleExecuteDecision(selectedThread._id, 'snooze', { duration: '4h' });
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-ink-50 transition cursor-pointer"
                          >
                            4 hours
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSnoozeMenuOpen(false);
                              handleExecuteDecision(selectedThread._id, 'snooze', { duration: 'tomorrow' });
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-ink-50 transition cursor-pointer"
                          >
                            Tomorrow 9 AM
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSnoozeMenuOpen(false);
                              handleExecuteDecision(selectedThread._id, 'snooze', { duration: 'next_week' });
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-ink-50 transition cursor-pointer"
                          >
                            Next week
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExecuteDecision(selectedThread._id, 'handled')}
                    className="px-4 py-2.5 rounded-full text-xs font-medium text-ink-500 hover:text-ink-900 hover:bg-ink-100 transition cursor-pointer"
                  >
                    Mark Handled
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-ink-400 text-xs font-medium">
              Select any decision from the queue to view details and action options.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}