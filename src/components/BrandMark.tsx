export function BrandMark() {
  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="2" y="2" width="24" height="24" rx="6" fill="#1D4ED8" />
        <path
          d="M8.5 7.5H16.5L20 11V20.5H8.5V7.5Z"
          fill="#FFFFFF"
        />
        <path d="M16.5 7.5V11H20L16.5 7.5Z" fill="#BFDBFE" />
        <path
          d="M11 14H17M11 17H15"
          stroke="#1D4ED8"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-display text-lg font-bold tracking-tight text-slate-900">
        FILEVIO
      </span>
    </span>
  );
}
