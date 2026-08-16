import { Link } from 'react-router-dom'
import { useDocuments } from '../hooks/useDocuments'
import { KnowledgeBaseCards } from '../components/KnowledgeBaseCards'

const FEATURES = [
  {
    title: 'Hybrid Retrieval',
    description: 'Dense + sparse retrieval combined with Reciprocal Rank Fusion.',
  },
  {
    title: 'Precision Reranking',
    description: 'Cross-encoder relevance scoring selects the most relevant evidence.',
  },
  {
    title: 'Evidence Explorer',
    description: 'Inspect the actual passages the model saw before it answered.',
  },
]

export function LandingPage() {
  const { data: documents } = useDocuments()

  const specCount = documents?.length ?? null
  const totalChunks = documents?.reduce((sum, d) => sum + d.chunk_count, 0) ?? null
  const release = documents?.[0]?.release ?? 'Rel-17'
  const lastIndexed = documents?.length
    ? new Date(
        Math.max(...documents.map((d) => new Date(d.ingested_at).getTime())),
      ).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-ivory text-ink">
      {/* Header */}
      <header className="glass-sidebar sticky top-0 z-30 border-b border-border/70">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-6 lg:px-10">
          <span className="flex items-center gap-2.5">
            <span className="icon-tile flex h-8 w-8 items-center justify-center rounded-lg bg-forest text-base font-semibold text-ivory">
              ◈
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">SpecGuard AI</span>
          </span>

          <nav className="hidden items-center gap-8 text-[14px] font-medium text-ink-muted md:flex">
            <a href="#product" className="hover:text-ink">
              Product
            </a>
            <a href="#knowledge-base" className="hover:text-ink">
              Knowledge Base
            </a>
            <a href="#how-it-works" className="hover:text-ink">
              How It Works
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="text-[14px] font-medium text-ink-muted hover:text-ink">
              Sign In
            </Link>
            <Link
              to="/signup"
              className="rounded-[10px] bg-forest px-4 py-2 text-[14px] font-medium text-ivory transition-[background-color,transform] duration-150 hover:bg-forest-hover active:scale-[0.98]"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — two-column, ~85vh */}
      <section
        id="product"
        className="mx-auto flex min-h-[85vh] max-w-7xl flex-col items-center gap-14 px-6 py-16 lg:flex-row lg:items-center lg:gap-16 lg:px-10 lg:py-0"
      >
        <div className="max-w-xl text-center lg:text-left">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-sage">Specification Intelligence</p>
          <p className="mt-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-forest">
            3GPP · Release 17
          </p>
          <h1 className="mt-4 text-[48px] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[56px]">
            Grounded intelligence
            <br />
            for 3GPP standards.
          </h1>
          <p className="mt-6 text-[17px] leading-relaxed text-ink-muted">
            Ask questions across 3GPP Release 17 standards and inspect the evidence behind every answer.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link
              to="/signup"
              className="rounded-[10px] bg-forest px-6 py-3 text-[15px] font-medium text-ivory transition-[background-color,transform] duration-150 hover:bg-forest-hover active:scale-[0.98]"
            >
              Explore 3GPP Knowledge Base →
            </Link>
            <a
              href="#how-it-works"
              className="rounded-[10px] border border-border px-6 py-3 text-[15px] font-medium text-ink transition-colors duration-150 hover:border-sage"
            >
              See How It Works
            </a>
          </div>

          {/* Product telemetry strip — real corpus figures, not marketing stats */}
          <div className="mt-12 flex justify-center divide-x divide-border lg:justify-start">
            {[
              { value: specCount !== null ? String(specCount).padStart(2, '0') : '—', label: 'Standards indexed' },
              { value: totalChunks !== null ? totalChunks.toLocaleString() : '—', label: 'Evidence chunks' },
              { value: specCount !== null && specCount > 0 ? '100%' : '—', label: 'Embedded' },
            ].map((s) => (
              <div key={s.label} className="px-6 first:pl-0">
                <p className="font-display text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink">
                  {s.value}
                </p>
                <p className="mt-1.5 text-[11.5px] text-ink-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Premium product preview — a real evidence artifact, not a marketing card */}
        <div className="card-hero w-full max-w-md shrink-0 rounded-2xl border border-l-2 border-l-forest bg-surface p-7 text-left">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">User Question</p>
          <p className="mt-2 text-[15px] text-ink">What is the role of the AMF?</p>

          <div className="mt-5 h-px bg-border" />

          <p className="mt-5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
            Retrieved Evidence
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="rounded bg-sage-soft px-1.5 py-0.5 font-mono text-[10.5px] text-forest">SRC-001</span>
            <span className="font-mono text-[13px] font-medium text-ink">TS 23.501</span>
            <span className="font-mono text-[12px] text-ink-muted">§6.2.1 · Page 415</span>
          </div>

          <div className="mt-5 h-px bg-border" />

          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Grounded Answer</p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink">
            The AMF handles registration, connection, reachability, and mobility management for the UE…
          </p>

          <div className="mt-5 h-px bg-border" />

          <div className="mt-5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-success">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Source Verified
            </span>
            <button type="button" disabled className="text-[12.5px] font-medium text-forest opacity-70" aria-hidden="true">
              View Evidence →
            </button>
          </div>
        </div>
      </section>

      {/* Knowledge base */}
      <section id="knowledge-base" className="mx-auto max-w-4xl px-6 py-24">
        <p className="text-center font-mono text-[11px] font-semibold uppercase tracking-wide text-forest">3GPP · Release 17</p>
        <h2 className="mt-3 text-center text-[32px] font-display font-semibold tracking-tight text-ink">
          Your standards knowledge base
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-[15px] leading-relaxed text-ink-muted">
          Indexed specifications available for evidence-grounded retrieval.
        </p>

        {documents && documents.length > 0 && (
          <div className="mx-auto mt-8 flex max-w-fit flex-wrap justify-center divide-x divide-border rounded-xl border border-border bg-surface px-2 py-3.5">
            {[
              { value: String(specCount).padStart(2, '0'), label: 'Specifications' },
              { value: totalChunks!.toLocaleString(), label: 'Chunks' },
              { value: release, label: 'Release' },
              { value: lastIndexed ?? '—', label: 'Last indexed' },
            ].map((s) => (
              <div key={s.label} className="px-5 text-center">
                <p className="text-[15px] font-semibold text-ink">{s.value}</p>
                <p className="mt-0.5 text-[11px] text-ink-muted">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10">
          <KnowledgeBaseCards documents={documents ?? []} />
        </div>
      </section>

      {/* Evidence architecture — a real retrieval pipeline, not a 3-card feature grid */}
      <section id="how-it-works" className="border-t border-border bg-surface-2/40 px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-forest">
            How SpecGuard AI Grounds Answers
          </p>
          <h2 className="mt-3 text-[34px] font-display font-semibold tracking-tight text-ink">Answers you can inspect.</h2>
          <p className="mx-auto mt-4 max-w-lg text-[15.5px] leading-relaxed text-ink-muted">
            SpecGuard AI doesn&apos;t just return an answer. It shows the standards evidence behind it.
          </p>
          <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-faint">
            3GPP · Release 17 · Evidence-Grounded Retrieval
          </p>
        </div>

        {/* The pipeline — a single connected column, compact stages leading
            up to the evidence artifact and the grounded answer it produces */}
        <div className="mx-auto mt-14 flex max-w-[640px] flex-col">
          {/* 01 Question */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface font-mono text-[10px] font-semibold text-ink-faint">
                01
              </span>
              <span className="my-0.5 w-px flex-1 bg-border-strong" aria-hidden="true" />
            </div>
            <div className="flex-1 pb-6">
              <p className="text-[13px] font-semibold text-ink">Question</p>
              <p className="mt-1 text-[14px] italic leading-relaxed text-ink-muted">&quot;What is the role of the AMF?&quot;</p>
            </div>
          </div>

          {/* 02 Hybrid Retrieval — tangible detail, not an abstract label */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface font-mono text-[10px] font-semibold text-ink-faint">
                02
              </span>
              <span className="my-0.5 w-px flex-1 bg-border-strong" aria-hidden="true" />
            </div>
            <div className="flex-1 pb-6">
              <p className="text-[13px] font-semibold text-ink">Hybrid Retrieval</p>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5 text-[12.5px] text-ink-muted">
                <span><span className="font-medium text-ink">Dense</span> · Semantic similarity</span>
                <span><span className="font-medium text-ink">Sparse</span> · Keyword matching</span>
                <span><span className="font-medium text-ink">Fusion</span> · Reciprocal Rank Fusion</span>
              </div>
            </div>
          </div>

          {/* 03 Precision Reranking — the actual candidate → score → top evidence chain */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface font-mono text-[10px] font-semibold text-ink-faint">
                03
              </span>
              <span className="my-0.5 w-px flex-1 bg-border-strong" aria-hidden="true" />
            </div>
            <div className="flex-1 pb-7">
              <p className="text-[13px] font-semibold text-ink">Precision Reranking</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-muted">
                <span>Candidate passages</span>
                <span aria-hidden="true">→</span>
                <span>Cross-encoder scoring</span>
                <span aria-hidden="true">→</span>
                <span className="font-medium text-ink">Top evidence</span>
              </p>
            </div>
          </div>

          {/* 04 Source Evidence — the hero artifact */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-forest bg-forest font-mono text-[10px] font-semibold text-white">
                04
              </span>
              <span className="my-0.5 w-px flex-1 bg-border-strong" aria-hidden="true" />
            </div>
            <div className="flex-1 pb-7">
              <p className="text-[13px] font-semibold text-forest">Source Evidence</p>

              <div className="group mt-3 rounded-2xl border border-[#E4E6E2] border-l-2 border-l-forest bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_8px_24px_rgba(0,0,0,0.03)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-border-strong">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Retrieved Source</p>
                  <span className="rounded bg-sage-soft px-1.5 py-0.5 font-mono text-[10.5px] text-forest">SRC-001</span>
                </div>
                <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-mono text-[14px] font-medium text-ink">TS 23.501</span>
                  <span className="font-mono text-[12.5px] text-ink-muted">§6.2.1 · Page 415</span>
                </div>

                <mark className="evidence-highlight mt-4 block border-l-2 border-forest py-1 pl-3 text-[14.5px] leading-relaxed">
                  The Access and Mobility Management function (AMF) includes the following functionality…
                </mark>

                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-divider pt-4 text-left">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-faint">Source</p>
                    <p className="mt-0.5 font-mono text-[12px] text-ink">3GPP Rel-17</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-faint">Status</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[12px] font-medium text-success">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Grounded
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-faint">Page</p>
                    <p className="mt-0.5 font-mono text-[12px] text-ink">415</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 05 Grounded Answer + Citation — the conclusion, visually tied to its citation */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface font-mono text-[10px] font-semibold text-ink-faint">
                05
              </span>
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-ink">Grounded Answer</p>
              <div className="mt-3 rounded-2xl border border-border bg-surface p-6 text-left">
                <p className="text-[14.5px] leading-relaxed text-ink">
                  The AMF handles registration, connection, reachability, and mobility management for the UE.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-3.5">
                  <span className="flex items-center gap-1.5 font-mono text-[12px] text-ink-muted">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest" aria-hidden="true">
                      <path d="M7 8h10M7 12h10M7 16h6M5 3h14a1 1 0 0 1 1 1v16l-4-3H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    TS 23.501 · §6.2.1 · Page 415
                  </span>
                  <span className="flex items-center gap-1 text-[12px] font-medium text-success">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Source verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical capabilities — a compact spec strip, not a feature grid */}
        <div className="mx-auto mt-16 max-w-4xl border-t border-divider pt-10">
          <div className="grid grid-cols-1 divide-y divide-divider sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {FEATURES.map((feature, i) => (
              <div key={feature.title} className="px-0 py-5 text-left sm:px-6 sm:py-0 sm:first:pl-0">
                <span className="font-mono text-[11px] text-ink-faint">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-1.5 text-[13.5px] font-semibold text-ink">{feature.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <h2 className="text-[28px] font-display font-semibold tracking-tight text-ink">Ready to explore the standards?</h2>
        <Link
          to="/signup"
          className="mt-6 inline-block rounded-xl bg-forest px-6 py-3 text-[15px] font-medium text-ivory hover:bg-forest-hover active:scale-[0.98]"
        >
          Open SpecGuard AI →
        </Link>
      </section>
    </div>
  )
}
