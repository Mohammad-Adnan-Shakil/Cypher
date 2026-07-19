export default function LogoMark({ size = 28, className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="#ff2d78"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2L21 7V19L12 23L3 19V7L12 2ZM12 5.5L6.5 8.5V17.5L12 20.5L17.5 17.5V8.5L12 5.5Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 8.5L16.5 11V15.5L12 18.5L7.5 15.5V11L12 8.5ZM14 12L12 10.5L10 12V14.5L12 16L14 14.5V12Z"
      />
    </svg>
  );
}
