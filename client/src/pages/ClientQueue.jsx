import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { api } from '../lib/api.js';
import Avatar from '../components/Avatar.jsx';
import AccountMenu from '../components/AccountMenu.jsx';
import { DemoWorkspaceBanner } from '../components/DemoWorkspaceBanner.jsx';
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
  const [threadDetails, setThreadDetails] = useState({}); // cached threadId -> { messages, timeline, drafts }
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isHandingOver, setIsHandingOver] = useState(false);
  const [handoverNote, setHandoverNote] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showOriginalThread, setShowOriginalThread] = useState(false);
  const [draftEdits, setDraftEdits] = useState({}); // threadId -> edited draft text
  const [snoozeMenuOpen, setSnoozeMenuOpen] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date());

  // Optimistic tracking for 1-click Undo
  const lastActionRef = useRef(null);

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
    if (currentDetail?.drafts?.length > 0) {
      return currentDetail.drafts[0];
    }
    // Check if thread has predefined draft (e.g. th_10 TechCrunch speaker agreement)
    if (selectedThread?._id === 'th_10' || selectedThread?.id === 'th_10') {
      return {
        _id: 'draft_001',
        bodyText:
          'Hi Alex, Priya and I have confirmed the keynote terms with Fenwick. We look forward to the fireside chat!',
      };
    }
    return null;
  }, [currentDetail, selectedThread]);

  // Keyboard navigation & quick shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      // Ignore if focus is in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      const items =
        activeNav === 'today'
          ? activeDecisions
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
        if (selectedThread && typeof window !== 'undefined' && window.innerWidth < 1024) {
          setShowMobileSheet(true);
        }
      } else if (e.key === 'a' && selectedThread) {
        // 'a' = Approve draft
        e.preventDefault();
        handleExecuteDecision(selectedThread._id, 'approve', { draftId: currentDraft?._id });
      } else if (e.key === 'h' && selectedThread) {
        // 'h' = Hand to Maya
        e.preventDefault();
        setIsHandingOver(true);
      } else if (e.key === 's' && selectedThread) {
        // 's' = Snooze
        e.preventDefault();
        handleExecuteDecision(selectedThread._id, 'snooze');
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
    activeDecisions,
    categorized,
    waitingThreads,
    handledThreads,
    selectedThreadId,
    selectedThread,
    currentDraft,
  ]);

  // Execute decision action with Optimistic Updates & Undo capability
  async function handleExecuteDecision(threadId, action, extra = {}) {
    const threadToUpdate = threads.find((t) => (t._id || t.id) === threadId);
    if (!threadToUpdate) return;

    // Save previous state for Undo
    const previousState = { ...threadToUpdate };
    lastActionRef.current = { threadId, previousState, action };

    // Optimistically update local thread state
    setThreads((prev) =>
      prev.map((t) => {
        if ((t._id || t.id) === threadId) {
          return {
            ...t,
            clientStatus: action === 'approve' || action === 'handled' ? 'handled' : action,
            currentLabel: action === 'hand_to_assistant' ? 'ASSISTANT_TO_REPLY' : t.currentLabel,
          };
        }
        return t;
      })
    );

    // Pick next thread to select
    const remaining = activeDecisions.filter((t) => (t._id || t.id) !== threadId);
    if (remaining.length > 0) {
      setSelectedThreadId(remaining[0]._id || remaining[0].id);
    } else {
      setSelectedThreadId(null);
    }

    if (showMobileSheet) {
      setShowMobileSheet(false);
    }

    // Trigger toast with 5-second Undo action
    let successMsg = 'Marked as handled.';
    if (action === 'approve') successMsg = 'Draft approved! Maya notified in Assistant Workspace.';
    if (action === 'hand_to_assistant') successMsg = 'Handed to Maya with your instructions.';
    if (action === 'snooze') successMsg = 'Snoozed for 24 hours.';

    toast.success(successMsg, {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => handleUndoLastAction(),
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
      toast.error('Action failed: ' + err.message);
    }
  }

  // Reverse last optimistic action
  function handleUndoLastAction() {
    if (!lastActionRef.current) return;
    const { threadId, previousState } = lastActionRef.current;
    setThreads((prev) =>
      prev.map((t) => ((t._id || t.id) === threadId ? previousState : t))
    );
    setSelectedThreadId(threadId);
    toast.info('Action reversed.');
    lastActionRef.current = null;
  }

  // Greeting based on client time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = user?.name ? user.name.split(' ')[0] : 'Priya';
    if (hour < 12) return `Good morning, ${name}`;
    if (hour < 17) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  }, [user]);

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

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#111827] font-sans flex flex-col select-none antialiased">
      <DemoWorkspaceBanner />

      {/* 1. Minimal Editorial Header */}
      <header className="h-14 bg-white/90 backdrop-blur-md border-b border-black/[0.08] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 group hover:opacity-90 transition cursor-pointer"
            title="Daybook Mail — Return to home"
          >
            <div className="h-7 w-7 rounded-lg bg-ink-900 text-white flex items-center justify-center font-serif font-bold text-xs shadow-soft group-hover:scale-105 transition-transform">
              D
            </div>
            <span className="font-serif font-bold text-sm text-ink-900 tracking-tight hidden sm:inline">
              Daybook Mail
            </span>
          </Link>

          <div className="h-3.5 w-px bg-black/[0.1] hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-serif font-bold text-ink-900">
              {user?.name || 'Priya Sharma'}
            </span>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-accent border border-amber-200/60">
              Decision Desk
            </span>
          </div>
        </div>

        {/* Right: Live Sync Pill + Refresh + Account Menu */}
        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-ink-500 font-mono">
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

          <AccountMenu />
        </div>
      </header>

      {/* 2. Main Executive Workspace: 3-Zone Desktop Layout (max-w-[1440px]) */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto flex flex-col lg:flex-row overflow-hidden">
        {/* ========================================================= */}
        {/* ZONE 1: LEFT RAIL (~280px sticky)                         */}
        {/* ========================================================= */}
        <aside className="w-full lg:w-[280px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-black/[0.08] bg-[#FAF8F5] p-5 sm:p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Executive Greeting & Summary Sentence */}
            <div className="space-y-1.5">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-ink-900 tracking-tight leading-tight">
                {greeting}
              </h1>
              <p className="text-xs text-ink-600 leading-relaxed font-medium">
                {summarySentence}
              </p>
            </div>

            {/* Vertical Navigator with Counts (Replaces Pill Badges) */}
            <nav className="space-y-1 select-none" aria-label="Executive Queue Navigation">
              {[
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
              ].map((item) => {
                const isSelected = activeNav === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveNav(item.id);
                      if (item.id === 'today' && categorized.today[0]) {
                        setSelectedThreadId(categorized.today[0]._id || categorized.today[0].id);
                      } else if (item.id === 'week' && categorized.thisWeek[0]) {
                        setSelectedThreadId(categorized.thisWeek[0]._id || categorized.thisWeek[0].id);
                      } else if (item.id === 'later' && categorized.noDeadline[0]) {
                        setSelectedThreadId(categorized.noDeadline[0]._id || categorized.noDeadline[0].id);
                      } else if (item.id === 'waiting' && waitingThreads[0]) {
                        setSelectedThreadId(waitingThreads[0]._id || waitingThreads[0].id);
                      } else if (item.id === 'handled' && handledThreads[0]) {
                        setSelectedThreadId(handledThreads[0]._id || handledThreads[0].id);
                      }
                    }}
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
              Prepared by Maya with Daybook agents.
            </p>

            <div className="hidden lg:block text-[10px] text-ink-400 font-mono space-y-1">
              <div className="flex items-center justify-between">
                <span>j / k</span>
                <span>navigate</span>
              </div>
              <div className="flex items-center justify-between">
                <span>a · h · s · d</span>
                <span>approve · hand · snooze · done</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* ZONE 2: MIDDLE COLUMN (~420-480px scannable list)          */}
        {/* ========================================================= */}
        <section
          className={`w-full lg:w-[440px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-black/[0.08] bg-white flex flex-col ${
            showMobileSheet ? 'hidden lg:flex' : 'flex'
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
                      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
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
                const hasDraft = t._id === 'th_10' || t.agentSummary?.toLowerCase().includes('draft');

                return (
                  <div
                    key={t._id || t.id}
                    onClick={() => {
                      setSelectedThreadId(t._id || t.id);
                      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
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
        {/* ZONE 3: RIGHT PANE (DECISION SHEET — Remaining Width)     */}
        {/* ========================================================= */}
        <main
          className={`flex-1 bg-white lg:bg-[#FAF8F5]/30 flex flex-col overflow-y-auto ${
            showMobileSheet ? 'fixed inset-0 z-40 bg-white p-4 sm:p-6 lg:static lg:p-0' : 'hidden lg:flex'
          }`}
        >
          {/* Mobile Sheet Close Bar */}
          <div className="lg:hidden flex items-center justify-between pb-3 border-b border-black/[0.08] mb-4">
            <button
              onClick={() => setShowMobileSheet(false)}
              className="flex items-center gap-1 text-xs font-semibold text-ink-700 hover:text-ink-900"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Decisions</span>
            </button>
            <span className="text-xs font-mono font-bold uppercase text-accent">Decision Sheet</span>
          </div>

          {selectedThread ? (
            <div className="flex-1 flex flex-col justify-between max-w-3xl mx-auto w-full p-6 sm:p-10 space-y-8 animate-in fade-in duration-200">
              <div className="space-y-6">
                {/* Decision Header */}
                <div className="space-y-2 border-b border-black/[0.06] pb-5">
                  <div className="flex items-center justify-between text-xs text-ink-500">
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
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-ink-900 tracking-tight leading-snug">
                    {selectedThread.aiReason?.decision?.question || selectedThread.subject}
                  </h2>

                  <p className="text-xs text-ink-500 font-medium">
                    Prepared by Maya with Daybook agents.
                  </p>
                </div>

                {/* "What's being asked" paragraph */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-ink-500">
                    What's Being Asked
                  </h3>
                  <p className="text-sm text-ink-800 leading-relaxed font-normal">
                    {selectedThread.aiReason?.summary || selectedThread.snippet}
                  </p>
                </div>

                {/* Evidence Quote as a Quiet Blockquote */}
                {selectedThread.aiReason?.evidence && (
                  <blockquote className="border-l-2 border-stone-300 pl-4 py-1 italic font-serif text-sm text-stone-700 bg-black/[0.01] rounded-r-xl">
                    "{selectedThread.aiReason.evidence}"
                  </blockquote>
                )}

                {/* Context Bullets */}
                <div className="space-y-2 p-4.5 rounded-2xl bg-white border border-black/[0.08] shadow-2xs">
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

                {/* Assistant's Prepared Draft (Editable Preview) */}
                {currentDraft && (
                  <div className="p-5 rounded-2xl bg-[#F0FDFA] border border-teal-200/80 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-teal-900">
                        <Sparkles className="h-4 w-4 text-teal-700" />
                        <span>Maya Prepared This Response For You</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-teal-800 bg-white px-2.5 py-0.5 rounded-full border border-teal-200/60">
                        1-Tap Approval Ready
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

                {/* Expandable Original Conversation */}
                <div className="border border-black/[0.08] rounded-2xl bg-white overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setShowOriginalThread(!showOriginalThread)}
                    className="w-full p-4 flex items-center justify-between text-xs font-semibold text-ink-700 hover:text-ink-900 hover:bg-black/[0.02] transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-ink-400" />
                      <span>Original Email Conversation</span>
                    </span>
                    {showOriginalThread ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {showOriginalThread && (
                    <div className="p-4.5 pt-0 border-t border-black/[0.06] text-xs space-y-3 text-ink-800 font-serif leading-relaxed select-text">
                      <div className="text-[11px] font-mono text-ink-400 pb-1">
                        Subject: {selectedThread.subject}
                      </div>
                      <div className="p-3 bg-[#FAF8F5] rounded-xl border border-black/[0.04]">
                        {selectedThread.snippet}
                      </div>
                    </div>
                  )}
                </div>

                {/* Handover to Maya Note Box */}
                {isHandingOver && (
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2.5 animate-in fade-in">
                    <label className="block text-xs font-semibold text-amber-950">
                      Direction for Maya (e.g. "Decline politely and offer to sync next month")
                    </label>
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
                        className="px-3 py-1.5 text-xs text-ink-500 hover:text-ink-900"
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
                  <div className="p-4 rounded-2xl bg-ink-50 border border-black/10 space-y-2.5 animate-in fade-in">
                    <label className="block text-xs font-semibold text-ink-900">
                      Your Direct Executive Reply
                    </label>
                    <textarea
                      rows={3}
                      autoFocus
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response..."
                      className="w-full p-3 text-xs bg-white border border-black/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-ink-900 font-serif select-text"
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsReplying(false)}
                        className="px-3 py-1.5 text-xs text-ink-500 hover:text-ink-900"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleExecuteDecision(selectedThread._id, 'handled', { note: replyText });
                          setIsReplying(false);
                          setReplyText('');
                        }}
                        className="px-4 py-1.5 rounded-full bg-ink-900 text-white text-xs font-semibold hover:bg-ink-800 transition active:scale-95 cursor-pointer"
                      >
                        Send Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* STICKY BOTTOM ACTION BAR */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 -mx-6 -mb-6 sm:-mx-10 sm:-mb-10 border-t border-black/[0.08] flex items-center justify-between gap-2.5 shadow-soft z-20 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {currentDraft ? (
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
                      <span>Approve Maya's Draft</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsReplying(!isReplying)}
                      className="px-5 py-2.5 rounded-full bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold flex items-center gap-2 shadow-soft transition active:scale-95 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Reply Myself</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsHandingOver(!isHandingOver)}
                    className="px-4 py-2.5 rounded-full border border-black/[0.1] bg-white hover:bg-ink-50 text-ink-800 text-xs font-semibold transition active:scale-95 flex items-center gap-1.5 shadow-2xs cursor-pointer"
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
                      <div className="absolute bottom-full mb-2 left-0 w-36 bg-white border border-black/10 rounded-2xl shadow-xl p-1.5 space-y-0.5 text-xs z-30 animate-in fade-in">
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