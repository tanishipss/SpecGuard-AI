// A restrained, technical visual for the login page's side panel — a mock
// document/evidence card and traceability flow, not a generic AI illustration.
const TRACE_STEPS = [
  { label: 'Specification', detail: 'TS 23.501 · §6.2.1' },
  { label: 'Control', detail: 'AMF functionality' },
  { label: 'Assessment', detail: 'Grounded response' },
  { label: 'Evidence', detail: 'Verified source', active: true },
  { label: 'Decision', detail: 'Compliance outcome' },
]

export function AuthVisualPanel() {
  return (
    <div className="relative flex flex-col justify-center overflow-hidden border-t border-divider bg-gradient-to-b from-ivory to-surface-2 px-6 py-12 md:h-full md:flex-1 md:border-t-0 md:bg-gradient-to-r md:from-ivory md:via-surface-2 md:to-surface-2 md:px-8 md:py-0 lg:pl-14 lg:pr-20 xl:pl-20 xl:pr-28">
      {/* Barely-there technical grid — texture, not decoration */}
      <div className="sidebar-texture pointer-events-none absolute inset-0" aria-hidden="true" />

      {/* Seam — a thin fading line at the column boundary so both halves
          read as one composition rather than two stacked panels. Only
          meaningful once the layout is side-by-side. */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-px bg-gradient-to-b from-transparent via-border-strong to-transparent md:block"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-[480px]">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-forest">3GPP · Release 17</p>
        <h2 className="mt-3 max-w-[480px] text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink md:text-[36px]">
          Every answer traces back to a real specification.
        </h2>
        <p className="mt-3 text-[13.5px] leading-[1.55] text-ink-muted">
          Ground compliance assessments in authoritative standards, controls, and evidence.
        </p>

        {/* Traceability timeline — typography and spacing carry the
            hierarchy, not cards. Inactive: light neutral circle, gray text.
            Active: forest circle, white number, forest label. */}
        <div className="mt-8">
          {TRACE_STEPS.map((step, i) => (
            <div key={step.label} className="flex gap-3.5">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${
                    step.active
                      ? 'border-forest bg-forest text-white'
                      : 'border-[#E3E4E1] bg-white text-ink-faint'
                  }`}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                {i < TRACE_STEPS.length - 1 && (
                  <span className="my-0.5 h-6 w-px flex-1 bg-[#D9DDD9]" aria-hidden="true" />
                )}
              </div>
              <div className={`pb-4 ${i === TRACE_STEPS.length - 1 ? 'pb-0' : ''}`}>
                <p
                  className={`text-[12px] font-semibold uppercase tracking-[0.05em] ${step.active ? 'text-forest' : 'text-ink'}`}
                >
                  {step.label}
                </p>
                <p className="font-mono text-[12px] text-ink-muted">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Retrieved Source — the evidence artifact behind the "Evidence"
            step above, the conclusion the timeline leads to. */}
        <div className="group mt-7 rounded-2xl border border-[#E4E6E2] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_8px_24px_rgba(0,0,0,0.03)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-border-strong">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Retrieved Source</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="rounded bg-sage-soft px-1.5 py-0.5 font-mono text-[11px] text-forest">SRC-001</span>
            <span className="font-mono text-[13px] font-medium text-ink">TS 23.501</span>
            <span className="font-mono text-[12px] text-ink-muted">§6.2.1 · Page 415</span>
          </div>
          <mark className="evidence-highlight mt-3 block border-l-2 border-forest py-1 pl-3 text-[13.5px] leading-relaxed">
            The Access and Mobility Management function (AMF) includes the following functionality…
          </mark>
          <div className="mt-4 flex items-center gap-1.5 text-[12px] font-medium text-success">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Grounded
          </div>
        </div>
      </div>
    </div>
  )
}
