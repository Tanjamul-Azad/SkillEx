import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  FileCheck2,
  Github,
  GraduationCap,
  Loader2,
  Medal,
  Search,
  ShieldCheck,
  Star,
  Trophy,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { certificateService, type SkillCertificate } from '@/services/certificateService';
import { useSearchParams } from 'react-router-dom';

const numberFormatter = new Intl.NumberFormat('en-US');
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const DEMO_CERTIFICATE_CODES = [
  'SKILLEX-PYTHON-2026',
  'SKILLEX-MARKETING-2026',
  'SKILLEX-WEBDEV-2026',
  'SKILLEX-DATASCI-2026',
];

const formatDate = (value?: string | null) => {
  if (!value) return 'Not issued';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not issued' : dateFormatter.format(date);
};

const getVerifyHref = (certificate: SkillCertificate) =>
  certificate.verificationUrl || `/verify/certificate/${certificate.verificationCode}`;

function StatTile({
  label,
  value,
  icon: Icon,
  detail,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  detail: string;
}) {
  return (
    <div className="product-kpi">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <span className="rounded-full border border-border/70 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Live
        </span>
      </div>
      <p className="text-2xl font-extrabold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

function CertificateCard({
  certificate,
  selected,
  onSelect,
}: {
  certificate: SkillCertificate;
  selected: boolean;
  onSelect: () => void;
}) {
  const active = certificate.status === 'ACTIVE';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group w-full rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/35 hover:bg-primary/5',
        selected ? 'border-primary/45 bg-primary/10 shadow-sm' : 'border-border/60',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Award className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                'rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest',
                active ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-500' : 'border-destructive/35 bg-destructive/10 text-destructive',
              )}
            >
              {active ? 'Verified' : certificate.status}
            </Badge>
            <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest">
              {certificate.levelLabel}
            </Badge>
          </div>
          <h3 className="mt-3 line-clamp-2 font-headline text-lg font-extrabold leading-tight text-foreground group-hover:text-primary">
            {certificate.title}
          </h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">{certificate.skillName}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-border/50 bg-muted/20 p-3">
        <div>
          <p className="font-headline text-base font-extrabold text-foreground">{certificate.trustScoreSnapshot}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Trust</p>
        </div>
        <div>
          <p className="font-headline text-base font-extrabold text-foreground">{certificate.sessionCountSnapshot}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Sessions</p>
        </div>
        <div>
          <p className="font-headline text-base font-extrabold text-foreground">{(certificate.averageRatingSnapshot ?? 0).toFixed(1)}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Rating</p>
        </div>
      </div>
    </button>
  );
}

