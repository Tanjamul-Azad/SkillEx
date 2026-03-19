import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import MarketingLayout from '@/components/layout/MarketingLayout';

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 18 } },
};

const sections = [
  {
    id: 'p1-overview',
    title: '1. Overview',
    content: `SkiilEX ("we", "us", "our") is committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use it, who we share it with, and your rights as a user. By using the Platform, you consent to the practices described in this Policy.`,
  },
  {
    id: 'p2-data-collected',
    title: '2. Data We Collect',
    content: `We collect the following categories of personal data:

  • Account Data: name, email address, university name, and password (hashed with bcrypt — never stored in plain text).
  • Profile Data: skills you offer, skills you seek, proficiency level, profile photo (optional), and bio.
  • Usage Data: pages visited, features used, session duration, and interactions with other users — collected via anonymised analytics.
  • Exchange Data: match requests you send, sessions you schedule, and ratings and reviews you submit.
  • Device Data: IP address, browser type, operating system, and device identifiers — used solely for security logging and fraud prevention.
  • Communications: messages you send via our platform chat feature.`,
  },
  {
    id: 'p3-how-we-use',
    title: '3. How We Use Your Data',
    content: `We use collected data to:

  • Operate and improve the Platform (match algorithm, onboarding, recommendations).
  • Authenticate your identity and keep your account secure.
  • Send transactional emails (account verification, session reminders, password resets).
  • Send product updates and announcements (you can opt out at any time).
  • Detect and prevent fraud, abuse, and violations of our Terms of Service.
  • Generate aggregated, anonymised analytics to understand how the Platform is used.
  • Comply with legal obligations.

  We do not use your personal data for advertising and we do not sell it to third parties.`,
  },
  {
    id: 'p4-sharing',
    title: '4. Sharing of Data',
    content: `We do not sell, rent, or trade your personal data. We may share it with:

  • Other Users: Your display name, university, skills, profile photo, and rating are visible to other registered users. Your email address is never displayed publicly.
  • Service Providers: Trusted third-party vendors who help us operate the Platform (cloud hosting, email delivery, analytics). All processors are bound by data processing agreements.
  • Legal Compliance: If required by applicable law, regulation, court order, or governmental authority.
  • Business Transfers: In the event of a merger, acquisition, or asset sale, user data may be transferred as part of that transaction, subject to the privacy protections in this Policy.`,
  },
  {
    id: 'p5-storage',
    title: '5. Data Storage & Security',
    content: `Your data is stored on encrypted servers located in the European Union and Singapore. We implement industry-standard security measures including TLS encryption in transit, AES-256 encryption at rest, bcrypt password hashing, and routine security audits. However, no method of transmission over the Internet is 100% secure. You use the Platform at your own risk and we encourage you to use a strong, unique password.`,
  },
  {
    id: 'p6-retention',
    title: '6. Data Retention',
    content: `We retain your personal data for as long as your account is active or as needed to provide services. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law or legitimate business interests (e.g., fraud prevention records retained for 12 months). Anonymised aggregate data may be retained indefinitely.`,
  },
  {
    id: 'p7-cookies',
    title: '7. Cookies',
    content: `We use cookies and similar technologies to:

  • Maintain your logged-in session (essential cookies).
  • Remember your theme preference (functional cookies).
  • Understand how users interact with the Platform via anonymised analytics (analytics cookies).

  You can disable non-essential cookies in your browser settings, but this may affect some Platform functionality. We do not use advertising or tracking cookies.`,
  },
  {
    id: 'p8-rights',
    title: '8. Your Rights',
    content: `Depending on your country of residence, you may have the following rights regarding your personal data:

  • Access: Request a copy of the data we hold about you.
  • Correction: Request correction of inaccurate or incomplete data.
  • Deletion: Request deletion of your data ("right to be forgotten").
  • Portability: Receive your data in a structured, machine-readable format.
  • Objection: Object to processing based on legitimate interests.
  • Withdraw Consent: Where processing is based on consent, withdraw it at any time.

  To exercise any of these rights, contact us at privacy@skiilex.com. We will respond within 30 days.`,
  },
  {
    id: 'p9-children',
    title: '9. Children\'s Privacy',
    content: `The Platform is not intended for children under 16. We do not knowingly collect personal data from children under 16. If we become aware that we have collected data from a child under 16 without parental consent, we will delete that information promptly. Parents who believe their child has provided data should contact us at privacy@skiilex.com.`,
  },
  {
    id: 'p10-changes',
    title: '10. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by posting a prominent notice on the Platform. Your continued use of the Platform after the effective date constitutes your acceptance of the revised Policy.`,
  },
  {
    id: 'p11-contact',
    title: '11. Contact',
    content: `For privacy-related enquiries, data subject requests, or to report a concern, contact our Privacy Team at privacy@skiilex.com. For general enquiries: hello@skiilex.com. Postal address: SkiilEX, BRAC University, 66 Mohakhali, Dhaka 1212, Bangladesh.`,
  },
];

export default function PrivacyPage() {
  return (
    <MarketingLayout>
      <div className="relative min-h-screen">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-secondary/6 blur-[120px]" />
          <div className="absolute inset-0 dot-grid opacity-20 dark:opacity-10" />
        </div>

        <div className="container mx-auto max-w-3xl px-4 py-28">

          {/* Header */}
          <motion.div variants={container} initial="hidden" animate="visible" className="mb-14">
            <motion.div variants={item}>
              <Badge className="mb-5 bg-secondary/10 text-secondary border-secondary/20 px-4 py-1.5">
                Legal
              </Badge>
            </motion.div>
            <motion.div variants={item} className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 border border-secondary/20">
                <Lock className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h1 className="font-headline text-4xl font-extrabold md:text-5xl">Privacy Policy</h1>
                <p className="mt-2 text-muted-foreground text-sm">
                  Last updated: <span className="font-semibold text-foreground/70">1 March 2026</span>
                </p>
              </div>
            </motion.div>
            <motion.p variants={item} className="mt-6 text-muted-foreground leading-relaxed">
              Your privacy matters to us. This policy explains how SkiilEX collects, uses, and protects
              your personal information when you use our platform.
            </motion.p>
          </motion.div>

          {/* Quick nav */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mb-12"
          >
            <motion.div variants={item} className="rounded-2xl glass border border-border/40 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">Contents</p>
              <ol className="space-y-1.5 columns-1 sm:columns-2 text-sm text-secondary">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="hover:underline underline-offset-4 decoration-secondary/40"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </motion.div>
          </motion.div>

          {/* Sections */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.05 }}
            className="space-y-10"
          >
            {sections.map((s) => (
              <motion.div key={s.id} variants={item} id={s.id} className="scroll-mt-28">
                <h2 className="font-headline text-xl font-bold mb-3">{s.title}</h2>
                <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-line">{s.content}</p>
                <div className="mt-6 h-px bg-border/30" />
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-16 text-xs text-muted-foreground/50 text-center"
          >
            © {new Date().getFullYear()} SkiilEX. All rights reserved.
          </motion.p>
        </div>
      </div>
    </MarketingLayout>
  );
}
