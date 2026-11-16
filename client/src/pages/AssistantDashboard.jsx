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
        if (isMounted) toast.error('Failed to load thread details: ' + err.message);
      })
      .finally(() => {
        if (isMounted) setLoadingDetail(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedThreadId]);

  // Handle segment change
  function handleSelectSegment(segmentKey) {
    const next = new URLSearchParams(searchParams);
    next.set('segment', segmentKey);
    setSearchParams(next);
  }

  // Handle selecting a thread
  function handleSelectThread(id) {
    const next = new URLSearchParams(searchParams);
    next.set('threadId', id);
    setSearchParams(next);
  }

  // Handle quick actions on thread
  async function handleToggleRead(thread) {
    const newRead = !thread.isRead;
    try {
      await api.patch(`/threads/${thread._id}`, { isRead: newRead });
      setThreads((prev) => prev.map((t) => (t._id === thread._id ? { ...t, isRead: newRead } : t)));
      if (selectedThreadData?.thread?._id === thread._id) {
        setSelectedThreadData((prev) => ({
          ...prev,
          thread: { ...prev.thread, isRead: newRead },
        }));
      }
    } catch (err) {
      toast.error('Action failed: ' + err.message);
    }
  }

  async function handleToggleArchive(thread) {
    const newArchive = !thread.isArchived;
    try {
      await api.patch(`/threads/${thread._id}`, { isArchived: newArchive });
      toast.success(newArchive ? 'Archived' : 'Unarchived', {
        action: {
          label: 'Undo',
          onClick: () => handleToggleArchive(thread),
        },
      });
      loadThreads();
    } catch (err) {
      toast.error('Action failed: ' + err.message);
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
      {/* Top Universal App Bar */}
      <header className="h-14 bg-white border-b border-borderMuted px-4 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-ink-900 text-white flex items-center justify-center font-serif font-bold text-sm">
            R
          </div>
          <div>
            <span className="font-serif font-bold text-base text-ink-900 tracking-tight">
              ReplyRight
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-ink-500 ml-2 hidden sm:inline">
              Assistant Workspace
            </span>
          </div>
        </div>

        {/* Global Search & Command Palette trigger */}
        <div className="flex-1 max-w-md mx-4">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-ink-100/70 border border-borderMuted text-xs text-ink-500 hover:bg-ink-100 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              <span>Search threads or ask AI...</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-borderMuted text-[10px] font-mono text-ink-600 shadow-2xs">
              Cmd+K
            </kbd>
          </button>
        </div>

        {/* Right actions: Playbook, Activity, Accounts */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaybookOpen(true)}
            className="px-2.5 py-1.5 rounded-lg border border-borderMuted text-xs font-medium text-ink-700 hover:bg-ink-100 flex items-center gap-1.5 transition cursor-pointer"
            title="Edit Priya's Delegation Playbook"
          >
            <Sliders className="h-3.5 w-3.5 text-accent" />
            <span className="hidden md:inline">Priya's Playbook</span>
          </button>

          <button
            onClick={() => setIsActivityOpen(true)}
            className="p-1.5 rounded-lg border border-borderMuted text-ink-700 hover:bg-ink-100 transition cursor-pointer"
            title="View Activity Audit Log"
          >
            <History className="h-3.5 w-3.5" />
          </button>

          <Link
            to="/settings/accounts"
            className="p-1.5 rounded-lg border border-borderMuted text-ink-700 hover:bg-ink-100 transition"
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
        <aside className="w-56 bg-white border-r border-borderMuted flex flex-col flex-shrink-0 select-none">
          {/* Client Boss Card */}
          <div className="p-3.5 border-b border-borderMuted bg-ink-100/30">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-label-clientBg text-label-client font-serif font-bold text-xs flex items-center justify-center">
                PS
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-ink-900 truncate">
                  {client?.name || 'Priya Sharma'}
                </div>
                <div className="text-[10px] text-ink-500 truncate">
                  {client?.title || 'Founder & CEO'}
                </div>
              </div>
            </div>
          </div>

          {/* Segments Navigation List */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs">
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
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition cursor-pointer text-left ${
                    isActive
                      ? 'bg-ink-100 font-semibold text-ink-900'
                      : 'text-ink-700 hover:bg-ink-100/50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className={`h-4 w-4 flex-shrink-0 ${seg.color || 'text-ink-500'}`} />
                    <span className="truncate">{seg.label}</span>
                  </div>
                  {typeof seg.count === 'number' && (
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive ? 'bg-white font-bold text-ink-900' : 'text-ink-400'
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
          <div className="p-3 border-t border-borderMuted text-xs flex items-center justify-between bg-ink-100/20">
            <div className="flex items-center gap-1.5 text-[11px] text-ink-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Demo Mailbox synced</span>
            </div>
            <button onClick={loadThreads} title="Sync now">
              <RefreshCw className="h-3 w-3 text-ink-400 hover:text-ink-900 cursor-pointer" />
            </button>
          </div>
        </aside>

        {/* ================================================================= */}
        {/* PANE 2: Center Thread List (380px – 440px)                         */}
        {/* ================================================================= */}
        <section className="w-88 md:w-96 lg:w-[420px] bg-white border-r border-borderMuted flex flex-col flex-shrink-0 overflow-hidden">
          {/* At A Glance Metric Chips Strip */}
          <AtAGlanceStrip
            counts={counts}
            activeSegment={activeSegment}
            onSelectSegment={handleSelectSegment}
            conflicts={conflicts}
          />

          {/* Quiet Folder Daily Assurance Banner (When in Quiet Folder) */}
          {activeSegment === 'no_reply' && (
            <div className="p-3 bg-ink-100/70 border-b border-borderMuted text-xs text-ink-700 flex items-start gap-2">
              <Info className="h-4 w-4 text-ink-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Quiet Folder Audited:</strong> 8 automated newsletters and receipts muted with transparent reasons. Nothing critical slipped through today.
              </div>
            </div>
          )}

          {/* Review Queue Fast Triage Banner */}
          {activeSegment === 'needs_review' && (
            <div className="p-2.5 bg-violet-50 border-b border-violet-200 text-xs text-violet-900 flex items-center justify-between">
              <span>
                <strong>Fast Keyboard Triage:</strong> Press <kbd className="font-mono font-bold">c</kbd> (Client), <kbd className="font-mono font-bold">a</kbd> (Assistant), <kbd className="font-mono font-bold">n</kbd> (No Reply).
              </span>
              <span className="font-bold text-[11px]">{threads.length} left</span>
            </div>
          )}

          {/* Thread List Filter Bar */}
          <div className="p-2.5 border-b border-borderMuted flex items-center gap-2 bg-ink-100/20">
            <Search className="h-3.5 w-3.5 text-ink-400 ml-1" />
            <input
              id="thread-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by sender, keyword..."
              className="w-full text-xs bg-transparent focus:outline-none placeholder:text-ink-400 text-ink-900"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-xs text-ink-400 hover:text-ink-700">
                Clear
              </button>
            )}
          </div>

          {/* Thread Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-borderMuted/60">
            {loadingList ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse space-y-2 p-3 bg-ink-100/40 rounded-xl">
                    <div className="h-3 bg-ink-200 rounded w-1/3" />
                    <div className="h-4 bg-ink-200 rounded w-3/4" />
                    <div className="h-3 bg-ink-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="py-16 text-center space-y-2 px-4">
                <CheckCheck className="h-8 w-8 text-emerald-500 mx-auto" />
                <h3 className="text-sm font-semibold text-ink-900">Inbox Zero</h3>
                <p className="text-xs text-ink-500">
                  No conversations match the current segment filter.
                </p>
              </div>
            ) : (
              threads.map((thread) => (
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
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-ink-500 space-y-3">
              <Mail className="h-10 w-10 text-ink-300" />
              <h2 className="text-base font-serif font-bold text-ink-900">
                Select a conversation to inspect
              </h2>
              <p className="text-xs text-ink-500 max-w-sm">
                Use <kbd className="font-mono">j</kbd> and <kbd className="font-mono">k</kbd> to move, <kbd className="font-mono">Enter</kbd> to open, or click any conversation in the list.
              </p>
            </div>
          ) : loadingDetail || !selectedThreadData ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2 text-xs text-ink-500">
                <div className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                <span>Loading conversation and AI decision model...</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Conversation Reader Column */}
              <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
                {/* Thread Subject Header */}
                <div className="border-b border-borderMuted pb-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <h1 className="text-lg font-serif font-bold text-ink-900 leading-snug">
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
                        className="px-2.5 py-1 rounded-lg border border-borderMuted text-xs font-medium text-ink-700 hover:bg-ink-100 transition flex items-center gap-1"
                        title="Summarize conversation"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-accent" />
                        <span>Summarize</span>
                      </button>
                      <button
                        onClick={() => handleToggleArchive(selectedThreadData.thread)}
                        className="p-1.5 rounded-lg border border-borderMuted text-ink-600 hover:bg-ink-100 transition"
                        title="Archive thread"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleRead(selectedThreadData.thread)}
                        className="p-1.5 rounded-lg border border-borderMuted text-ink-600 hover:bg-ink-100 transition"
                        title="Mark as unread"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Participants Row & Aging Warning */}
                  <div className="flex items-center justify-between text-xs text-ink-500 flex-wrap gap-2">
                    <div>
                      Participants:{' '}
                      <span className="text-ink-900 font-medium">
                        {(selectedThreadData.thread.participants || [])
                          .map((p) => p.name || p.email)
                          .join(', ')}
                      </span>
                    </div>

                    {/* Aging Nudge for Assistant */}
                    {selectedThreadData.thread.currentLabel === 'CLIENT_TO_REPLY' && (
                      <button
                        onClick={() => handleSendNudge(selectedThreadData.thread)}
                        className="text-xs px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-semibold hover:bg-amber-100 transition flex items-center gap-1 cursor-pointer"
                      >
                        <Bell className="h-3 w-3" />
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
                        className={`rounded-xl border transition ${
                          isLast
                            ? 'border-borderMuted bg-white shadow-xs'
                            : 'border-borderMuted/60 bg-ink-100/30'
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
                          className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-ink-200 text-ink-800 font-bold text-xs flex items-center justify-center">
                              {(msg.from?.name || msg.from?.email || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-ink-900">
                                {msg.from?.name || msg.from?.email}
                              </span>
                              <span className="text-[11px] text-ink-400 ml-2">
                                to {msg.to?.[0]?.name || msg.to?.[0]?.email || 'Priya'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-ink-400">
                            <span>{new Date(msg.date).toLocaleString()}</span>
                            {isCollapsed ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronUp className="h-4 w-4" />
                            )}
                          </div>
                        </div>

                        {/* Message Content */}
                        {!isCollapsed && (
                          <div className="px-4 pb-4 pt-1 text-xs text-ink-800 leading-relaxed border-t border-borderMuted/40 whitespace-pre-wrap font-sans">
                            {msg.bodyText || msg.snippet}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Assistant Draft Composer Area */}
                <div className="pt-4">
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
              <div className="w-80 border-l border-borderMuted flex-shrink-0">
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
