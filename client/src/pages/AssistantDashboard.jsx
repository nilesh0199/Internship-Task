import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { api } from '../lib/api.js';
import { ThreadRow } from '../components/ThreadRow.jsx';
import { AtAGlanceStrip } from '../components/AtAGlanceStrip.jsx';
import { AIReasonPanel } from '../components/AIReasonPanel.jsx';
import { DraftEditor } from '../components/DraftEditor.jsx';
import { CommandPaletteModal } from '../components/CommandPaletteModal.jsx';
import { PlaybookModal } from '../components/PlaybookModal.jsx';
import { ActivityLogDrawer } from '../components/ActivityLogDrawer.jsx';
import { LabelBadge } from '../components/LabelBadge.jsx';
import Avatar from '../components/Avatar.jsx';
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
  Command,
  Sliders,
  History,
  Mail,
  RefreshCw,
  Bell,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCheck,
  Sparkles,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

export function AssistantDashboard() {
  const { user, client } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active segment and thread selection from URL params
  const activeSegment = searchParams.get('segment') || 'all';
  const selectedThreadId = searchParams.get('threadId');

  const [threads, setThreads] = useState([]);
  const [selectedThreadData, setSelectedThreadData] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [counts, setCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [providerFilter, setProviderFilter] = useState('all');

  // Modals & Drawers
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isPlaybookOpen, setIsPlaybookOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [collapsedMessages, setCollapsedMessages] = useState({});

  // 1. Load threads & segment counts
  const loadThreads = useCallback(async () => {
    setLoadingList(true);
    try {
      const qParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const res = await api.get(`/threads?segment=${activeSegment}${qParam}`);
      if (res.ok) {
        setThreads(res.data || []);
      }

      // Refresh segment counts
      const allRes = await api.get('/threads?segment=all');
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
      toast.error('Failed to load threads: ' + err.message);
    } finally {
      setLoadingList(false);
    }
  }, [activeSegment, searchQuery]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // 2. Load detail when selectedThreadId changes
  useEffect(() => {
    if (!selectedThreadId) {
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
  }, [selectedThreadId]);

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
      toast.success(`Nudge alert dispatched to Priya for "${thread.subject}"!`);
      await api.post(`/threads/${thread._id}/client-decision`, {
        action: 'nudge_sent',
        note: 'Maya sent a gentle 48h reminder',
      });
    } catch (err) {
      toast.error('Nudge failed: ' + err.message);
    }
  }

  // Keyboard Navigation: j/k move, Enter open, c client, a assistant, n no reply, r reply, e archive
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

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
        api.post(`/threads/${selectedThreadId}/override`, { newLabel: 'CLIENT_TO_REPLY' }).then(loadThreads);
        toast.success('Reclassified to Client to Reply');
      } else if (e.key === 'a' && selectedThreadId) {
        api.post(`/threads/${selectedThreadId}/override`, { newLabel: 'ASSISTANT_TO_REPLY' }).then(loadThreads);
        toast.success('Reclassified to Assistant to Reply');
      } else if (e.key === 'n' && selectedThreadId) {
        api.post(`/threads/${selectedThreadId}/override`, { newLabel: 'NO_REPLY_NEEDED' }).then(loadThreads);
        toast.success('Moved to Quiet Folder');
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
  }, [threads, selectedThreadId, loadThreads]);

  const conflicts = threads.flatMap((t) => t.meetings?.filter((m) => m.isConflict) || []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#FAF8F5] text-ink-900 font-sans overflow-hidden">
      {/* Top Floating App Bar */}
      <header className="h-16 bg-white/85 backdrop-blur-md border-b border-borderMuted/70 px-5 flex items-center justify-between flex-shrink-0 z-10 select-none">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 group hover:opacity-90 transition cursor-pointer"
            title="Daybook Mail — Return to home"
          >
            <div className="h-8 w-8 rounded-xl bg-ink-900 text-white flex items-center justify-center font-serif font-bold text-sm shadow-soft group-hover:scale-105 transition-transform">
              D
            </div>
            <span className="font-serif font-bold text-base text-ink-900 tracking-tight group-hover:text-ink-700 transition-colors">
              Daybook Mail
            </span>
          </Link>
          <span className="text-[10px] font-semibold tracking-wide text-label-assistant bg-label-assistantBg px-2 py-0.5 rounded-full border border-label-assistant/20 hidden sm:inline">
            Assistant Workspace
          </span>
        </div>

        {/* Global Search & Command Palette trigger */}
        <div className="flex-1 max-w-md mx-6">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-4 py-2 rounded-full bg-ink-100/70 hover:bg-ink-100 border border-borderMuted/80 text-xs text-ink-500 hover:text-ink-700 transition-all cursor-pointer shadow-xs hover:border-black/[0.1] active:scale-[0.99]"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-ink-400" />
              <span className="tracking-tight">Ask AI or search conversations...</span>
            </div>
            <kbd className="px-2 py-0.5 rounded-full bg-white border border-borderMuted text-[10px] font-mono text-ink-600 shadow-2xs font-semibold">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right tools: Playbook, Activity, Accounts */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaybookOpen(true)}
            className="px-3.5 py-1.5 rounded-full border border-black/[0.06] bg-white hover:bg-ink-50 text-xs font-semibold text-ink-700 hover:text-ink-900 flex items-center gap-1.5 transition-all shadow-soft cursor-pointer active:scale-95"
            title="Edit Priya's Delegation Playbook"
          >
            <Sliders className="h-3.5 w-3.5 text-accent" />
            <span className="hidden md:inline">Priya's Playbook</span>
          </button>

          <button
            onClick={() => setIsActivityOpen(true)}
            className="h-8 w-8 rounded-full border border-black/[0.06] bg-white hover:bg-ink-50 text-ink-600 hover:text-ink-900 transition-all shadow-soft cursor-pointer flex items-center justify-center active:scale-95"
            title="View Activity Audit Log"
          >
            <History className="h-3.5 w-3.5" />
          </button>

          <Link
            to="/settings/accounts"
            className="h-8 w-8 rounded-full border border-black/[0.06] bg-white hover:bg-ink-50 text-ink-600 hover:text-ink-900 transition-all shadow-soft flex items-center justify-center active:scale-95"
            title="Manage Connected Mailboxes"
          >
            <Mail className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Main 3-Pane Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* ================================================================= */}
        {/* PANE 1: Navigation & Segments Sidebar (240px)                      */}
        {/* ================================================================= */}
        <aside className="w-60 bg-[#FAF8F5] border-r border-borderMuted/70 flex flex-col flex-shrink-0 select-none">
          {/* Client Boss Profile Card */}
          <div className="m-3 p-3.5 rounded-2xl bg-white border border-black/[0.05] shadow-card">
            <div className="flex items-center gap-2.5">
              <Avatar name={client?.name || 'Priya Sharma'} email={client?.email} size="md" />
              <div className="truncate">
                <div className="text-xs font-bold text-ink-900 truncate tracking-tight">
                  {client?.name || 'Priya Sharma'}
                </div>
                <div className="text-[11px] text-ink-500 truncate">
                  {client?.title || 'Founder & CEO'}
                </div>
              </div>
            </div>
          </div>

          {/* Segments Navigation List */}
          <nav className="flex-1 overflow-y-auto app-pane-scroll px-2.5 py-1 space-y-1 text-xs">
            {[
              { id: 'all', label: 'All Inbox', icon: Inbox, count: counts.TOTAL },
              { id: 'client', label: 'Client to Reply', icon: UserCheck, count: counts.CLIENT_TO_REPLY, color: 'text-label-client' },
              { id: 'assistant', label: 'Assistant to Reply', icon: CheckSquare, count: counts.ASSISTANT_TO_REPLY, color: 'text-label-assistant' },
              { id: 'no_reply', label: 'Quiet Folder', icon: Archive, count: counts.NO_REPLY_NEEDED, color: 'text-label-noReply' },
              { id: 'waiting', label: 'Waiting on Others', icon: Clock, count: counts.WAITING, color: 'text-amber-600' },
              { id: 'needs_review', label: 'Needs Review', icon: AlertTriangle, count: counts.NEEDS_REVIEW, color: 'text-label-review' },
              { id: 'action', label: 'Action Required', icon: CheckSquare, count: counts.TOTAL ? Math.round(counts.TOTAL * 0.4) : 0 },
              { id: 'meetings', label: 'Meetings Strip', icon: Calendar, count: counts.MEETINGS },
              { id: 'important', label: 'Important / VIP', icon: Star, count: 5, color: 'text-amber-500' },
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

          {/* Sync Status Footer */}
          <div className="p-3.5 m-2.5 rounded-2xl bg-white border border-black/[0.05] shadow-xs text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-ink-600 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
              <span>Demo Mailbox synced</span>
            </div>
            <button onClick={loadThreads} title="Sync now" className="p-1 hover:bg-ink-100 rounded-full transition cursor-pointer">
              <RefreshCw className="h-3 w-3 text-ink-400 hover:text-ink-900" />
            </button>
          </div>
        </aside>

        {/* ================================================================= */}
        {/* PANE 2: Center Thread List (380px – 440px)                         */}
        {/* ================================================================= */}
        <section className="w-88 md:w-96 lg:w-[420px] bg-[#FAF8F5]/50 border-r border-borderMuted/70 flex flex-col flex-shrink-0 overflow-hidden">
          {/* At A Glance Metric Chips Strip */}
          <AtAGlanceStrip
            counts={counts}
            activeSegment={activeSegment}
            onSelectSegment={handleSelectSegment}
            conflicts={conflicts}
          />

          {/* Quiet Folder Assurance Banner */}
          {activeSegment === 'no_reply' && (
            <div className="p-3 mx-2 my-2 bg-white rounded-2xl border border-black/[0.05] shadow-xs text-xs text-ink-700 flex items-start gap-2">
              <Info className="h-4 w-4 text-ink-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Quiet Folder Audited:</strong> Automated newsletters and receipts filtered with transparent reasons.
              </div>
            </div>
          )}

          {/* Review Queue Fast Triage Banner */}
          {activeSegment === 'needs_review' && (
            <div className="p-3 mx-2 my-2 bg-violet-50/90 rounded-2xl border border-violet-200 text-xs text-violet-900 flex items-center justify-between shadow-xs">
              <span>
                <strong>Fast Keyboard Triage:</strong> Press <kbd className="font-mono font-bold bg-white px-1.5 py-0.5 rounded shadow-2xs">c</kbd> (Client), <kbd className="font-mono font-bold bg-white px-1.5 py-0.5 rounded shadow-2xs">a</kbd> (Assistant), <kbd className="font-mono font-bold bg-white px-1.5 py-0.5 rounded shadow-2xs">n</kbd> (Quiet).
              </span>
              <span className="font-bold text-[11px] bg-white px-2 py-0.5 rounded-full text-violet-700 shadow-xs">
                {threads.length} left
              </span>
            </div>
          )}

          {/* Thread List Filter Input & Source Selector */}
          <div className="px-3 py-2 border-b border-borderMuted/60 flex items-center justify-between gap-2 bg-white/60">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Search className="h-3.5 w-3.5 text-ink-400 ml-1 flex-shrink-0" />
              <input
                id="thread-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter threads..."
                className="w-full text-xs bg-transparent focus:outline-none placeholder:text-ink-400 text-ink-900 font-medium tracking-tight"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-xs text-ink-400 hover:text-ink-700 px-1 font-medium">
                  Clear
                </button>
              )}
            </div>

            {/* Source Account Filter (Gmail vs Demo vs All) */}
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="text-[11px] font-medium bg-ink-100/80 border border-black/[0.06] rounded-lg px-2 py-1 text-ink-700 focus:outline-none cursor-pointer flex-shrink-0"
              title="Filter by connected mailbox source"
            >
              <option value="all">All Sources</option>
              <option value="gmail">Gmail Only</option>
              <option value="outlook">Outlook Only</option>
              <option value="demo">Demo Only</option>
            </select>
          </div>

          {/* Thread Card Scroll Area */}
          <div className="flex-1 overflow-y-auto app-pane-scroll py-1.5">
            {loadingList ? (
              <div className="p-3 space-y-2.5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse space-y-2 p-3.5 bg-white rounded-2xl border border-black/[0.04]">
                    <div className="h-3 bg-ink-200 rounded-full w-1/3" />
                    <div className="h-4 bg-ink-200 rounded-full w-3/4" />
                    <div className="h-3 bg-ink-100 rounded-full w-1/2" />
                  </div>
                ))}
              </div>
            ) : (providerFilter === 'all' ? threads : threads.filter((t) => t.provider === providerFilter)).length === 0 ? (
              <div className="py-20 text-center space-y-2 px-6">
                <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCheck className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-serif font-bold text-ink-900">Inbox Zero</h3>
                <p className="text-xs text-ink-500 leading-relaxed max-w-xs mx-auto">
                  {providerFilter !== 'all'
                    ? `No conversations found for ${providerFilter} source in this segment.`
                    : 'No conversations match the current segment filter. Everything is triaged.'}
                </p>
              </div>
            ) : (
              (providerFilter === 'all' ? threads : threads.filter((t) => t.provider === providerFilter)).map((thread) => (
                <ThreadRow
                  key={thread._id}
                  thread={thread}
                  isSelected={thread._id === selectedThreadId}
                  onClick={() => handleSelectThread(thread._id)}
                />
              ))
            )}
          </div>
        </section>

        {/* ================================================================= */}
        {/* PANE 3: Right Thread Detail & AI Panel (Flex-1)                    */}
        {/* ================================================================= */}
        <main className="flex-1 flex overflow-hidden bg-white">
          {!selectedThreadId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-ink-500 space-y-3 bg-[#FAF8F5]/30">
              <div className="h-16 w-16 rounded-3xl bg-white border border-black/[0.05] shadow-card flex items-center justify-center text-ink-300">
                <Mail className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-serif font-bold text-ink-900">
                Select a conversation to inspect
              </h2>
              <p className="text-xs text-ink-500 max-w-sm leading-relaxed">
                Use <kbd className="px-1.5 py-0.5 rounded bg-ink-100 text-[11px] font-mono">j</kbd> and <kbd className="px-1.5 py-0.5 rounded bg-ink-100 text-[11px] font-mono">k</kbd> to move, <kbd className="px-1.5 py-0.5 rounded bg-ink-100 text-[11px] font-mono">Enter</kbd> to open, or tap any card in the list.
              </p>
            </div>
          ) : loadingDetail || !selectedThreadData ? (
            <div className="flex-1 flex items-center justify-center bg-[#FAF8F5]/30">
              <div className="flex items-center gap-2.5 text-xs text-ink-500 p-4 rounded-2xl bg-white border border-black/[0.05] shadow-card">
                <div className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                <span>Loading conversation and decision model...</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Conversation Reader Column */}
              <div className="flex-1 flex flex-col overflow-y-auto app-pane-scroll p-6 md:p-8 space-y-6">
                {/* Thread Subject Header */}
                <div className="border-b border-borderMuted/70 pb-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <h1 className="text-xl md:text-2xl font-serif font-bold text-ink-900 leading-snug tracking-tight">
                      {selectedThreadData.thread.subject}
                    </h1>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={async () => {
                          try {
                            const res = await api.get(`/ai/summarize/${selectedThreadData.thread._id}`);
                            if (res.ok) {
                              toast.info('Conversation Summary', {
                                description: res.data.summary,
                                duration: 8000,
                              });
                            }
                          } catch (err) {
                            toast.error('Summarize failed: ' + err.message);
                          }
                        }}
                        className="px-3 py-1.5 rounded-full border border-black/[0.06] bg-white hover:bg-ink-50 text-xs font-semibold text-ink-700 hover:text-ink-900 transition flex items-center gap-1.5 shadow-soft cursor-pointer active:scale-95"
                        title="Summarize conversation"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-accent" />
                        <span>Summarize</span>
                      </button>
                      <button
                        onClick={() => handleToggleArchive(selectedThreadData.thread)}
                        className="h-8 w-8 rounded-full border border-black/[0.06] bg-white hover:bg-ink-50 text-ink-600 hover:text-ink-900 transition shadow-soft flex items-center justify-center cursor-pointer active:scale-95"
                        title="Archive thread"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleRead(selectedThreadData.thread)}
                        className="h-8 w-8 rounded-full border border-black/[0.06] bg-white hover:bg-ink-50 text-ink-600 hover:text-ink-900 transition shadow-soft flex items-center justify-center cursor-pointer active:scale-95"
                        title="Mark as unread"
                      >
                        <Mail className="h-3.5 w-3.5" />
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

                    {/* Aging Nudge for Assistant */}
                    {selectedThreadData.thread.currentLabel === 'CLIENT_TO_REPLY' && (
                      <button
                        onClick={() => handleSendNudge(selectedThreadData.thread)}
                        className="text-xs px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 font-semibold hover:bg-amber-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <Bell className="h-3 w-3 text-amber-700" />
                        <span>Send Gentle Nudge to Priya</span>
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
                        {/* Message Header */}
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
                                to {msg.to?.[0]?.name || msg.to?.[0]?.email || 'Priya'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-ink-400">
                            <span className="text-[11px] font-mono">{new Date(msg.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                            {isCollapsed ? (
                              <ChevronDown className="h-4 w-4 text-ink-400" />
                            ) : (
                              <ChevronUp className="h-4 w-4 text-ink-400" />
                            )}
                          </div>
                        </div>

                        {/* Message Content */}
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
                  }}
                  onOpenPlaybook={() => setIsPlaybookOpen(true)}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals & Dialogs */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        selectedThreadId={selectedThreadId}
        onSelectThread={handleSelectThread}
      />

      <PlaybookModal
        isOpen={isPlaybookOpen}
        onClose={() => setIsPlaybookOpen(false)}
        onPlaybookUpdated={loadThreads}
      />

      <ActivityLogDrawer
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />
    </div>
  );
}
