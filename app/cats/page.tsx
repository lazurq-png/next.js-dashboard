import { Metadata } from 'next';
import Link from 'next/link';
import { lusitana } from '@/app/ui/fonts';
import CatGallery from '@/app/ui/xenocats/cat-gallery';

export const metadata: Metadata = {
  title: 'Cats',
};

export default function Page() {
  return (
    <main className="mx-auto max-w-7xl p-6 md:p-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={`${lusitana.className} text-2xl md:text-3xl`}>The cats</h1>
          <p className="mt-1 text-sm text-gray-600">
            Every alien cat that haunts the dashboard, and what it does to your cursor. Summon one
            to try it.
          </p>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:text-blue-500">
          Back to the dashboard
        </Link>
      </div>
      <CatGallery />
    </main>
  );
}
