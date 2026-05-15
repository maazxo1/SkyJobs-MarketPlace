const Sk = ({ className = '' }) => (
  <div className={`skeleton ${className}`} />
);

export const JobCardSkeleton = () => (
  <div className="card p-6 flex flex-col gap-4">
    <div className="flex items-center justify-between gap-2">
      <Sk className="h-3 w-20" />
      <Sk className="h-5 w-16 rounded-full" />
    </div>
    <Sk className="h-5 w-3/4" />
    <Sk className="h-3 w-full" />
    <Sk className="h-3 w-5/6" />
    <div className="flex gap-2 mt-1">
      <Sk className="h-6 w-16" />
      <Sk className="h-6 w-20" />
      <Sk className="h-6 w-14" />
    </div>
    <div className="border-t border-[var(--border)] pt-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sk className="w-7 h-7 rounded-lg" />
        <Sk className="h-3 w-20" />
      </div>
      <div className="text-right">
        <Sk className="h-4 w-24 mb-1" />
        <Sk className="h-3 w-16" />
      </div>
    </div>
  </div>
);

export const BidRowSkeleton = () => (
  <div className="px-6 py-4 flex items-center gap-5">
    <div className="flex-1 space-y-2">
      <Sk className="h-4 w-48" />
      <Sk className="h-3 w-32" />
    </div>
    <Sk className="h-6 w-20 rounded-full" />
  </div>
);

export const JobRowSkeleton = () => (
  <div className="px-6 py-5 flex items-start gap-4">
    <div className="flex-1 space-y-2.5">
      <Sk className="h-3 w-28" />
      <Sk className="h-4 w-2/3" />
      <Sk className="h-3 w-full" />
      <div className="flex gap-1.5 pt-0.5">
        <Sk className="h-5 w-14 rounded-md" />
        <Sk className="h-5 w-16 rounded-md" />
        <Sk className="h-5 w-12 rounded-md" />
      </div>
    </div>
    <div className="shrink-0 flex flex-col items-end gap-2 pt-0.5">
      <Sk className="h-4 w-24" />
      <Sk className="h-5 w-16 rounded-full" />
    </div>
  </div>
);

export const StatsSkeleton = () => (
  <div className="card p-5 flex flex-col gap-3">
    <Sk className="h-1 w-8 rounded-full" />
    <Sk className="h-7 w-16" />
    <Sk className="h-3 w-24" />
  </div>
);

export default Sk;
