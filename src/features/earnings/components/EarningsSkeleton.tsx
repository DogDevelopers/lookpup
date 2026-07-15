function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-gray-100 ${className}`} />;
}

export default function EarningsSkeleton() {
  return (
    <main className="w-full max-w-[1280px] mx-auto px-4 sm:px-10 pt-6 md:pt-12 pb-10 md:pb-20">
      <div className="mb-8 hidden md:block">
        <div className="h-7 w-32 rounded-lg bg-gray-100 animate-pulse mb-2" />
        <div className="h-4 w-72 rounded-lg bg-gray-100 animate-pulse" />
      </div>

      <div className="flex flex-col gap-6 md:gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Block className="h-[260px]" />
          <div className="flex flex-col sm:flex-row lg:flex-col gap-4">
            <Block className="h-[120px] flex-1" />
            <Block className="h-[120px] flex-1" />
          </div>
        </div>
        <Block className="h-[380px]" />
        <Block className="h-[420px]" />
        <Block className="h-[80px]" />
      </div>
    </main>
  );
}
