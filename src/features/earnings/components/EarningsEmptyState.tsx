import type { ReactNode } from "react";

export default function EarningsEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "py-12",
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <div className="w-12 h-12 bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center mb-3">
        <Icon size={22} className="text-gray-300" />
      </div>
      <p className="font-semibold text-stone-900 text-sm mb-1">{title}</p>
      <p className="text-xs text-gray-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
