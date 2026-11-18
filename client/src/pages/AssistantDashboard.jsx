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
  const [collapsedMessages, setCollapsedMessages] = useState({});

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
  }

  function handleSelectThread(threadId) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('threadId', threadId);
    setSearchParams(nextParams);
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
      await api.patch(`/threads/${thread._id}`, { isArchived: nextArchived });
      toast.success(nextArchived ? 'Thread moved to archive' : 'Thread unarchived');
      loadThreads();
      if (selectedThreadData?.thread?._id === thread._id) {
        setSelectedThreadData(null);
      }
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

  return (
    <div className="h-screen w-screen flex flex-col bg-[#FAF8F5] text-ink-900 font-sans overflow-hidden">
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
        <div className="flex-1 overflow-y-auto app-pane-scroll">
          <AssistantTodayView
            onJumpToThread={(cId, tId) => {
              navigate(`/assistant/c/${cId}/inbox?threadId=${tId}`);
            }}
          />
        </div>
      ) : (
        /* PER-CLIENT WORKSPACE */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Client Sub-Navigation Bar */}
          <div className="h-11 bg-white border-b border-black/[0.06] px-3 sm:px-5 flex items-center justify-between gap-2 flex-shrink-0 z-10 select-none overflow-hidden">
            {/* Sub-nav Links: Inbox | Agents | Playbook | Activity */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
              <button
                onClick={() => navigate(`/assistant/c/${activeClientId}/inbox`)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
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
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
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
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium text-ink-600 hover:text-ink-900 hover:bg-ink-50 whitespace-nowrap transition cursor-pointer"
              >
                <Sliders className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                <span>Playbook</span>
              </button>

              <button
                onClick={() => setIsActivityOpen(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium text-ink-600 hover:text-ink-900 hover:bg-ink-50 whitespace-nowrap transition cursor-pointer"
              >
                <History className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Activity</span>
              </button>
            </div>

            {/* Client Context Pill & Ask AI Trigger */}
            <div className="flex items-center gap-2 sm:gap-3 text-xs min-w-0">
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF8F5] hover:bg-ink-100 border border-black/[0.08] text-ink-700 hover:text-ink-900 font-medium whitespace-nowrap flex-shrink-0 transition cursor-pointer"
                title="Open AI Command Palette (Ctrl+K)"
              >
                <Sparkles className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                <span className="hidden sm:inline">Ask AI</span>
                <kbd className="text-[10px] font-mono text-ink-500 bg-white px-1.5 py-0.2 rounded border border-black/[0.08]">
                  Ctrl+K
                </kbd>
              </button>

              <div className="flex items-center gap-1.5 min-w-0">
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
            /* 3-PANE INBOX */
            <div className="flex-1 flex overflow-hidden">
              {/* PANE 1: Navigation & Segments Sidebar (240px) */}
              <aside className="w-60 bg-[#FAF8F5] border-r border-borderMuted/70 flex flex-col flex-shrink-0 select-none">
                {/* Client Profile Card in Sidebar */}
                <button
                  type="button"
                  onClick={() => setIsClientProfileOpen(true)}
                  className="m-3 p-3.5 rounded-2xl bg-white border border-black/[0.05] shadow-card hover:border-black/15 transition-all text-left group cursor-pointer active:scale-98"
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
                      <div className="text-[11px] text-ink-500 truncate">
                        {activeClient.title}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Segments Navigation List */}
                <nav className="flex-1 overflow-y-auto app-pane-scroll px-2.5 py-1 space-y-1 text-xs">
                  {[
                    { id: 'all', label: 'All Inbox', icon: Inbox, count: counts.TOTAL },
                    { id: 'client', label: `${activeClient.name.split(' ')[0]} to Reply`, icon: UserCheck, count: counts.CLIENT_TO_REPLY, color: 'text-label-client' },
                    { id: 'assistant', label: 'Assistant Queue', icon: CheckSquare, count: counts.ASSISTANT_TO_REPLY, color: 'text-label-assistant' },
                    { id: 'proposals', label: 'Agent Proposals', icon: Sparkles, count: 3, color: 'text-accent' },
                    { id: 'no_reply', label: 'Quiet Folder', icon: Archive, count: counts.NO_REPLY_NEEDED, color: 'text-label-noReply' },
                    { id: 'waiting', label: 'Waiting on Others', icon: Clock, count: counts.WAITING, color: 'text-amber-600' },
                    { id: 'needs_review', label: 'Needs Review', icon: AlertTriangle, count: counts.NEEDS_REVIEW, color: 'text-label-review' },
                    { id: 'meetings', label: 'Meetings Strip', icon: Calendar, count: counts.MEETINGS },
                    { id: 'important', label: 'Important / VIP', icon: Star, count: 4, color: 'text-amber-500' },
                    { id: 'archived', label: 'Archived', icon: Archive },
                  ].map((seg) => {
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
                <div className="p-3 mx-2.5 mb-2 rounded-2xl bg-gradient-to-br from-white to-amber-50/40 border border-black/[0.06] shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-serif font-bold text-ink-900">
                    <div className="flex items-center gap-1.5">
                      <Bot className="h-3.5 w-3.5 text-accent" />
                      <span>{activeClient.name.split(' ')[0]}'s Agents</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/assistant/c/${activeClientId}/agents`)}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-[11px] font-semibold transition active:scale-[0.98] cursor-pointer"
                  >
                    <span>Tune Agent Notes</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </aside>

              {/* PANE 2: Thread List (380px) */}
              <section className="w-96 bg-white border-r border-borderMuted/70 flex flex-col flex-shrink-0 select-none">
                {/* Search Bar */}
                <div className="p-3 border-b border-borderMuted/70">
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

              {/* PANE 3: Thread Detail & AI Panel */}
              <main className="flex-1 bg-[#FAF8F5] flex flex-col overflow-hidden">
                {!selectedThreadId ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
                    <div className="h-12 w-12 rounded-2xl bg-white shadow-soft border border-borderMuted/80 flex items-center justify-center text-ink-400 mb-3">
                      <Mail className="h-6 w-6 stroke-[1.5]" />
                    </div>
                    <h3 className="text-base font-serif font-bold text-ink-800">
                      Select a conversation
                    </h3>
                    <p className="text-xs text-ink-500 max-w-sm mt-1">
                      Choose any thread from {activeClient.name}'s queue or use keyboard shortcuts (j/k) to navigate.
                    </p>
                  </div>
                ) : loadingDetail || !selectedThreadData ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-ink-400">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      <span>Loading conversation...</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex overflow-hidden">
                    {/* Thread Reading & Action Pane */}
                    <div className="flex-1 overflow-y-auto app-pane-scroll p-6 space-y-5">
                      {/* Thread Header */}
                      <div className="bg-white rounded-2xl border border-borderMuted/70 p-5 shadow-card space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="font-serif font-bold text-xl text-ink-900 tracking-tight leading-snug">
                            {selectedThreadData.thread.subject}
                          </h2>
                          <div className="flex items-center gap-2">
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
                          <div className="flex items-center gap-1.5">
                            <span className="text-ink-400">Participants:</span>
                            <span className="text-ink-900 font-semibold">
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
                      <div className="space-y-4">
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
                                className="p-4 flex items-center justify-between cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-ink-100 text-ink-800 font-bold text-xs flex items-center justify-center flex-shrink-0 ring-2 ring-white">
                                    {(msg.from?.name || msg.from?.email || 'U')[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-ink-900 tracking-tight">
                                      {msg.from?.name || msg.from?.email}
                                    </span>
                                    <span className="text-[11px] text-ink-400 ml-2">
                                      to {msg.to?.[0]?.name || msg.to?.[0]?.email || activeClient.name.split(' ')[0]}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-ink-400">
                                  <span className="text-[11px] font-mono">
                                    {new Date(msg.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                  </span>
                                  {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                                </div>
                              </div>

                              {!isCollapsed && (
                                <div className="px-5 pb-5 pt-1 text-xs text-ink-800 leading-relaxed border-t border-borderMuted/30 whitespace-pre-wrap font-sans">
                                  {msg.bodyText || msg.snippet}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Assistant Draft Composer Area */}
                      <div className="pt-2">
                        <DraftEditor
                          thread={selectedThreadData.thread}
                          existingDraft={selectedThreadData.drafts?.[0]}
                          onDraftUpdated={(updated) => {
                            setSelectedThreadData((prev) => ({
                              ...prev,
                              drafts: [updated],
                            }));
                          }}
                        />
                      </div>
                    </div>

                    {/* AI Reasoning Inspector Column (320px) */}
                    <div className="w-80 border-l border-borderMuted/70 flex-shrink-0">
                      <AIReasonPanel
                        thread={selectedThreadData.thread}
                        timeline={selectedThreadData.timeline || []}
                        onThreadUpdated={(updated) => {
                          setSelectedThreadData((prev) => ({
                            ...prev,
                            thread: updated,
                          }));
                          loadThreads();
                          // Offer remember note
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
                  </div>
                )}
              </main>
            </div>
          )}
        </div>
      )}

      {/* Modals & Dialogs */}
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
