export function BrandMark({ className = "size-8" }: { className?: string }) {
  return (
    <img
      src="/logo.webp"
      alt=""
      width={128}
      height={128}
      className={`block ${className}`}
    />
  );
}
