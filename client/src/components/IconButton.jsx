export default function IconButton({ children, className = "", label, ...props }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`icon-button ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
