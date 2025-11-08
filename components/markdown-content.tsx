import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import Link from "next/link"

type MarkdownContentProps = {
  content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="max-w-none text-base leading-relaxed space-y-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mt-8 mb-3" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mt-6 mb-2" {...props} />,
          h4: ({ node, ...props }) => <h4 className="text-lg font-semibold mt-4 mb-2" {...props} />,
          p: ({ node, ...props }) => <p className="leading-relaxed mt-4" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc ml-6 mt-4 space-y-2" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal ml-6 mt-4 space-y-2" {...props} />,
          li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
          pre: ({ node, ...props }) => (
            <pre className="bg-secondary/60 text-sm rounded-lg p-4 overflow-auto mt-4" {...props} />
          ),
          code: ({ node, inline, className, children, ...props }) => {
            if (inline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              )
            }
            return (
              <code className={`block text-sm font-mono ${className || ""}`} {...props}>
                {children}
              </code>
            )
          },
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto mt-4">
              <table className="w-full border border-border text-sm" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-muted/50" {...props} />,
          th: ({ node, ...props }) => <th className="text-left font-semibold p-2 border border-border" {...props} />,
          td: ({ node, ...props }) => <td className="p-2 border border-border align-top" {...props} />,
          a: ({ node, href, children, ...props }) => {
            if (!href) return <span {...props}>{children}</span>
            const isInternal = href.startsWith("/")
            if (isInternal) {
              return (
                <Link href={href} {...props} className="text-primary hover:underline">
                  {children}
                </Link>
              )
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                {...props}
              >
                {children}
              </a>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
