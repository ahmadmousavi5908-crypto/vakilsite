import { notFound } from "next/navigation";
import LegalLibraryRecordPage from "../../../../components/LegalLibraryRecordPage";
import { getLegalRecord, getLegalRecords, getLegalRecordTitle, isLegalRecordIndexable } from "../../../../lib/legal-library";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLegalRecords("laws").map((record) => ({ slug: record.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const record = getLegalRecord("laws", slug);
  if (!record) return { title: "مدخل پیدا نشد" };
  const title = getLegalRecordTitle("laws", record);
  const description = record.notes || `اطلاعات پژوهشی درباره ${record.title} و پیوند به مواد و اصطلاحات مرتبط.`;
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

export default async function LegalLawPage({ params }) {
  const { slug } = await params;
  const record = getLegalRecord("laws", slug);
  if (!record) notFound();
  return <LegalLibraryRecordPage type="laws" record={record} pageTitle={getLegalRecordTitle("laws", record)} />;
}
