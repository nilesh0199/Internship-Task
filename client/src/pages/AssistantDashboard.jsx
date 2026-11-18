import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { api } from '../lib/api.js';
import { ThreadRow } from '../components/ThreadRow.jsx';
import { AIReasonPanel } from '../components/AIReasonPanel.jsx';
import { DraftEditor } from '../components/DraftEditor.jsx';
import { CommandPaletteModal } from '../components/CommandPaletteModal.jsx';
import { PlaybookModal } from '../components/PlaybookModal.jsx';
import { ClientProfileModal } from '../components/ClientProfileModal.jsx';
import { ActivityLogDrawer } from '../components/ActivityLogDrawer.jsx';
import { ComposeEmailModal } from '../components/ComposeEmailModal.jsx';
import { SettingsModal } from '../components/SettingsModal.jsx';
import { LabelBadge } from '../components/LabelBadge.jsx';
import Avatar from '../components/Avatar.jsx';
import { DemoWorkspaceBanner } from '../components/DemoWorkspaceBanner.jsx';
import { AssistantTopBar } from '../components/AssistantTopBar.jsx';
import { AssistantTodayView } from './AssistantTodayView.jsx';
import { ClientAgentsTab } from '../components/ClientAgentsTab.jsx';
import {
  Inbox,
  UserCheck,
  CheckSquare,
  Clock,
  AlertTriangle,
  Calendar,
  Star,
  Archive,
  Search,
  Sliders,
  History,
  Mail,
  RefreshCw,
  Bell,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Bot,
  ArrowRight,
  ArrowLeft,
  PanelLeft,
  PenSquare,
  Settings,
  RotateCcw,
  CheckCircle2,
  Layers,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

export function AssistantDashboard({ initialOpenPlaybook = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Multi-client state
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  // Determine current active view from URL path
  const pathname = location.pathname;
  const isTodayView =
    pathname === '/assistant' ||
    pathname === '/assistant/' ||
    pathname === '/assistant/today';

  // Extract client ID and sub-section from /assistant/c/:clientId/:subSection
  const clientMatch = pathname.match(/\/assistant\/c\/([^/]+)(?:\/([^/]+))?/);
  const rawRouteId = clientMatch?.[1];
  const routeClientId = (rawRouteId && rawRouteId !== 'undefined' && rawRouteId !== 'null') ? rawRouteId : null;
  const subSection = clientMatch?.[2] || 'inbox'; // 'inbox' | 'agents' | 'playbook' | 'activity'

  // Load clients
  const loadClients = useCallback(async () => {
    try {
      const res = await api.get('/auth/clients');
      if (res.ok && res.data?.clients) {
        setClients(res.data.clients);
      }
    } catch (err) {
      // Keep existing
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Determine active client
  const activeClientId = useMemo(() => {
    if (routeClientId) return routeClientId;
    if (clients.length > 0) return clients[0]._id;
    return 'client_priya_001';
  }, [routeClientId, clients]);

  const activeClient = useMemo(() => {
    return (
      clients.find((c) => c._id === activeClientId) || {
        _id: activeClientId,
        name: activeClientId === 'client_rohan_002' ? 'Rohan Kapoor' : 'Priya Sharma',
        company: activeClientId === 'client_rohan_002' ? 'Apex Freight Logistics' : 'Vortex Dynamics',
        title: activeClientId === 'client_rohan_002' ? 'Chief Operating Officer' : 'Founder & CEO',
        email: activeClientId === 'client_rohan_002' ? 'rohan@apexlogistics.com' : 'priya@vortexdynamics.com',
      }
    );
  }, [clients, activeClientId]);

  // Active segment and thread selection from URL params
  const activeSegment = searchParams.get('segment') || 'all';
  const selectedThreadId = searchParams.get('threadId');

  const [threads, setThreads] = useState([]);
  const [selectedThreadData, setSelectedThreadData] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [counts, setCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  // Modals & Drawers
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isPlaybookOpen, setIsPlaybookOpen] = useState(initialOpenPlaybook);
  const [isClientProfileOpen, setIsClientProfileOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [lastCompletedAction, setLastCompletedAction] = useState(null); // { threadId, subject, summary, destination, previousState }
  const [collapsedMessages, setCollapsedMessages] = useState({});

  const segments = useMemo(
    () => [
      { id: 'all', label: 'All Inbox', icon: Inbox, count: counts.TOTAL },
      {
        id: 'client',
        label: `${activeClient.name.split(' ')[0]} to Reply`,
        icon: UserCheck,
        count: counts.CLIENT_TO_REPLY,
        color: 'text-label-client',
      },
      {
        id: 'assistant',
        label: 'Assistant Queue',
        icon: CheckSquare,
        count: counts.ASSISTANT_TO_REPLY,
        color: 'text-label-assistant',
      },
      { id: 'proposals', label: 'Agent Proposals', icon: Sparkles, count: 3, color: 'text-accent' },
      {
        id: 'no_reply',
        label: 'Quiet Folder',
        icon: Archive,
        count: counts.NO_REPLY_NEEDED,
        color: 'text-label-noReply',
      },
      { id: 'waiting', label: 'Waiting on Others', icon: Clock, count: counts.WAITING, color: 'text-amber-600' },
      {
        id: 'needs_review',
        label: 'Needs Review',
        icon: AlertTriangle,
        count: counts.NEEDS_REVIEW,
        color: 'text-label-review',
      },
      { id: 'meetings', label: 'Meetings Strip', icon: Calendar, count: counts.MEETINGS },
      { id: 'important', label: 'Important / VIP', icon: Star, count: 4, color: 'text-amber-500' },
      { id: 'archived', label: 'Archived', icon: Archive },
    ],
    [activeClient.name, counts]
  );

  const activeSegmentObj = useMemo(
    () => segments.find((s) => s.id === activeSegment) || segments[0],
    [segments, activeSegment]
  );

  useEffect(() => {
    setIsSidebarOpen(false);
    setIsAiPanelOpen(false);
  }, [activeClientId, subSection]);

  useEffect(() => {
    setIsAiPanelOpen(false);
  }, [selectedThreadId]);

  // "Remember for Agent" Modal State
  const [rememberModalData, setRememberModalData] = useState({
    open: false,
    text: '',
    agentId: 'triage',
  });

  // 1. Load threads & segment counts for current client
  const loadThreads = useCallback(
    async (isSilent = false) => {
      if (isTodayView) return;
      if (!isSilent) setLoadingList(true);
      try {
        const qParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
        const clientParam = `&clientId=${activeClientId}`;
        const res = await api.get(`/threads?segment=${activeSegment}${clientParam}${qParam}`);
        if (res.ok) {
          setThreads(res.data || []);
        }

        // Refresh segment counts for this specific client
        const allRes = await api.get(`/threads?segment=all${clientParam}`);
        if (allRes.ok) {
          const all = allRes.data || [];
          setCounts({
            TOTAL: all.length,
            CLIENT_TO_REPLY: all.filter((t) => t.currentLabel === 'CLIENT_TO_REPLY' && !t.isArchived).length,
            ASSISTANT_TO_REPLY: all.filter((t) => t.currentLabel === 'ASSISTANT_TO_REPLY' && !t.isArchived).length,
            NO_REPLY_NEEDED: all.filter((t) => t.currentLabel === 'NO_REPLY_NEEDED').length,
            NEEDS_REVIEW: all.filter((t) => t.currentLabel === 'NEEDS_REVIEW' && !t.isArchived).length,
            WAITING: all.filter((t) => t.isWaiting && !t.isArchived).length,
            MEETINGS: all.filter((t) => t.meetings?.length > 0).length,
            UNREAD: all.filter((t) => !t.isRead).length,
          });
        }
      } catch (err) {
        if (!isSilent) {
          toast.error('Failed to load threads: ' + err.message);
        }
      } finally {
        if (!isSilent) setLoadingList(false);
      }
    },
    [isTodayView, activeClientId, activeSegment, searchQuery]
  );

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Live polling every 8s
  useEffect(() => {
    const timer = setInterval(() => {
      loadThreads(true);
      loadClients();
    }, 8000);
    return () => clearInterval(timer);
  }, [loadThreads, loadClients]);

  // 2. Load detail when selectedThreadId changes
  useEffect(() => {
    if (!selectedThreadId || isTodayView) {
      setSelectedThreadData(null);
      return;
    }

    let isMounted = true;
    setLoadingDetail(true);

    api
      .get(`/threads/${selectedThreadId}`)
      .then((res) => {
        if (isMounted && res.ok) {
          setSelectedThreadData(res.data);
        }
      })
      .catch((err) => {
        if (isMounted) toast.error('Failed to load thread detail: ' + err.message);
      })
      .finally(() => {
        if (isMounted) setLoadingDetail(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedThreadId, isTodayView]);

  function handleSelectSegment(segmentId) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('segment', segmentId);
    nextParams.delete('threadId');
    setSearchParams(nextParams);
    setIsSidebarOpen(false);
  }

  function handleSelectThread(threadId) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('threadId', threadId);
    setSearchParams(nextParams);
    setIsSidebarOpen(false);
  }

  function handleClearThread() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('threadId');
    setSearchParams(nextParams);
    setIsAiPanelOpen(false);
  }

  function getAdjacentThreadId(currentId, direction = 1) {
    if (!threads || threads.length === 0) return null;
    const idx = threads.findIndex((t) => t._id === currentId);
    if (idx === -1) return threads[0]?._id || null;
    if (direction > 0) {
      if (idx + 1 < threads.length) return threads[idx + 1]._id;
      if (idx - 1 >= 0) return threads[idx - 1]._id;
      return null;
    }
    if (idx - 1 >= 0) return threads[idx - 1]._id;
    return null;
  }

  function handleStepThread(delta) {
    if (!threads || threads.length === 0) return;
    const idx = threads.findIndex((t) => t._id === selectedThreadId);
    if (idx === -1) {
      handleSelectThread(threads[0]._id);
      return;
    }
    const nextIdx = idx + delta;
    if (nextIdx >= 0 && nextIdx < threads.length) {
      handleSelectThread(threads[nextIdx]._id);
    }
  }

  async function handleUndoLastAction(actionRecord = lastCompletedAction) {
    if (!actionRecord?.threadId || !actionRecord?.previousState) return;
    try {
      await api.patch(`/threads/${actionRecord.threadId}`, actionRecord.previousState);
      setLastCompletedAction(null);
      await loadThreads(true);
      await loadClients();
      handleSelectThread(actionRecord.threadId);
      toast.info(`Undone: "${actionRecord.subject}" restored.`);
    } catch (err) {
      toast.error('Failed to undo action: ' + err.message);
    }
  }

  async function handleDraftActionComplete({ action, thread, previousState, simulated }) {
    const targetSubject = thread?.subject || selectedThreadData?.thread?.subject || 'Email';
    const completedId = thread?._id || selectedThreadId;
    const nextId = getAdjacentThreadId(completedId, 1);
    const clientFirst = activeClient.name.split(' ')[0];

    const summary =
      action === 'request_approval'
        ? `Sent "${targetSubject}" to ${clientFirst}'s Decision Desk`
        : simulated
        ? `Sent reply & moved to Waiting on Others (simulated)`
        : `Sent reply & moved to Waiting on Others`;

    const record = {
      threadId: completedId,
      subject: targetSubject,
      summary,
      destination: action === 'request_approval' ? `${clientFirst} to Reply` : 'Waiting on Others',
      previousState,
    };
    setLastCompletedAction(record);

    // Refresh list & badge counts cleanly
    await Promise.all([loadThreads(true), loadClients()]);

    // Auto-advance to the next email in queue (or clear if queue is done)
    if (nextId && nextId !== completedId) {
      handleSelectThread(nextId);
    } else {
      handleClearThread();
    }

    toast.success(summary, {
      duration: 6000,
      action: previousState
        ? {
            label: 'Undo',
            onClick: () => handleUndoLastAction(record),
          }
        : undefined,
    });
  }

  async function handleToggleRead(thread) {
    try {
      await api.patch(`/threads/${thread._id}`, { isRead: !thread.isRead });
      loadThreads();
      if (selectedThreadData?.thread?._id === thread._id) {
        setSelectedThreadData((prev) => ({
          ...prev,
          thread: { ...prev.thread, isRead: !thread.isRead },
        }));
      }
    } catch (err) {
      toast.error('Failed to update read state: ' + err.message);
    }
  }

  async function handleToggleArchive(thread) {
    try {
      const nextArchived = !thread.isArchived;
      const previousState = { isArchived: Boolean(thread.isArchived) };
      const nextId = selectedThreadId === thread._id ? getAdjacentThreadId(thread._id, 1) : null;

      await api.patch(`/threads/${thread._id}`, { isArchived: nextArchived });

      const record = {
        threadId: thread._id,
        subject: thread.subject,
        summary: nextArchived ? `Archived "${thread.subject}"` : `Restored "${thread.subject}" to inbox`,
        destination: nextArchived ? 'Archived' : 'All Inbox',
        previousState,
      };
      setLastCompletedAction(record);

      await Promise.all([loadThreads(true), loadClients()]);
      if (selectedThreadId === thread._id) {
        if (nextId && nextId !== thread._id) {
          handleSelectThread(nextId);
        } else {
          handleClearThread();
        }
      }

      toast.success(nextArchived ? 'Thread moved to Archived' : 'Thread unarchived', {
        duration: 6000,
        action: {
          label: 'Undo',
          onClick: () => handleUndoLastAction(record),
        },
      });
    } catch (err) {
      toast.error('Failed to archive thread: ' + err.message);
    }
  }

  async function handleSendNudge(thread) {
    try {
      toast.success(`Nudge dispatched to ${activeClient.name} for "${thread.subject}"!`);
      await api.post(`/threads/${thread._id}/client-decision`, {
        action: 'nudge_sent',
        note: `Maya sent a gentle reminder to ${activeClient.name}`,
      });
    } catch (err) {
      toast.error('Nudge failed: ' + err.message);
    }
  }

  function handlePromptRememberNote(thread, newLabel) {
    setRememberModalData({
      open: true,
      agentId: 'triage',
      text: `When messages discuss "${thread.subject}", route as ${newLabel}`,
    });
  }

  async function handleSaveRememberMemory() {
    try {
      await api.post(
        `/agents/${rememberModalData.agentId}/memories?clientId=${activeClientId}`,
        {
          text: rememberModalData.text,
          source: 'learned',
          pinned: true,
        }
      );
      toast.success(`Saved to ${rememberModalData.agentId} agent memory for ${activeClient.name}!`);
      setRememberModalData({ open: false, text: '', agentId: 'triage' });
    } catch (err) {
      toast.error('Failed to save memory: ' + err.message);
    }
  }

  // Global Command Palette Shortcut (works across Today View, Inbox, Agents, etc.)
  useEffect(() => {
    function handleGlobalShortcut(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleGlobalShortcut);
    return () => window.removeEventListener('keydown', handleGlobalShortcut);
  }, []);

  // Keyboard Shortcuts (when in inbox)
  useEffect(() => {
    if (isTodayView || subSection !== 'inbox') return;

    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const currentIndex = threads.findIndex((t) => t._id === selectedThreadId);

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = Math.min(currentIndex + 1, threads.length - 1);
        if (threads[nextIdx]) handleSelectThread(threads[nextIdx]._id);
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = Math.max(currentIndex - 1, 0);
        if (threads[prevIdx]) handleSelectThread(threads[prevIdx]._id);
      } else if (e.key === 'c' && selectedThreadId) {
        api
          .post(`/threads/${selectedThreadId}/override`, { newLabel: 'CLIENT_TO_REPLY' })
          .then(() => {
            loadThreads();
            toast.success('Reclassified to Client to Reply', {
              action: {
                label: 'Remember for Agent?',
                onClick: () => {
                  const target = threads.find((t) => t._id === selectedThreadId);
                  if (target) handlePromptRememberNote(target, 'CLIENT_TO_REPLY');
                },
              },
            });
          });
      } else if (e.key === 'a' && selectedThreadId) {
        api
          .post(`/threads/${selectedThreadId}/override`, { newLabel: 'ASSISTANT_TO_REPLY' })
          .then(() => {
            loadThreads();
            toast.success('Reclassified to Assistant to Reply', {
              action: {
                label: 'Remember for Agent?',
                onClick: () => {
                  const target = threads.find((t) => t._id === selectedThreadId);
                  if (target) handlePromptRememberNote(target, 'ASSISTANT_TO_REPLY');
                },
              },
            });
          });
      } else if (e.key === 'n' && selectedThreadId) {
        api
          .post(`/threads/${selectedThreadId}/override`, { newLabel: 'NO_REPLY_NEEDED' })
          .then(() => {
            loadThreads();
            toast.success('Moved to Quiet Folder');
          });
      } else if (e.key === 'e' && selectedThreadId) {
        const target = threads.find((t) => t._id === selectedThreadId);
        if (target) handleToggleArchive(target);
      } else if (e.key === '/') {
        e.preventDefault();
        document.getElementById('thread-search-input')?.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [threads, selectedThreadId, loadThreads, isTodayView, subSection]);

  const conflicts = threads.flatMap((t) => t.meetings?.filter((m) => m.isConflict) || []);

  function renderSidebarContent(isDrawer = false) {
    return (
      <>
        {isDrawer && (
          <div className="px-3.5 py-3 bg-white border-b border-black/[0.06] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 text-xs font-serif font-bold text-ink-900">
              <PanelLeft className="h-3.5 w-3.5 text-accent" />
              <span>Folders & Side Options</span>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-full text-ink-500 hover:text-ink-900 hover:bg-ink-100 transition cursor-pointer"
              aria-label="Close side options"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Client Profile Card in Sidebar */}
        <button
          type="button"
          onClick={() => {
            setIsSidebarOpen(false);
            setIsClientProfileOpen(true);
          }}
          className="m-3 mb-2 p-3.5 rounded-2xl bg-white border border-black/[0.05] shadow-card hover:border-black/15 transition-all text-left group cursor-pointer active:scale-98 flex-shrink-0"
          title={`Manage ${activeClient.name}'s Profile & Invitation`}
        >
          <div className="flex items-center gap-2.5">
            <Avatar name={activeClient.name} email={activeClient.email} size="md" />
            <div className="truncate flex-1">
              <div className="text-xs font-bold text-ink-900 truncate tracking-tight group-hover:text-accent transition-colors flex items-center justify-between">
                <span>{activeClient.name}</span>
                <span className="text-[10px] text-accent font-medium font-mono hidden group-hover:inline">
                  Profile →
                </span>
              </div>
              <div className="text-[11px] text-ink-500 truncate">{activeClient.title}</div>
            </div>
          </div>
        </button>

        {/* Compose New Email CTA in Sidebar */}
        <div className="px-3 pb-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsSidebarOpen(false);
              setIsComposeOpen(true);
            }}
            className="w-full py-2 px-3 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-soft transition active:scale-[0.98] cursor-pointer"
          >
            <PenSquare className="h-3.5 w-3.5" />
            <span>Compose Email</span>
          </button>
        </div>

        {/* Segments Navigation List */}
        <nav className="flex-1 overflow-y-auto app-pane-scroll px-2.5 py-1 space-y-1 text-xs">
          {segments.map((seg) => {
            const Icon = seg.icon;
            const isActive = activeSegment === seg.id;
            return (
              <button
                key={seg.id}
                onClick={() => handleSelectSegment(seg.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-150 cursor-pointer text-left active:scale-[0.99] ${
                  isActive
                    ? 'bg-ink-900 font-semibold text-white shadow-soft'
                    : 'text-ink-700 hover:bg-white hover:text-ink-900 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : seg.color || 'text-ink-500'}`} />
                  <span className="truncate tracking-tight">{seg.label}</span>
                </div>
                {typeof seg.count === 'number' && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-600'
                    }`}
                  >
                    {seg.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Agent Control Room Shortcut */}
        <div className="p-3 mx-2.5 mb-2 rounded-2xl bg-gradient-to-br from-white to-amber-50/40 border border-black/[0.06] shadow-xs space-y-1.5 flex-shrink-0">
          <div className="flex items-center justify-between text-xs font-serif font-bold text-ink-900">
            <div className="flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-accent" />
              <span>{activeClient.name.split(' ')[0]}'s Agents</span>
            </div>
          </div>
          <button
            onClick={() => {
              setIsSidebarOpen(false);
              navigate(`/assistant/c/${activeClientId}/agents`);
            }}
            className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-[11px] font-semibold transition active:scale-[0.98] cursor-pointer"
          >
            <span>Tune Agent Notes</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#FAF8F5] text-ink-900 font-sans overflow-hidden">
      <DemoWorkspaceBanner />

      {/* Persistent Assistant Top Bar with Workspace Tabs */}
      <AssistantTopBar
        clients={clients}
        activeClientId={isTodayView ? null : activeClientId}
        activeTab={isTodayView ? 'today' : activeClientId}
        onClientsChanged={loadClients}
      />

      {/* TODAY COMMAND CENTER VIEW */}
      {isTodayView ? (
        <div className="flex-1 overflow-y-auto app-pane-scroll min-h-0">
          <AssistantTodayView
            onJumpToThread={(cId, tId) => {
              navigate(`/assistant/c/${cId}/inbox?threadId=${tId}`);
            }}
            onCompose={() => setIsComposeOpen(true)}
          />
        </div>
      ) : (
        /* PER-CLIENT WORKSPACE */
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Client Sub-Navigation Bar */}
          <div className="h-11 bg-white border-b border-black/[0.06] px-2.5 sm:px-5 flex items-center justify-between gap-2 flex-shrink-0 z-10 select-none">
            {/* Left: Side-Options Toggle Tag (< lg, always visible & fixed) + Desktop/Tablet Sub-nav Links (hidden on mobile < md where fixed bottom bar lives) */}
            <div className="flex items-center gap-1.5 min-w-0">
              {subSection === 'inbox' ? (
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen((v) => !v)}
                  className="lg:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300/70 text-amber-950 text-xs font-semibold whitespace-nowrap flex-shrink-0 transition cursor-pointer active:scale-95"
                  title="Toggle side options & folders"
                  aria-label="Toggle side options"
                  aria-expanded={isSidebarOpen}
                >
                  <PanelLeft className="h-3.5 w-3.5 text-amber-800 flex-shrink-0" />
                  <span>{activeSegmentObj.label}</span>
                  {typeof activeSegmentObj.count === 'number' && (
                    <span className="text-[10px] font-mono bg-amber-200/80 text-amber-950 px-1.5 rounded-full">
                      {activeSegmentObj.count}
                    </span>
                  )}
                </button>
              ) : (
                <span className="md:hidden text-xs font-serif font-bold text-ink-900 truncate">
                  {activeClient.name.split(' ')[0]}'s Agents
                </span>
              )}

              <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => navigate(`/assistant/c/${activeClientId}/inbox`)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0 transition cursor-pointer ${
                    subSection === 'inbox'
                      ? 'bg-ink-900 text-white shadow-xs'
                      : 'text-ink-600 hover:text-ink-900 hover:bg-ink-50'
                  }`}
                >
                  <Inbox className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Inbox</span>
                </button>

                <button
                  onClick={() => navigate(`/assistant/c/${activeClientId}/agents`)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0 transition cursor-pointer ${
                    subSection === 'agents'
                      ? 'bg-ink-900 text-white shadow-xs'
                      : 'text-ink-600 hover:text-ink-900 hover:bg-ink-50'
                  }`}
                >
                  <Bot className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Agents</span>
                </button>

                <button
                  onClick={() => setIsPlaybookOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-ink-600 hover:text-ink-900 hover:bg-ink-50 whitespace-nowrap flex-shrink-0 transition cursor-pointer"
                >
                  <Sliders className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                  <span>Playbook</span>
                </button>

                <button
                  onClick={() => setIsActivityOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-ink-600 hover:text-ink-900 hover:bg-ink-50 whitespace-nowrap flex-shrink-0 transition cursor-pointer"
                >
                  <History className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Activity</span>
                </button>
              </div>
            </div>

            {/* Right: Compose Email + Ask AI Trigger + Client Context Pill */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 text-xs flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsComposeOpen(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-ink-900 hover:bg-ink-800 text-white font-semibold whitespace-nowrap flex-shrink-0 transition shadow-2xs cursor-pointer active:scale-95"
                title={`Compose a new email for ${activeClient.name}`}
              >
                <PenSquare className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Compose</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-[#FAF8F5] hover:bg-ink-100 border border-black/[0.08] text-ink-700 hover:text-ink-900 font-medium whitespace-nowrap flex-shrink-0 transition cursor-pointer"
                title="Open AI Command Palette (Ctrl+K)"
                aria-label="Ask AI"
              >
                <Sparkles className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                <span className="hidden sm:inline">Ask AI</span>
                <kbd className="hidden lg:inline text-[10px] font-mono text-ink-500 bg-white px-1.5 py-0.2 rounded border border-black/[0.08]">
                  Ctrl+K
                </kbd>
              </button>

              <div className="hidden md:flex items-center gap-1.5 min-w-0">
                <span className="text-ink-400 hidden lg:inline flex-shrink-0">Managing:</span>
                <button
                  onClick={() => setIsClientProfileOpen(true)}
                  className="font-bold text-ink-900 hover:text-accent transition flex items-center gap-1 cursor-pointer min-w-0"
                  title={`${activeClient.name} (${activeClient.company})`}
                >
                  <span className="truncate">{activeClient.name}</span>
                  <span className="text-ink-400 font-normal hidden xl:inline truncate max-w-[180px]">
                    ({activeClient.company})
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Render Agents Tab if selected */}
          {subSection === 'agents' ? (
            <div className="flex-1 overflow-y-auto app-pane-scroll bg-[#FAF8F5]">
              <ClientAgentsTab clientId={activeClientId} clientName={activeClient.name} />
            </div>
          ) : (
            /* RESPONSIVE 3-PANE (lg+) / 2-PANE (md) / 1-PANE (< md) INBOX */
            <div className="flex-1 flex overflow-hidden min-h-0 relative">
              {/* PANE 1 (Desktop >= lg): Persistent Side Options Sidebar */}
              <aside className="hidden lg:flex w-56 xl:w-60 bg-[#FAF8F5] border-r border-borderMuted/70 flex-col flex-shrink-0 select-none">
                {renderSidebarContent(false)}
              </aside>

              {/* PANE 1 (Mobile & Tablet < lg): Slide-Over Side Options Drawer */}
              {isSidebarOpen && (
                <div
                  className="fixed inset-0 z-50 lg:hidden bg-black/40 backdrop-blur-[1px] flex"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <aside
                    onClick={(e) => e.stopPropagation()}
                    className="w-72 max-w-[85vw] h-full bg-[#FAF8F5] border-r border-borderMuted shadow-2xl flex flex-col select-none animate-in slide-in-from-left duration-150"
                  >
                    {renderSidebarContent(true)}
                  </aside>
                </div>
              )}

              {/* PANE 2: Thread List (Full-width on mobile when no thread selected; hidden on mobile when reading an email) */}
              <section
                className={`${
                  selectedThreadId ? 'hidden md:flex' : 'flex'
                } w-full md:w-72 lg:w-80 2xl:w-96 bg-white border-r border-borderMuted/70 flex-col flex-shrink-0 select-none min-h-0`}
              >
                {/* Search Bar */}
                <div className="p-2.5 sm:p-3 border-b border-borderMuted/70 flex-shrink-0">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-ink-400 absolute left-3 top-2.5" />
                    <input
                      id="thread-search-input"
                      type="text"
                      placeholder={`Search ${activeClient.name.split(' ')[0]}'s inbox...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#FAF8F5] border border-black/5 focus:bg-white focus:border-accent outline-none font-sans"
                    />
                  </div>
                </div>

                {/* Threads Scroll List */}
                <div className="flex-1 overflow-y-auto app-pane-scroll divide-y divide-black/[0.05]">
                  {loadingList ? (
                    <div className="p-8 text-center text-xs text-ink-400 space-y-2">
                      <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                      <p>Loading {activeClient.name.split(' ')[0]}'s threads...</p>
                    </div>
                  ) : threads.length === 0 ? (
                    <div className="p-8 text-center text-xs text-ink-500">
                      No threads found in this segment for {activeClient.name}.
                    </div>
                  ) : (
                    threads.map((thread) => (
                      <ThreadRow
                        key={thread._id}
                        thread={thread}
                        isSelected={thread._id === selectedThreadId}
                        onClick={() => handleSelectThread(thread._id)}
                        onToggleRead={() => handleToggleRead(thread)}
                        onToggleArchive={() => handleToggleArchive(thread)}
                      />
                    ))
                  )}
                </div>
              </section>

              {/* PANE 3: Thread Detail & AI Panel (Full-width on mobile when thread selected) */}
              <main
                className={`${
                  selectedThreadId ? 'flex' : 'hidden md:flex'
                } flex-1 min-w-0 bg-[#FAF8F5] flex-col overflow-hidden min-h-0`}
              >
                {/* Inline Undo / Action Completed Strip */}
                {lastCompletedAction && (
                  <div className="px-3 sm:px-5 py-2 bg-emerald-50/95 border-b border-emerald-200/80 flex items-center justify-between gap-2 text-xs text-emerald-950 flex-shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <span className="truncate font-medium">{lastCompletedAction.summary}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {lastCompletedAction.previousState && (
                        <button
                          type="button"
                          onClick={() => handleUndoLastAction()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-semibold text-[11px] transition cursor-pointer active:scale-95"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Undo</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setLastCompletedAction(null)}
                        className="p-1 rounded-full text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                        aria-label="Dismiss notification"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {!selectedThreadId ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
                    <div className="h-12 w-12 rounded-2xl bg-white shadow-soft border border-borderMuted/80 flex items-center justify-center text-ink-400 mb-3">
                      <Mail className="h-6 w-6 stroke-[1.5]" />
                    </div>
                    <h3 className="text-base font-serif font-bold text-ink-800">
                      {threads.length === 0 ? 'Queue Clear!' : 'Select a conversation'}
                    </h3>
                    <p className="text-xs text-ink-500 max-w-sm mt-1">
                      {threads.length === 0
                        ? `All conversations in this view for ${activeClient.name} are handled.`
                        : `Choose any thread from ${activeClient.name}'s queue or use keyboard shortcuts (j/k) to navigate.`}
                    </p>
                  </div>
                ) : loadingDetail || !selectedThreadData ? (
                  <div className="flex-1 flex flex-col">
                    <div className="md:hidden px-3 py-2 bg-white border-b border-black/[0.06] flex items-center">
                      <button
                        type="button"
                        onClick={handleClearThread}
                        className="flex items-center gap-1.5 text-xs font-semibold text-ink-700 hover:text-ink-900 cursor-pointer"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Back to Inbox</span>
                      </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center text-xs text-ink-400">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        <span>Loading conversation...</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col xl:flex-row overflow-hidden min-h-0">
                    {/* Mobile & Tablet (< xl) Thread Toolbar: Back + Prev/Next + AI Analysis Drawer Toggle */}
                    <div className="xl:hidden px-3 py-2 bg-white border-b border-black/[0.06] flex items-center justify-between gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          type="button"
                          onClick={handleClearThread}
                          className="md:hidden flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF8F5] hover:bg-ink-100 border border-black/[0.08] text-xs font-semibold text-ink-800 flex-shrink-0 cursor-pointer active:scale-95"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                          <span>Back</span>
                        </button>
                        {threads.length > 1 && (() => {
                          const curIdx = threads.findIndex((t) => t._id === selectedThreadId);
                          return (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                disabled={curIdx <= 0}
                                onClick={() => handleStepThread(-1)}
                                className="p-1 rounded-full border border-black/[0.08] bg-[#FAF8F5] hover:bg-ink-100 text-ink-700 disabled:opacity-35 cursor-pointer"
                                title="Previous email (k)"
                                aria-label="Previous email"
                              >
                                <ArrowLeft className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={curIdx === -1 || curIdx >= threads.length - 1}
                                onClick={() => handleStepThread(1)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-black/[0.08] bg-[#FAF8F5] hover:bg-ink-100 text-[11px] font-semibold text-ink-800 disabled:opacity-35 cursor-pointer"
                                title="Next email (j)"
                              >
                                <span>Next</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })()}
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsAiPanelOpen(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold whitespace-nowrap flex-shrink-0 transition cursor-pointer active:scale-95"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                        <span className="hidden sm:inline">AI Analysis &amp; Override</span>
                        <span className="sm:hidden">AI Info</span>
                      </button>
                    </div>

                    {/* Thread Reading & Action Pane */}
                    <div className="flex-1 min-w-0 overflow-y-auto app-pane-scroll p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-5">
                      {/* Desktop Queue Stepper (Prev / Next Email) */}
                      {threads.length > 1 && (() => {
                        const curIdx = threads.findIndex((t) => t._id === selectedThreadId);
                        if (curIdx === -1) return null;
                        return (
                          <div className="hidden xl:flex items-center justify-between text-xs text-ink-500">
                            <span className="font-mono text-[11px]">
                              Email {curIdx + 1} of {threads.length} in {activeSegmentObj.label}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={curIdx <= 0}
                                onClick={() => handleStepThread(-1)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-ink-50 border border-black/[0.08] text-ink-700 font-semibold text-[11px] transition cursor-pointer disabled:opacity-35"
                              >
                                <ArrowLeft className="h-3 w-3" />
                                <span>Prev</span>
                              </button>
                              <button
                                type="button"
                                disabled={curIdx >= threads.length - 1}
                                onClick={() => handleStepThread(1)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-ink-50 border border-black/[0.08] text-ink-900 font-semibold text-[11px] transition cursor-pointer disabled:opacity-35"
                              >
                                <span>Next Email</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Thread Header */}
                      <div className="bg-white rounded-2xl border border-borderMuted/70 p-3.5 sm:p-5 shadow-card space-y-3">
                        <div className="flex items-start justify-between gap-2.5 flex-wrap">
                          <h2 className="font-serif font-bold text-base sm:text-xl text-ink-900 tracking-tight leading-snug break-words min-w-0 flex-1">
                            {selectedThreadData.thread.subject}
                          </h2>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <LabelBadge label={selectedThreadData.thread.currentLabel} />
                            <button
                              onClick={() => handleToggleArchive(selectedThreadData.thread)}
                              className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500 transition cursor-pointer"
                              title="Archive Thread"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Participants Row & Aging Nudge */}
                        <div className="flex items-center justify-between text-xs text-ink-500 flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className="text-ink-400">Participants:</span>
                            <span className="text-ink-900 font-semibold break-words">
                              {(selectedThreadData.thread.participants || [])
                                .map((p) => p.name || p.email)
                                .join(', ')}
                            </span>
                          </div>

                          {selectedThreadData.thread.currentLabel === 'CLIENT_TO_REPLY' && (
                            <button
                              onClick={() => handleSendNudge(selectedThreadData.thread)}
                              className="text-xs px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 font-semibold hover:bg-amber-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                            >
                              <Bell className="h-3 w-3 text-amber-700" />
                              <span>Send Nudge to {activeClient.name.split(' ')[0]}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Messages Stream */}
                      <div className="space-y-3 sm:space-y-4">
                        {(selectedThreadData.messages || []).map((msg, idx) => {
                          const isCollapsed = !!collapsedMessages[msg._id];
                          const isLast = idx === selectedThreadData.messages.length - 1;
                          return (
                            <div
                              key={msg._id}
                              className={`rounded-2xl border transition-all ${
                                isLast
                                  ? 'border-black/[0.06] bg-white shadow-card'
                                  : 'border-borderMuted/60 bg-ink-50/50'
                              }`}
                            >
                              <div
                                onClick={() =>
                                  setCollapsedMessages((prev) => ({
                                    ...prev,
                                    [msg._id]: !isCollapsed,
                                  }))
                                }
                                className="p-3 sm:p-4 flex items-center justify-between gap-2 cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                                  <div className="h-8 w-8 rounded-full bg-ink-100 text-ink-800 font-bold text-xs flex items-center justify-center flex-shrink-0 ring-2 ring-white">
                                    {(msg.from?.name || msg.from?.email || 'U')[0].toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline gap-1.5 flex-wrap">
                                      <span className="text-xs font-bold text-ink-900 tracking-tight truncate">
                                        {msg.from?.name || msg.from?.email}
                                      </span>
                                      <span className="text-[11px] text-ink-400 truncate">
                                        to {msg.to?.[0]?.name || msg.to?.[0]?.email || activeClient.name.split(' ')[0]}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 text-xs text-ink-400 flex-shrink-0">
                                  <span className="text-[10px] sm:text-[11px] font-mono">
                                    {(() => {
                                      const rawDate = msg.date || msg.receivedAt || msg.sentAt || msg.createdAt;
                                      const parsed = rawDate ? new Date(rawDate) : null;
                                      return parsed && !Number.isNaN(parsed.getTime())
                                        ? parsed.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                        : 'Just now';
                                    })()}
                                  </span>
                                  {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                                </div>
                              </div>

                              {!isCollapsed && (
                                <div className="px-3.5 sm:px-5 pb-4 sm:pb-5 pt-2 text-xs text-ink-800 leading-relaxed border-t border-borderMuted/30 whitespace-pre-wrap break-words font-sans">
                                  {msg.bodyText || msg.snippet}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Assistant Draft Composer Area */}
                      <div className="pt-1 pb-4">
                        <DraftEditor
                          thread={selectedThreadData.thread}
                          existingDraft={selectedThreadData.drafts?.[0]}
                          clientName={activeClient.name}
                          onDraftUpdated={(updated) => {
                            setSelectedThreadData((prev) => ({
                              ...prev,
                              drafts: [updated],
                            }));
                          }}
                          onActionComplete={handleDraftActionComplete}
                        />
                      </div>
                    </div>

                    {/* AI Reasoning Inspector Column (Desktop >= xl) */}
                    <div className="hidden xl:block w-72 2xl:w-80 border-l border-borderMuted/70 flex-shrink-0">
                      <AIReasonPanel
                        thread={selectedThreadData.thread}
                        timeline={selectedThreadData.timeline || []}
                        onThreadUpdated={(updated) => {
                          setSelectedThreadData((prev) => ({
                            ...prev,
                            thread: updated,
                          }));
                          loadThreads();
                          toast.success('Classification updated', {
                            action: {
                              label: 'Remember for Agent?',
                              onClick: () => handlePromptRememberNote(updated, updated.currentLabel),
                            },
                          });
                        }}
                        onOpenPlaybook={() => setIsPlaybookOpen(true)}
                      />
                    </div>

                    {/* AI Reasoning Inspector Slide-Over Drawer (Mobile & Tablet < xl) */}
                    {isAiPanelOpen && (
                      <div
                        className="fixed inset-0 z-50 xl:hidden bg-black/40 backdrop-blur-[1px] flex justify-end"
                        onClick={() => setIsAiPanelOpen(false)}
                      >
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="w-[90vw] max-w-sm h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-150"
                        >
                          <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between flex-shrink-0 bg-[#FAF8F5]">
                            <div className="flex items-center gap-2 text-xs font-serif font-bold text-ink-900">
                              <Sparkles className="h-3.5 w-3.5 text-accent" />
                              <span>AI Analysis & Override</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsAiPanelOpen(false)}
                              className="p-1.5 rounded-full text-ink-500 hover:text-ink-900 hover:bg-ink-100 transition cursor-pointer"
                              aria-label="Close AI analysis panel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <AIReasonPanel
                              thread={selectedThreadData.thread}
                              timeline={selectedThreadData.timeline || []}
                              onThreadUpdated={(updated) => {
                                setSelectedThreadData((prev) => ({
                                  ...prev,
                                  thread: updated,
                                }));
                                loadThreads();
                                toast.success('Classification updated', {
                                  action: {
                                    label: 'Remember for Agent?',
                                    onClick: () => handlePromptRememberNote(updated, updated.currentLabel),
                                  },
                                });
                              }}
                              onOpenPlaybook={() => {
                                setIsAiPanelOpen(false);
                                setIsPlaybookOpen(true);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </main>
            </div>
          )}
        </div>
      )}

      {/* MOBILE-ONLY FIXED BOTTOM NAVIGATION BAR (Zero horizontal scroll, fixed 5-slot grid) */}
      <nav
        aria-label="Mobile workspace navigation"
        className="md:hidden flex-shrink-0 bg-white border-t border-black/[0.08] shadow-[0_-2px_10px_rgba(0,0,0,0.03)] px-1.5 pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))] select-none z-30"
      >
        {isTodayView ? (
          <div className="grid grid-cols-5 gap-0.5">
            <button
              type="button"
              onClick={() => navigate('/assistant/today')}
              className="flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl text-ink-900 bg-ink-900/[0.06] font-semibold cursor-pointer"
            >
              <Calendar className="h-4 w-4 text-ink-900" />
              <span className="text-[10px] leading-tight">Today</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/assistant/c/${activeClientId}/inbox`)}
              className="flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl text-ink-600 hover:text-ink-900 hover:bg-ink-50 font-medium cursor-pointer"
            >
              <Inbox className="h-4 w-4" />
              <span className="text-[10px] leading-tight">Inbox</span>
            </button>

            <button
              type="button"
              onClick={() => setIsComposeOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl text-accent hover:bg-amber-50 font-semibold cursor-pointer"
            >
              <PenSquare className="h-4 w-4" />
              <span className="text-[10px] leading-tight">Compose</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/agents')}
              className="flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl text-ink-600 hover:text-ink-900 hover:bg-ink-50 font-medium cursor-pointer"
            >
              <Bot className="h-4 w-4 text-accent" />
              <span className="text-[10px] leading-tight">Agents</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMobileSettingsOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl text-ink-600 hover:text-ink-900 hover:bg-ink-50 font-medium cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              <span className="text-[10px] leading-tight">Settings</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-0.5">
            <button
              type="button"
              onClick={() => navigate(`/assistant/c/${activeClientId}/inbox`)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition cursor-pointer ${
                subSection === 'inbox'
                  ? 'text-ink-900 bg-ink-900/[0.07] font-semibold'
                  : 'text-ink-600 hover:text-ink-900 hover:bg-ink-50 font-medium'
              }`}
            >
              <Inbox className="h-4 w-4" />
              <span className="text-[10px] leading-tight">Inbox</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/assistant/c/${activeClientId}/agents`)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition cursor-pointer ${
                subSection === 'agents'
                  ? 'text-ink-900 bg-ink-900/[0.07] font-semibold'
                  : 'text-ink-600 hover:text-ink-900 hover:bg-ink-50 font-medium'
              }`}
            >
              <Bot className={`h-4 w-4 ${subSection === 'agents' ? 'text-ink-900' : 'text-accent'}`} />
              <span className="text-[10px] leading-tight">Agents</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPlaybookOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl text-ink-600 hover:text-ink-900 hover:bg-ink-50 font-medium transition cursor-pointer"
            >
              <Sliders className="h-4 w-4 text-accent" />
              <span className="text-[10px] leading-tight">Playbook</span>
            </button>

            <button
              type="button"
              onClick={() => setIsActivityOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl text-ink-600 hover:text-ink-900 hover:bg-ink-50 font-medium transition cursor-pointer"
            >
              <History className="h-4 w-4" />
              <span className="text-[10px] leading-tight">Activity</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMobileSettingsOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl text-ink-600 hover:text-ink-900 hover:bg-ink-50 font-medium transition cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              <span className="text-[10px] leading-tight">Settings</span>
            </button>
          </div>
        )}
      </nav>

      {/* Modals & Dialogs */}
      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        mode="assistant"
        clientId={activeClientId}
        clientName={activeClient.name}
        clientEmail={activeClient.email}
        onComposed={(createdThread) => {
          loadThreads(true);
          loadClients();
          if (createdThread?._id && !isTodayView) {
            handleSelectThread(createdThread._id);
          }
        }}
      />

      <SettingsModal
        isOpen={isMobileSettingsOpen}
        onClose={() => setIsMobileSettingsOpen(false)}
        mode="assistant"
        activeClient={activeClient}
      />

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        selectedThreadId={isTodayView ? null : selectedThreadId}
        onSelectThread={handleSelectThread}
        clientId={isTodayView ? null : activeClientId}
        clientName={isTodayView ? 'All Clients' : activeClient.name}
      />

      <PlaybookModal
        isOpen={isPlaybookOpen}
        onClose={() => setIsPlaybookOpen(false)}
        onPlaybookUpdated={loadThreads}
        clientId={activeClientId}
        clientName={activeClient.name}
      />

      <ClientProfileModal
        isOpen={isClientProfileOpen}
        onClose={() => setIsClientProfileOpen(false)}
        onClientUpdated={loadClients}
        clientId={activeClientId}
      />

      <ActivityLogDrawer
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />

      {/* Remember for Agent Modal */}
      {rememberModalData.open && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-black/10 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-base text-ink-900">
                Remember Preference for {activeClient.name}?
              </h3>
              <button
                onClick={() => setRememberModalData({ open: false, text: '', agentId: 'triage' })}
                className="p-1 rounded text-ink-400 hover:text-ink-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-ink-500 leading-relaxed">
              This learned preference will be saved into {activeClient.name}'s Agent Memory and applied to future automated classifications.
            </p>
            <textarea
              rows={3}
              maxLength={200}
              value={rememberModalData.text}
              onChange={(e) => setRememberModalData((prev) => ({ ...prev, text: e.target.value }))}
              className="w-full text-xs p-2.5 rounded-xl border border-black/15 focus:border-accent outline-none resize-none font-sans"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRememberModalData({ open: false, text: '', agentId: 'triage' })}
                className="px-3 py-1.5 rounded-xl text-xs text-ink-600 hover:bg-ink-50 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRememberMemory}
                className="px-4 py-1.5 rounded-xl bg-ink-900 text-white text-xs font-semibold hover:bg-ink-800 transition cursor-pointer"
              >
                Save to Memory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
