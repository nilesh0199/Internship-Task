import React from 'react';
import { ShieldCheck, EyeOff, Lock, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TrustStrip() {
  const trustPoints = [
    {
      icon: Lock,
      title: 'AES-256-GCM Encryption',
      desc: 'OAuth tokens are encrypted at rest with individual 128-bit IVs and authentication tags. Plaintext secrets are never stored.',
    },
    {
      icon: EyeOff,
      title: 'Zero Email Body Logging',
      desc: 'Pino logs track thread IDs, labels, and latency only. Email message bodies are never printed or retained in application traces.',
    },
    {
      icon: UserCheck,
      title: 'Dispatch Safety Gate',
      desc: 'Email dispatch is gated by SEND_ENABLED=false by default. No email is transmitted externally without human sign-off.',
    },
    {
      icon: ShieldCheck,
      title: 'Strict Minimal Scopes',
      desc: 'Only gmail.readonly and gmail.send (or Graph equivalents) are requested. No broad Drive, Contacts, or user profile scopes.',
    },
  ];

  return (
    <section
      id="security"
      aria-labelledby="security-title"
      className="py-20 md:py-28 bg-[#FAF8F5] w-full max-w-full overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center space-y-2 max-w-xl mx-auto"
        >
          <span className="text-xs font-bold text-accent uppercase tracking-widest">
            Security & Governance
          </span>
          <h2
            id="security-title"
            className="text-2xl sm:text-3xl font-serif font-bold text-ink-900 tracking-tight"
          >
            Designed for high-trust executive environments
          </h2>
          <p className="text-xs text-ink-500 max-w-[50ch] mx-auto leading-relaxed">
            Enterprise privacy policies encoded into software architecture from day one.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {trustPoints.map((tp, idx) => {
            const Icon = tp.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="p-6 rounded-3xl bg-white border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] space-y-3 hover:shadow-card transition-shadow"
              >
                <div className="h-9 w-9 rounded-xl bg-teal-50 text-accent flex items-center justify-center border border-teal-200/50">
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <h4 className="text-xs font-bold text-ink-900 tracking-tight">
                  {tp.title}
                </h4>
                <p className="text-xs text-ink-500 leading-relaxed font-normal">
                  {tp.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
