import { notFound } from "next/navigation";
import LegalLibraryRecordPage from "../../../../components/LegalLibraryRecordPage";
import { getLegalRecord, getLegalRecords, getLegalRecordTitle, isLegalRecordIndexable } from "../../../../lib/legal-library";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLegalRecords("articles").map((record) => ({ slug: record.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const record = getLegalRecord("articles", slug);
  if (!record) return { title: "مدخل پیدا نشد" };
  const title = getLegalRecordTitle("articles", record);
  const description = record.summary || `خلاصه پژوهشی ماده ${record.article_number} در کتابخانه حقوقی ایران.`;
  return {
    title,
    description,
    alternates: { canonical: record.path },
    robots: {
      index: isLegalRecordIndexable(record),
      follow: true,
      googleBot: { index: isLegalRecordIndexable(record), follow: true, "max-snippet": -1 },
    },
    openGraph: { type: "website", locale: "fa_IR", title, description },
  };
}

export default async function LegalArticlePage({ params }) {
  const { slug } = await params;
  const record = getLegalRecord("articles", slug);
  if (!record) notFound();
  return <LegalLibraryRecordPage type="articles" record={record} pageTitle={getLegalRecordTitle("articles", record)} />;
}
