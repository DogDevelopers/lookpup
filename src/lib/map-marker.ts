const PIN_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 10.667 16 26 16 26S32 26.667 32 16C32 7.163 24.837 0 16 0z" fill="#FF6900" stroke="white" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="6" fill="white"/>
  </svg>`,
);

export const ORANGE_MARKER_URL = `data:image/svg+xml,${PIN_SVG}`;
export const ORANGE_MARKER_SIZE = { width: 32, height: 42, offsetX: 16, offsetY: 42 };
