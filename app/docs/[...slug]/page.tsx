import { DocPageView } from "../_components/doc-page-view"

export const dynamic = "force-dynamic"

type DocsSlugPageProps = {
  params: {
    slug?: string[]
  }
}

export default function DocsSlugPage({ params }: DocsSlugPageProps) {
  const slug = params.slug ?? []
  return <DocPageView slug={slug} />
}
