import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api.js';
import Avatar from './Avatar.jsx';
import AccountMenu from './AccountMenu.jsx';
import { SettingsModal } from './SettingsModal.jsx';
import { AddClientsModal } from './AddClientsModal.jsx';
import {
  Calendar,
  Sparkles,
  Bot,
  UserPlus,
  Layers,
  Activity,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings,
} from 'lucide-react';

export function AssistantTopBar({
  clients = [],
  activeClientId = null,
  activeTab = 'today', // 'today' | client_id
  onAddClient,
  onClientsChanged,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false);
  const [clientsModalConfig, setClientsModalConfig] = useState({ tab: 'add', filter: 'all' });
  const [agentStatus, setAgentStatus] = useState({ isRunning: true, lastRunAt: new Date(), enabled: true });

  const pendingInviteCount = clients.filter(
    (c) => c.inviteStatus === 'pending' || c.inviteStatus === 'expired'
  ).length;

  function openClientsModal(tab = 'add', filter = 'all') {
    setClientsModalConfig({ tab, filter });
    setIsClientsModalOpen(true);
  }

  useEffect(() => {
    let isMounted = true;
    api
      .get('/agents/status')
      .then((res) => {
        if (isMounted && res?.ok && res.data) {
          setAgentStatus(res.data);
        }
      })
      .catch(() => {});

    const timer = setInterval(() => {
      api
        .get('/agents/status')
        .then((res) => {
          if (isMounted && res?.ok && res.data) {
            setAgentStatus(res.data);
          }
        })
        .catch(() => {});
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  function formatTimeAgo(dateString) {
    if (!dateString) return 'just now';
    const diffMin = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 60000));
    if (diffMin === 0) return 'just now';
    if (diffMin === 1) return '1m ago';
    if (diffMin < 60) return `${diffMin}m ago`;
    return `${Math.floor(diffMin / 60)}h ago`;
  }

  const isControlRoom = location.pathname.includes('/agents');

  return (
    <header className="bg-white border-b border-black/[0.08] sticky top-0 z-40 select-none shadow-xs">
      <div className="w-full px-3 sm:px-5 h-14 flex items-center justify-between gap-2 lg:gap-3">
        {/* Left: Brand & Primary Client Tabs */}
        <div className="flex items-center gap-2 lg:gap-3 overflow-x-auto no-scrollbar py-1 min-w-0 flex-1">
          <Link
            to="/"
            className="flex items-center gap-2 group flex-shrink-0 pr-0.5 hover:opacity-90 transition"
            title="Go to Daybook Home"
          >
            <div className="h-7 w-7 rounded-lg bg-ink-900 flex items-center justify-center text-white font-serif font-bold text-xs tracking-tight group-hover:scale-102 transition">
              D
            </div>
            <span className="font-serif font-bold text-ink-900 text-sm tracking-tight hidden xl:inline whitespace-nowrap">
              Daybook Mail
            </span>
          </Link>

          <div className="h-4 w-px bg-black/[0.1] hidden xl:block flex-shrink-0" />

          {/* Persistent Workspace Tabs */}
          <nav className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            {/* TODAY TAB */}
            <button
              onClick={() => navigate('/assistant/today')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer active:scale-98 ${
                activeTab === 'today' && !isControlRoom
                  ? 'bg-ink-900 text-white font-semibold shadow-soft'
                  : 'text-ink-700 hover:text-ink-900 hover:bg-ink-50'
              }`}
            >
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Today</span>
            </button>

            {/* PER-CLIENT TABS */}
            {clients.map((c) => {
              const isSelected = activeClientId === c._id && !isControlRoom && activeTab !== 'today';
              const needsMayaCount = c.needsReviewCount || 0;

              return (
                <button
                  key={c._id}
                  onClick={() => navigate(`/assistant/c/${c._id}/inbox`)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition cursor-pointer active:scale-98 ${
                    isSelected
                      ? 'bg-ink-900 text-white font-semibold shadow-soft'
                      : 'text-ink-700 hover:text-ink-900 hover:bg-ink-50'
                  }`}
                  title={
                    c.inviteStatus === 'pending'
                      ? `${c.name} (${c.company}) — Client invite pending`
                      : `${c.name} (${c.company})`
                  }
                >
                  <Avatar name={c.name} email={c.email} size="xs" />
                  <span className="tracking-tight">{c.name.split(' ')[0]}</span>
                  {needsMayaCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isSelected
                          ? 'bg-amber-400 text-ink-900'
                          : 'bg-amber-100 text-amber-900 border border-amber-300/60'
                      }`}
                      title={`${needsMayaCount} items needing Maya`}
                    >
                      {needsMayaCount}
                    </span>
                  )}
                  {c.inviteStatus === 'pending' && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                        isSelected ? 'bg-amber-300' : 'bg-amber-500'
                      }`}
                      title="Client invitation pending"
                      aria-label="Invitation pending"
                    />
                  )}
                </button>
              );
            })}

            {/* + Add Client Button */}
            <button
              type="button"
              onClick={() => {
                if (typeof onAddClient === 'function') {
                  onAddClient();
                } else {
                  openClientsModal('add', 'all');
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-ink-600 hover:text-ink-900 hover:bg-ink-50 border border-dashed border-black/15 whitespace-nowrap transition cursor-pointer active:scale-95"
              title="Add a new executive client & send invite"
            >
              <UserPlus className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="hidden 2xl:inline">Add Client</span>
            </button>

            {/* Remaining Pending Invites Pill */}
            {pendingInviteCount > 0 && (
              <button
                type="button"
                onClick={() => openClientsModal('roster', 'pending')}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 whitespace-nowrap transition cursor-pointer active:scale-95"
                title={`${pendingInviteCount} pending client invite${pendingInviteCount === 1 ? '' : 's'} — click to view, resend, or revoke`}
              >
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span>{pendingInviteCount}</span>
                <span className="hidden 2xl:inline">pending</span>
              </button>
            )}
          </nav>
        </div>

        {/* Right: Background Agent Status Pill + Navigation + Account */}
        <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 flex-shrink-0">
          {/* Agent Ticker Status Pill */}
          <div
            className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap ${
              agentStatus.isRunning
                ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
            title={
              agentStatus.isRunning
                ? `Background agents active. Last autonomous tick ran ${formatTimeAgo(agentStatus.lastRunAt)}`
                : 'Background agents disabled or tick failing'
            }
          >
            <span
              className={`h-2 w-2 rounded-full flex-shrink-0 ${
                agentStatus.isRunning ? 'bg-emerald-500 animate-pulse ring-2 ring-emerald-200' : 'bg-amber-500'
              }`}
            />
            <span>Agents</span>
            <span className="hidden 2xl:inline text-[10px] text-ink-400 font-mono">
              · {formatTimeAgo(agentStatus.lastRunAt)}
            </span>
          </div>

          {/* Control Room Link (hidden on mobile < md since mobile uses fixed bottom nav) */}
          <Link
            to="/agents"
            className={`hidden md:flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
              isControlRoom
                ? 'bg-ink-900 text-white font-semibold'
                : 'text-ink-700 hover:text-ink-900 hover:bg-ink-50'
            }`}
            title="Cross-client Autonomous Agents Control Room"
          >
            <Bot className="h-3.5 w-3.5 text-accent flex-shrink-0" />
            <span className="hidden lg:inline">Control Room</span>
          </Link>

          {/* Accounts Link */}
          <Link
            to="/accounts"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-ink-700 hover:text-ink-900 hover:bg-ink-50 whitespace-nowrap transition"
            title="Connected Gmail & Outlook Accounts"
          >
            <span>Accounts</span>
          </Link>

          {/* Settings Button (hidden on mobile < md since mobile uses fixed bottom nav) */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-medium text-ink-700 hover:text-ink-900 hover:bg-ink-50 whitespace-nowrap transition cursor-pointer"
            title="Workspace Settings, AI API Keys, Playbooks & Demo Controls"
          >
            <Settings className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden lg:inline">Settings</span>
          </button>

          {/* Account Profile Menu */}
          <AccountMenu />
        </div>
      </div>

      {/* Unified Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        mode="assistant"
        activeClient={clients.find((c) => c._id === activeClientId)}
      />

      {/* Add Client & Pending Invites Manager */}
      <AddClientsModal
        isOpen={isClientsModalOpen}
        onClose={() => setIsClientsModalOpen(false)}
        initialTab={clientsModalConfig.tab}
        initialFilter={clientsModalConfig.filter}
        onClientsChanged={onClientsChanged}
      />
    </header>
  );
}
