import { notFound } from "next/navigation";
import LegalLibraryRecordPage from "../../../../components/LegalLibraryRecordPage";
import { getLegalRecord, getLegalRecords, getLegalRecordTitle, isLegalRecordIndexable } from "../../../../lib/legal-library";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLegalRecords("terms").map((record) => ({ slug: record.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const record = getLegalRecord("terms", slug);
  if (!record) return { title: "مدخل پیدا نشد" };
  const title = getLegalRecordTitle("terms", record);
  return {
    title,
    description: record.definition,
    alternates: { canonical: record.path },
    robots: {
      index: isLegalRecordIndexable(record),
      follow: true,
      googleBot: { index: isLegalRecordIndexable(record), follow: true, "max-snippet": -1 },
    },
    openGraph: { type: "website", locale: "fa_IR", title, description: record.definition },
  };
}

export default async function LegalTermPage({ params }) {
  const { slug } = await params;
  const record = getLegalRecord("terms", slug);
  if (!record) notFound();
  return <LegalLibraryRecordPage type="terms" record={record} pageTitle={getLegalRecordTitle("terms", record)} />;
}