export default function CertificatesPage() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [certificates, setCertificates] = useState<SkillCertificate[]>([]);
  const [demoCertificates, setDemoCertificates] = useState<SkillCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const requestedCertificateId = searchParams.get('certificateId');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    certificateService.myCertificates()
      .then((items) => {
        if (!alive) return;
        setCertificates(items);
        setSelectedId(
          requestedCertificateId && items.some((item) => item.id === requestedCertificateId)
            ? requestedCertificateId
            : items[0]?.id ?? null
        );
        if (items.length === 0) {
          setDemoLoading(true);
          Promise.allSettled(DEMO_CERTIFICATE_CODES.map(code => certificateService.publicCertificate(code)))
            .then((results) => {
              if (!alive) return;
              const seeded = results
                .filter((result): result is PromiseFulfilledResult<SkillCertificate> => result.status === 'fulfilled')
                .map(result => result.value);
              setDemoCertificates(seeded);
              setSelectedId(
                requestedCertificateId && seeded.some((item) => item.id === requestedCertificateId)
                  ? requestedCertificateId
                  : seeded[0]?.id ?? null
              );
            })
            .finally(() => {
              if (alive) setDemoLoading(false);
            });
        }
      })
      .catch((error) => {
        if (!alive) return;
        toast({
          title: 'Could not load certificates',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [requestedCertificateId, toast]);

  const displayCertificates = certificates.length > 0 ? certificates : demoCertificates;
  const isShowingExamples = certificates.length === 0 && demoCertificates.length > 0;
  const collectionLoading = loading || (certificates.length === 0 && demoLoading);

  const filteredCertificates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return displayCertificates;
    return displayCertificates.filter((certificate) =>
      [
        certificate.title,
        certificate.skillName,
        certificate.levelLabel,
        certificate.verificationCode,
        certificate.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [displayCertificates, query]);

  const selectedCertificate = useMemo(
    () => displayCertificates.find((certificate) => certificate.id === selectedId) ?? filteredCertificates[0] ?? null,
    [displayCertificates, filteredCertificates, selectedId],
  );

  useEffect(() => {
    if (!requestedCertificateId) return;
    if (displayCertificates.some((certificate) => certificate.id === requestedCertificateId)) {
      setSelectedId(requestedCertificateId);
    }
  }, [displayCertificates, requestedCertificateId]);

  const stats = useMemo(() => {
    const active = displayCertificates.filter((certificate) => certificate.status === 'ACTIVE').length;
    const sessions = displayCertificates.reduce((sum, certificate) => sum + certificate.sessionCountSnapshot, 0);
    const averageTrust = displayCertificates.length
      ? Math.round(displayCertificates.reduce((sum, certificate) => sum + certificate.trustScoreSnapshot, 0) / displayCertificates.length)
      : 0;
    const topRating = displayCertificates.reduce((max, certificate) => Math.max(max, certificate.averageRatingSnapshot), 0);

    return {
      active,
      sessions,
      averageTrust,
      topRating,
    };
  }, [displayCertificates]);

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied`, variant: 'success' });
    } catch {
      toast({ title: `Could not copy ${label.toLowerCase()}`, variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="product-page space-y-6">
        <section className="product-panel overflow-hidden">
          <div className="grid gap-6 p-5 lg:grid-cols-[1.2fr_0.8fr] lg:p-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border border-primary/20 bg-primary/10 text-primary">
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  Publicly verifiable
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {isShowingExamples ? 'Verifier examples' : 'No-money skill economy'}
                </Badge>
              </div>
              <h1 className="mt-4 font-headline text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                Certificate collection
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                A compact proof wallet for skills earned through trusted exchanges, session history, ratings, and verification codes.
              </p>
              {isShowingExamples && (
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                  This account has no personal certificates yet, so these are live public verification examples from the seeded demo set.
                </p>
              )}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <div className="relative max-w-md flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    placeholder="Search skill, level, or code"
                    className="h-11 rounded-xl pl-9"
                  />
                </div>
                {selectedCertificate && (
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl"
                    onClick={() => copyText(selectedCertificate.githubBadgeMarkdown, 'GitHub badge')}
                  >
                    <Github className="h-4 w-4" />
                    Copy badge
                  </Button>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatTile label="Active certificates" value={stats.active} icon={Medal} detail="Issued credentials ready for verification." />
              <StatTile label="Mentor sessions" value={numberFormatter.format(stats.sessions)} icon={GraduationCap} detail="Teaching evidence behind the collection." />
              <StatTile label="Avg trust score" value={stats.averageTrust} icon={BadgeCheck} detail="Snapshot captured at issue time." />
              <StatTile label="Best rating" value={stats.topRating ? stats.topRating.toFixed(1) : '0.0'} icon={Star} detail="Highest peer feedback in this wallet." />
            </div>
          </div>
        </section>

        {collectionLoading ? (
          <div className="product-empty">
            <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-primary" />
            Loading certificate collection
          </div>
        ) : displayCertificates.length === 0 ? (
          <div className="product-empty">
            <FileCheck2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            Complete trusted sessions to earn verifiable skill certificates.
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
                  {isShowingExamples ? 'Verifier examples' : 'Collection'}
                </h2>
                <span className="text-xs font-semibold text-muted-foreground">
                  {filteredCertificates.length} of {displayCertificates.length}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                {filteredCertificates.map((certificate) => (
                  <CertificateCard
                    key={certificate.id}
                    certificate={certificate}
                    selected={selectedCertificate?.id === certificate.id}
                    onSelect={() => setSelectedId(certificate.id)}
                  />
                ))}
              </div>
              {filteredCertificates.length === 0 && (
                <div className="product-empty">No certificates match this search.</div>
              )}
            </section>

            {selectedCertificate && (
              <section className="product-panel p-5 lg:p-6">
                <div className="flex flex-col gap-4 border-b border-border/50 pb-5 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-500">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {selectedCertificate.status}
                      </Badge>
                      <Badge variant="outline" className="rounded-full">{selectedCertificate.certificateType}</Badge>
                    </div>
                    <h2 className="mt-4 font-headline text-2xl font-extrabold tracking-tight text-foreground">
                      {selectedCertificate.title}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Awarded to {selectedCertificate.userName} for {selectedCertificate.skillName}.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Copy verification code"
                      onClick={() => copyText(selectedCertificate.verificationCode, 'Verification code')}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <Button asChild className="rounded-xl">
                      <a href={getVerifyHref(selectedCertificate)} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Verify
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.72fr]">
                  <div className="rounded-xl border border-border/60 bg-muted/15 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <Trophy className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Credential level</p>
                        <p className="text-xl font-extrabold text-foreground">{selectedCertificate.levelLabel}</p>
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-border/50 bg-card p-3">
                        <p className="text-2xl font-extrabold text-foreground">{selectedCertificate.trustScoreSnapshot}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Trust</p>
                      </div>
                      <div className="rounded-xl border border-border/50 bg-card p-3">
                        <p className="text-2xl font-extrabold text-foreground">{selectedCertificate.sessionCountSnapshot}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sessions</p>
                      </div>
                      <div className="rounded-xl border border-border/50 bg-card p-3">
                        <p className="text-2xl font-extrabold text-foreground">{(selectedCertificate.averageRatingSnapshot ?? 0).toFixed(1)}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rating</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl border border-border/60 bg-card p-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        Issued
                      </div>
                      <p className="mt-2 font-semibold text-foreground">{formatDate(selectedCertificate.issuedAt)}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Verification code</p>
                      <p className="mt-2 break-all font-mono text-sm font-bold text-foreground">{selectedCertificate.verificationCode}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-border/60 bg-background/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Badge markdown</p>
                      <p className="mt-1 text-sm text-muted-foreground">Use this proof badge in a profile, README, or portfolio.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => copyText(selectedCertificate.githubBadgeMarkdown, 'GitHub badge')}>
                      <Clipboard className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <code className="mt-3 block overflow-x-auto rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                    {selectedCertificate.githubBadgeMarkdown}
                  </code>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
