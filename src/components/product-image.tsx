import Image from "next/image";

type Props = {
  path: string | null;
  alt: string | null;
  name: string;
  /** Larguras que o navegador pode escolher, conforme o espaço do card. */
  sizes: string;
  className?: string;
  priority?: boolean;
};

/**
 * Fotografia do produto em quadrado, com o fundo já pintado enquanto carrega —
 * assim o layout não salta. Produto sem foto mostra a inicial, em vez de um
 * espaço quebrado.
 */
export function ProductImage({ path, alt, name, sizes, className = "", priority = false }: Props) {
  const base = `relative aspect-square w-full overflow-hidden bg-surface-muted ${className}`;

  if (!path) {
    return (
      <div className={base} role="img" aria-label={`Sem fotografia de ${name}`}>
        <span className="absolute inset-0 grid place-items-center text-3xl font-semibold text-muted/60">
          {name.slice(0, 1)}
        </span>
      </div>
    );
  }

  return (
    <div className={base}>
      <Image
        src={path}
        alt={alt ?? name}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
