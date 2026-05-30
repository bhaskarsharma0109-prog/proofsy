import Link from "next/link";
import { notFound } from "next/navigation";
import { getTemplateDefinition, TEMPLATE_DEFINITIONS } from "@/lib/templates";

export default async function TemplatePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: templateId } = await params;

  if (!templateId || !TEMPLATE_DEFINITIONS.some((template) => template.id === templateId)) {
    notFound();
  }

  const template = getTemplateDefinition(templateId);
  const isModern = template.id === "modern";

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="border-b border-[var(--color-border)] bg-white/90 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">Template Preview</p>
            <h1 className="text-2xl font-bold text-[var(--color-foreground)] mt-1">{template.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/templates" className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-surface-alt)]">
              Back to templates
            </Link>
            <Link href={`/events/new?template=${encodeURIComponent(template.id)}`} className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary-dark)]">
              Use this template
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-[320px_1fr] gap-8">
        <aside className="bg-white rounded-2xl border border-[var(--color-border)] p-6 h-fit">
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">{template.desc}</p>
          <div className="flex flex-wrap gap-2 mt-5">
            {template.tags.map((tag) => (
              <span key={tag} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--color-surface-alt)] text-[var(--color-muted)]">
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-6 space-y-3 text-sm text-[var(--color-muted)]">
            <p>Recommended for formal training, workshops, and participant certificates.</p>
            <p>Use this preview to approve the visual style before issuing credentials.</p>
          </div>
        </aside>

        <section className="bg-white rounded-3xl border border-[var(--color-border)] p-6 md:p-10">
          {isModern ? (
            <div className="relative aspect-[1.414] overflow-hidden border border-fuchsia-200 bg-white shadow-inner">
              <div className="absolute inset-x-0 top-0 h-[3.2%] bg-fuchsia-700" />
              <div className="absolute left-0 top-0 h-[3.2%] w-[8%] bg-white [clip-path:polygon(0_0,100%_0,0_100%)]" />
              <div className="absolute left-[4%] top-0 h-[1.1%] w-[22%] bg-neutral-900" />
              <div className="absolute inset-x-0 bottom-0 h-[4.7%] bg-fuchsia-700" />
              <div className="absolute inset-x-0 bottom-[4.7%] h-[0.9%] bg-neutral-900" />
              <div className="absolute bottom-[-1%] right-[8%] h-[20%] w-[4%] skew-x-[-30deg] bg-neutral-900" />
              <div className="absolute bottom-[2%] right-[7.4%] h-[15%] w-[1%] skew-x-[-30deg] bg-white" />
              <div className="absolute bottom-[-1%] right-[2.8%] h-[18%] w-[3%] skew-x-[-30deg] bg-neutral-900" />

              <div className="relative z-10 flex items-center justify-between px-[5%] pt-[4.5%]">
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-black leading-none tracking-[-0.25em]">∞</span>
                  <span className="rounded-xl border border-slate-200 bg-sky-50 px-3 py-2 text-[10px] font-black leading-none">TECH<br />VISION</span>
                  <span className="block h-12 w-[294px] overflow-hidden">
                    <img src="/certificate-assets/snist-logo-strip.jpg" alt="NAAC NBA UGC accreditations" className="h-12 w-auto max-w-none" />
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <img src="/certificate-assets/snist-logo.jpg" alt="Sreenidhi Educational Group and SNIST" className="h-12 w-auto" />
                </div>
              </div>

              <div className="relative z-10 mt-[4.8%] text-center">
                <p className="text-2xl font-black uppercase tracking-wide text-blue-900">The Infinitix Club × Techvision Club</p>
                <p className="mt-3 text-xl font-black uppercase text-blue-900">Two-Day Student Training Program</p>
                <p className="text-base font-black text-blue-900">On</p>
                <p className="text-2xl font-black uppercase text-blue-900">Data Engineering</p>
                <p className="mt-1 text-base font-bold tracking-[0.12em] text-blue-900">(09-04-2026 to 10-04-2026)</p>
                <p className="mt-8 font-serif text-3xl font-black uppercase text-blue-900 underline underline-offset-4">Certificate of Participation</p>
                <p className="mx-auto mt-8 max-w-4xl px-10 font-serif text-xl font-bold leading-relaxed tracking-wide text-neutral-900">
                  This is to certify that <span className="inline-block min-w-64 border-b-2 border-neutral-400 px-4 font-sans text-lg">Bhaskar Sharma</span>,
                  a student of <span className="inline-block min-w-28 border-b-2 border-neutral-400 px-3 font-sans text-base">Third year</span>, Year
                  <span className="inline-block min-w-24 border-b-2 border-neutral-400 px-3 font-sans text-base">CSE</span>, Branch has successfully participated in A Two - Day Workshop on Data Engineering,
                  held from 09-04-2026 to 10-04-2026 at Sreenidhi Institute of Science and Technology (Autonomous), Ghatkesar, Hyderabad.
                </p>
              </div>

              <div className="absolute bottom-[8%] left-[7%] right-[10%] z-10 grid grid-cols-4 gap-10 text-center">
                {["Dr. K.T. Mahhe", "Mr. K. Abhijit Rao", "Dr. T. Ch. Siva Reddy", "Dr. Md. Jaffar Sadiq"].map((name, index) => (
                  <div key={name}>
                    <div className="mx-auto mb-3 h-0.5 w-32 bg-neutral-900" />
                    <p className="font-serif text-sm font-black leading-tight">{name}</p>
                    <p className="mt-1 text-[10px] font-bold leading-tight">{["Chairman", "CEO", "Principal", "Professor & Head"][index]}<br />{index === 0 ? "Sreenidhi Educational Group" : index === 3 ? "CSE - DS" : "SNIST"}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
          <div className={`rounded-[28px] border ${template.border} bg-gradient-to-br ${template.color} p-4 md:p-8 shadow-inner`}>
            <div className={`relative aspect-[1.414] bg-white rounded-[24px] border-2 ${template.accent} overflow-hidden flex items-center justify-center px-8 md:px-16`}>
              <div className="absolute inset-5 border border-[var(--color-border)] rounded-[20px]" />
              <div className="absolute top-0 left-0 w-40 h-40 bg-[var(--color-primary)] opacity-[0.05] rounded-br-[72px]" />
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-[var(--color-primary)] opacity-[0.05] rounded-tl-[72px]" />

              <div className="relative z-10 text-center max-w-3xl">
                <p className="text-xs md:text-sm uppercase tracking-[0.35em] text-[var(--color-muted)]">Proofsy</p>
                <h2 className="mt-4 text-3xl md:text-5xl font-bold text-[var(--color-foreground)]">Certificate of Completion</h2>
                <p className="mt-8 text-sm md:text-base text-[var(--color-muted)]">This certifies that</p>
                <h3 className="mt-4 text-3xl md:text-6xl font-bold text-[var(--color-primary)] leading-tight">Alexandra Morgan Lee</h3>
                <p className="mt-8 text-sm md:text-base text-[var(--color-muted)]">has successfully completed</p>
                <p className="mt-3 text-xl md:text-3xl font-semibold text-[var(--color-foreground)]">Enterprise Security Workshop 2026</p>

                <div className="mt-12 grid grid-cols-3 gap-4 items-end text-center">
                  <div>
                    <div className="border-t border-[var(--color-border)] pt-2 text-sm font-medium text-[var(--color-foreground)]">April 29, 2026</div>
                    <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mt-1">Date</p>
                  </div>
                  <div>
                    <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] flex items-center justify-center text-[10px] font-mono text-[var(--color-muted)]">
                      QR
                    </div>
                    <p className="text-[10px] md:text-xs font-mono text-[var(--color-primary)] mt-2">CERT-SAMPLE</p>
                  </div>
                  <div>
                    <div className="border-t border-[var(--color-border)] pt-2 text-sm font-medium text-[var(--color-foreground)]">Proofsy Academy</div>
                    <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mt-1">Organizer</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </section>
      </main>
    </div>
  );
}
