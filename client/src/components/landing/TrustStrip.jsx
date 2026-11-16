import React from 'react';
import { ShieldCheck, EyeOff, Lock, UserCheck } from 'lucide-react';

export default function TrustStrip() {
  const trustPoints = [
    {
      icon: Lock,
      title: 'AES-256-GCM Encryption',
      desc: 'OAuth access and refresh tokens are encrypted at rest using individual 128-bit IVs and authentication tags.',
    },
    {
      icon: EyeOff,
      title: 'Zero Email Body Logging',
      desc: 'Pino logs track thread IDs, labels, and latency only. Email message bodies are never logged or persisted to traces.',
    },
    {
      icon: UserCheck,
      title: 'Dispatch Safety Gate',
      desc: 'Email sending is hard-gated by SEND_ENABLED=false. Emails are never dispatched without explicit human sign-off.',
    },
    {
      icon: ShieldCheck,
      title: 'Strict OAuth Scopes',
      desc: 'Only gmail.readonly and gmail.send (or Graph equivalents) requested. No broader drive, contact, or profile scopes.',
    },
  ];

  return (
    <section id="security" className="py-16 md:py-24 bg-[#FAF8F5]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-xs font-bold text-accent uppercase tracking-widest">
            Security & Governance
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-ink-900 tracking-tight">
            Designed for high-trust executive environments
          </h2>
          <p className="text-xs text-ink-500">
            Enterprise privacy policies encoded into software architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {trustPoints.map((tp, idx) => {
            const Icon = tp.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-white border border-black/[0.05] shadow-xs space-y-3"
              >
                <div className="h-9 w-9 rounded-xl bg-teal-50 text-accent flex items-center justify-center border border-teal-200/50">
                  <Icon className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold text-ink-900 tracking-tight">
                  {tp.title}
                </h4>
                <p className="text-xs text-ink-500 leading-relaxed">
                  {tp.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
