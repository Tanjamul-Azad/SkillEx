import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
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
    id: '1-acceptance',
    title: '1. Acceptance of Terms',
    content: `By accessing or using SkiilEX ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all of these Terms, do not use the Platform. We may update these Terms at any time; continued use of the Platform after changes constitutes acceptance of the revised Terms. We will notify users of material changes via email or a prominent notice on the Platform.`,
  },
  {
    id: '2-eligibility',
    title: '2. Eligibility',
    content: `The Platform is intended for students aged 16 and above. By creating an account you represent that (a) you are at least 16 years old, (b) all registration information you provide is accurate and current, and (c) you have the right to agree to these Terms. Users under 18 must have parental or guardian consent.`,
  },
  {
    id: '3-accounts',
    title: '3. User Accounts',
    content: `You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately at support@skiilex.com if you suspect unauthorised use of your account. SkiilEX cannot and will not be liable for any loss or damage arising from your failure to protect your account credentials.`,
  },
  {
    id: '4-platform-use',
    title: '4. Permitted Use of the Platform',
    content: `SkiilEX is a peer-to-peer skill exchange platform. You agree to use it solely for its intended purpose — arranging voluntary, non-monetary skill exchange sessions with other registered students. You may not use the Platform to: (a) request or offer payment for sessions, (b) promote unrelated commercial services, (c) harvest user data, (d) circumvent any security or access control measures, or (e) impersonate another person or entity.`,
  },
  {
    id: '5-prohibited',
    title: '5. Prohibited Conduct',
    content: `You must not: upload, post, or share any content that is unlawful, hateful, discriminatory, defamatory, sexually explicit, or violates any third party's rights; harass, threaten, or intimidate any other user; use automated scripts or bots to interact with the Platform; attempt to gain unauthorized access to other users' accounts or our systems; use the Platform for any illegal purpose; or misrepresent your skills, qualifications, or identity. Violation of these rules may result in immediate account termination.`,
  },
  {
    id: '6-content',
    title: '6. User Content',
    content: `You retain ownership of the content you post on the Platform (profile information, skill descriptions, reviews, etc.). By posting content, you grant SkiilEX a non-exclusive, worldwide, royalty-free licence to use, display, and reproduce that content solely to operate and improve the Platform. You are solely responsible for the accuracy and legality of your content. We reserve the right to remove any content that violates these Terms.`,
  },
  {
    id: '7-exchanges',
    title: '7. Skill Exchanges',
    content: `SkiilEX facilitates connections between users but is not a party to any skill exchange agreement between users. We do not guarantee the quality, safety, or accuracy of any skills offered or sessions conducted. Users engage in exchanges entirely at their own risk. SkiilEX expressly disclaims any liability for the outcome of sessions arranged through the Platform.`,
  },
  {
    id: '8-ip',
    title: '8. Intellectual Property',
    content: `All Platform content, design, logos, code, and trademarks (excluding user-generated content) are owned by SkiilEX and protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works from any part of the Platform without our prior written consent.`,
  },
  {
    id: '9-disclaimers',
    title: '9. Disclaimers & Limitation of Liability',
    content: `THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. TO THE FULLEST EXTENT PERMITTED BY LAW, SKIILEX DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL SKIILEX BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF OR INABILITY TO USE THE PLATFORM, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY TO YOU SHALL NOT EXCEED USD $50 OR THE AMOUNT PAID BY YOU TO US IN THE PAST 12 MONTHS, WHICHEVER IS GREATER.`,
  },
  {
    id: '10-termination',
    title: '10. Termination',
    content: `We reserve the right to suspend or terminate your account at our sole discretion, with or without notice, for conduct that we believe violates these Terms or is harmful to other users, us, third parties, or the integrity of the Platform. You may delete your account at any time via Settings. Upon termination, your right to use the Platform ceases immediately.`,
  },
  {
    id: '11-governing',
    title: '11. Governing Law',
    content: `These Terms shall be governed by and construed in accordance with the laws of Bangladesh. Any dispute arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Dhaka, Bangladesh. If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force.`,
  },
  {
    id: '12-contact',
    title: '12. Contact Us',
    content: `If you have any questions about these Terms, please contact us at legal@skiilex.com or write to us at SkiilEX, BRAC University, 66 Mohakhali, Dhaka 1212, Bangladesh.`,
  },
];

export default function TermsPage() {
  return (
    <MarketingLayout>
      <div className="relative min-h-screen">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/6 blur-[120px]" />
          <div className="absolute inset-0 dot-grid opacity-20 dark:opacity-10" />
        </div>

        <div className="container mx-auto max-w-3xl px-4 py-28">

          {/* Header */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="mb-14"
          >
            <motion.div variants={item}>
              <Badge className="mb-5 bg-primary/10 text-primary border-primary/20 px-4 py-1.5">
                Legal
              </Badge>
            </motion.div>
            <motion.div variants={item} className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-headline text-4xl font-extrabold md:text-5xl">Terms of Service</h1>
                <p className="mt-2 text-muted-foreground text-sm">
                  Last updated: <span className="font-semibold text-foreground/70">1 March 2026</span>
                  &nbsp;·&nbsp; Effective: <span className="font-semibold text-foreground/70">1 March 2026</span>
                </p>
              </div>
            </motion.div>
            <motion.p variants={item} className="mt-6 text-muted-foreground leading-relaxed">
              Please read these Terms of Service carefully before using the SkiilEX platform. By accessing
              or using the Platform, you agree to be bound by the terms described below.
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
            <motion.div
              variants={item}
              className="rounded-2xl glass border border-border/40 p-6"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">Table of Contents</p>
              <ol className="space-y-1.5 columns-1 sm:columns-2 text-sm text-primary">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="hover:underline underline-offset-4 decoration-primary/40"
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
            viewport={{ once: true, amount: 0.1 }}
            className="space-y-10"
          >
            {sections.map((s) => (
              <motion.div key={s.id} variants={item} id={s.id} className="scroll-mt-28">
                <h2 className="font-headline text-xl font-bold mb-3 text-foreground">{s.title}</h2>
                <p className="text-muted-foreground leading-relaxed text-[15px]">{s.content}</p>
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
