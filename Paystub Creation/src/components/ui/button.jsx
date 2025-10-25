export function Button({ children, onClick, className = "", variant, size, ...rest }) {
  return (
    <button onClick={onClick} className={"button " + className} {...rest}>
      {children}
    </button>
  );
}
