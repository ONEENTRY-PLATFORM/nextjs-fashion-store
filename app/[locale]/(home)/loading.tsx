import { HomeSkeleton } from '@/app/components/home/HomeSkeleton';

/** Loading UI for `/` only. */
export default function HomeLoading() {
  return (
    <div className="flex-1 bg-white font-sans" data-testid="route-loading">
      <HomeSkeleton />
    </div>
  );
}
