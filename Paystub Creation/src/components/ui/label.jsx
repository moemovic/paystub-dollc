export function Label({ children, className = "" }) {
  return <label className={`small ${className}`}>{children}</label>;
}
