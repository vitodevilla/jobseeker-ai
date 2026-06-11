import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type MarkdownContentProps = {
  children: string;
  className?: string;
};

const allowedMarkdownElements = [
  "a",
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
] as const;

function getSafeHref(href: string) {
  const trimmedHref = href.trim();

  if (!trimmedHref) {
    return null;
  }

  if (trimmedHref.startsWith("#")) {
    return trimmedHref;
  }

  if (trimmedHref.startsWith("/") && !trimmedHref.startsWith("//")) {
    return trimmedHref;
  }

  try {
    const url = new URL(trimmedHref);

    if (
      url.protocol === "http:" ||
      url.protocol === "https:" ||
      url.protocol === "mailto:"
    ) {
      return trimmedHref;
    }
  } catch {
    return null;
  }

  return null;
}

function transformMarkdownUrl(url: string, key: string) {
  if (key !== "href") {
    return "";
  }

  return getSafeHref(url) ?? "";
}

const markdownComponents: Components = {
  a({ children, href }) {
    const safeHref = typeof href === "string" ? getSafeHref(href) : null;

    if (!safeHref) {
      return <span className="wrap-break-word">{children}</span>;
    }

    const normalizedHref = safeHref.toLowerCase();
    const isExternalLink =
      normalizedHref.startsWith("http:") ||
      normalizedHref.startsWith("https:") ||
      normalizedHref.startsWith("mailto:");

    return (
      <a
        href={safeHref}
        target={isExternalLink ? "_blank" : undefined}
        rel={isExternalLink ? "noreferrer" : undefined}
        className="wrap-break-word font-medium text-foreground underline underline-offset-4"
      >
        {children}
      </a>
    );
  },
  blockquote({ children }) {
    return (
      <blockquote className="rounded-r-md border-l-2 border-muted-foreground/30 bg-muted/30 py-1 pl-3 text-muted-foreground">
        {children}
      </blockquote>
    );
  },
  code({ children, className }) {
    return (
      <code
        className={cn(
          "rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]",
          className,
        )}
      >
        {children}
      </code>
    );
  },
  h1({ children }) {
    return (
      <h1 className="text-base font-semibold leading-snug tracking-tight text-foreground">
        {children}
      </h1>
    );
  },
  h2({ children }) {
    return (
      <h2 className="text-sm font-semibold leading-snug tracking-tight text-foreground">
        {children}
      </h2>
    );
  },
  h3({ children }) {
    return <h3 className="text-sm font-semibold text-foreground">{children}</h3>;
  },
  h4({ children }) {
    return <h4 className="text-sm font-medium text-foreground">{children}</h4>;
  },
  li({ children }) {
    return <li className="pl-1">{children}</li>;
  },
  ol({ children }) {
    return <ol className="ml-5 list-decimal space-y-1.5">{children}</ol>;
  },
  p({ children }) {
    return <p className="wrap-break-word">{children}</p>;
  },
  pre({ children }) {
    return (
      <pre className="overflow-x-auto rounded-md border bg-muted/60 p-3 font-mono text-xs leading-5 [&_code]:rounded-none [&_code]:bg-transparent [&_code]:p-0">
        {children}
      </pre>
    );
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-left">
          {children}
        </table>
      </div>
    );
  },
  tbody({ children }) {
    return <tbody className="divide-y">{children}</tbody>;
  },
  td({ children }) {
    return <td className="border px-2 py-1 align-top">{children}</td>;
  },
  th({ children }) {
    return (
      <th className="border bg-muted/60 px-2 py-1 font-semibold align-top">
        {children}
      </th>
    );
  },
  thead({ children }) {
    return <thead>{children}</thead>;
  },
  tr({ children }) {
    return <tr>{children}</tr>;
  },
  ul({ children }) {
    return <ul className="ml-5 list-disc space-y-1.5">{children}</ul>;
  },
};

export function MarkdownContent({ children, className }: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "space-y-3.5 wrap-break-word text-sm leading-6",
        className,
      )}
    >
      <ReactMarkdown
        allowedElements={allowedMarkdownElements}
        components={markdownComponents}
        remarkPlugins={[remarkGfm]}
        skipHtml
        unwrapDisallowed
        urlTransform={transformMarkdownUrl}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
