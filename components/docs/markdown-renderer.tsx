import type { Components } from "react-markdown"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import clsx from "clsx"

interface MarkdownRendererProps {
  content: string
  className?: string
}

const markdownComponents: Components = {
  h1: ({ node, ...props }) => (
    <h2 className="mt-10 text-3xl font-serif text-foreground" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h3 className="mt-8 text-2xl font-serif text-foreground" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h4 className="mt-6 text-xl font-semibold text-foreground" {...props} />
  ),
  h4: ({ node, ...props }) => (
    <h5 className="mt-4 text-lg font-semibold text-foreground" {...props} />
  ),
  p: ({ node, ...props }) => (
    <p className="text-base leading-relaxed text-muted-foreground" {...props} />
  ),
  ul: ({ node, ordered, ...props }) => (
    <ul className="list-disc space-y-2 pl-6 text-muted-foreground" {...props} />
  ),
  ol: ({ node, ordered, ...props }) => (
    <ol className="list-decimal space-y-2 pl-6 text-muted-foreground" {...props} />
  ),
  li: ({ node, ...props }) => (
    <li className="leading-relaxed" {...props} />
  ),
  code: ({ inline, node, ...props }) =>
    inline ? (
      <code
        className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground"
        {...props}
      />
    ) : (
      <code className="font-mono text-sm text-primary" {...props} />
    ),
  pre: ({ node, ...props }) => (
    <pre className="overflow-x-auto rounded-lg bg-muted/70 p-4 text-sm text-foreground" {...props} />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground" {...props} />
  ),
  table: ({ node, ...props }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: ({ node, ...props }) => (
    <th className="border border-border bg-muted/60 px-3 py-2 text-left font-semibold" {...props} />
  ),
  td: ({ node, ...props }) => (
    <td className="border border-border px-3 py-2 align-top" {...props} />
  ),
  a: ({ node, ...props }) => (
    <a className="text-primary underline-offset-4 hover:underline" target="_blank" rel="noreferrer" {...props} />
  ),
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      className={clsx("space-y-4 leading-relaxed [&_strong]:font-semibold", className)}
      remarkPlugins={[remarkGfm]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  )
}
