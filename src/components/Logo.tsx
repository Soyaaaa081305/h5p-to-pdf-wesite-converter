import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

export const LogoMark: React.FC<LogoProps> = ({
  className = "",
  size = 32,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* Base layer sheet */}
      <rect
        x="4"
        y="4"
        width="20"
        height="26"
        rx="3.5"
        className="fill-zinc-800 dark:fill-zinc-700"
      />
      {/* Second overlay sheet */}
      <rect
        x="9"
        y="7"
        width="20"
        height="24"
        rx="3.5"
        className="fill-zinc-600 dark:fill-zinc-500"
      />
      {/* Front active sheet with folded corner */}
      <path
        d="M14 10.5C14 8.567 15.567 7 17.5 7H28.5C29.6046 7 30.5 7.89543 30.5 9V27C30.5 28.6569 29.1569 30 27.5 30H17.5C15.567 30 14 28.433 14 26.5V10.5Z"
        className="fill-zinc-50 dark:fill-zinc-100 stroke-zinc-900 dark:stroke-zinc-950"
        strokeWidth="1.25"
      />
      {/* Precision editorial grid lines on front sheet */}
      <line
        x1="18"
        y1="13"
        x2="26.5"
        y2="13"
        className="stroke-zinc-900 dark:stroke-zinc-900"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <line
        x1="18"
        y1="17.5"
        x2="24"
        y2="17.5"
        stroke="#71717a"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="18"
        y1="22"
        x2="26"
        y2="22"
        stroke="#71717a"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Accent focal dot */}
      <circle cx="27" cy="17.5" r="1.5" fill="#ef4444" />
    </svg>
  );
};

export const Logo: React.FC<LogoProps> = ({ className = "", size = 32 }) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />

      <div className="flex flex-col">
        <div className="m-0 flex items-center gap-1.5">
          <span className="font-sans text-sm font-semibold tracking-tight text-zinc-900 transition-colors dark:text-zinc-100">
            H5P to PDF
          </span>
          <span className="rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-700 transition-colors dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            Converter
          </span>
        </div>
      </div>
    </div>
  );
};
