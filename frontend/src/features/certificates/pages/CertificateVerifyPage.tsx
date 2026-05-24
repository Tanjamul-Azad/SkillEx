import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Award, BadgeCheck, Copy, ExternalLink, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Logo from '@/components/ui/Logo';
import { certificateService, type SkillCertificate } from '@/services/certificateService';
import { useToast } from '@/hooks/use-toast';

export default function CertificateVerifyPage() {
  const { code = '' } = useParams();
  const { toast } = useToast();
  const [certificate, setCertificate] = useState<SkillCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    certificateService.publicCertificate(code)
      .then((data) => {
        setCertificate(data);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Certificate not found.'))
      .finally(() => setLoading(false));
  }, [code]);

  const copyBadge = async () => {
    if (!certificate) return;
    await navigator.clipboard.writeText(certificate.githubBadgeMarkdown);
    toast({ title: 'GitHub badge copied', variant: 'success' });
  };

  const downloadText = () => {
    if (!certificate) return;
    window.open(`/api/public/certificates/${certificate.verificationCode}/pdf`, '_blank');
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <Logo size="lg" />
          <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary">Public verification</Badge>
        </div>

        {loading ? (
          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="py-16 text-center text-slate-300">Checking credential...</CardContent>
          </Card>
        ) : error || !certificate ? (
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="flex items-center gap-3 py-10 text-red-100">
              <ShieldAlert className="h-6 w-6" />
              {error ?? 'Certificate not found.'}
            </CardContent>
          </Card>
        ) : (
          <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl">
            <div className="border-b border-white/10 bg-gradient-to-r from-primary/15 via-cyan-500/10 to-emerald-500/10 px-8 py-7">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">SkillEX Credential</p>
                  <h1 className="mt-3 font-headline text-3xl font-black md:text-5xl">{certificate.title}</h1>
                </div>
                <div className="flex items-center gap-3">
                  {certificate.status === 'ACTIVE' ? (
                    <Badge className="rounded-full bg-emerald-500/15 px-4 py-2 text-emerald-300">
                      <BadgeCheck className="mr-2 h-4 w-4" /> Verified active
                    </Badge>
                  ) : (
                    <Badge className="rounded-full bg-red-500/15 px-4 py-2 text-red-300">
                      <ShieldAlert className="mr-2 h-4 w-4" /> Revoked
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6 p-8">
                <div>
                  <p className="text-sm uppercase tracking-widest text-slate-400">Awarded to</p>
                  <p className="mt-2 text-3xl font-black">{certificate.userName}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Info label="Skill" value={certificate.skillName} />
                  <Info label="Level" value={certificate.levelLabel} />
                  <Info label="Trust score" value={`${certificate.trustScoreSnapshot}/100`} />
                  <Info label="Sessions" value={String(certificate.sessionCountSnapshot)} />
                  <Info label="Rating snapshot" value={Number(certificate.averageRatingSnapshot).toFixed(1)} />
                  <Info label="Issued" value={new Date(certificate.issuedAt).toLocaleDateString()} />
                </div>
                {certificate.status !== 'ACTIVE' && (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                    This credential has been revoked. {certificate.revokedReason}
                  </div>
                )}
              </div>

              <aside className="border-t border-white/10 bg-slate-900/50 p-8 md:border-l md:border-t-0">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/15 text-primary">
                  <Award className="h-12 w-12" />
                </div>
                <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Verification code</p>
                <p className="mt-2 break-all font-mono text-sm text-slate-100">{certificate.verificationCode}</p>
                <div className="mt-6 flex flex-col gap-3">
                  <Button className="rounded-full" onClick={copyBadge}>
                    <Copy className="mr-2 h-4 w-4" /> Copy GitHub badge
                  </Button>
                  <Button variant="outline" className="rounded-full border-white/15 bg-white/5" onClick={downloadText}>
                    <ExternalLink className="mr-2 h-4 w-4" /> Download certificate
                  </Button>
                </div>
              </aside>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-100">{value}</p>
    </div>
  );
}
