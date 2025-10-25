export function Card({ children, className = "" }) {
  return <div className={`card ${className}`}>{children}</div>;
}
export function CardHeader({ children, className = "" }) {
  return <div style={{borderBottom: "1px solid #eef2f7", paddingBottom:8}} className={className}>{children}</div>;
}
export function CardTitle({ children }) {
  return <div className="font-bold">{children}</div>;
}
export function CardContent({ children }) {
  return <div style={{paddingTop:8}}>{children}</div>;
}
