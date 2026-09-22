import { author, store } from "@/lib/store";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="font-medium text-foreground">
          {store.name} · {store.tagline}
        </p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <a href={author.portfolio} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
            Desenvolvido por {author.name}
          </a>
          <a href={author.repository} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
            GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}
