import Image from 'next/image';

export function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= Math.floor(rating);
        const partial = !filled && i === Math.ceil(rating) && rating % 1 !== 0;
        const src = filled
          ? '/icons/ui/star-rating-filled.svg'
          : partial
          ? '/icons/ui/star-rating-half.svg'
          : '/icons/ui/star-rating-empty.svg';
        return <Image key={i} src={src} alt="" width={size} height={size} unoptimized />;
      })}
    </div>
  );
}
