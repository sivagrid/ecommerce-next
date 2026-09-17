interface StarRatingProps {
  average: number;
  count: number;
  showCount?: boolean;
}

export function StarRating({ average, count, showCount = true }: StarRatingProps) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < Math.floor(average)) return 'full';
    if (i < average) return 'half';
    return 'empty';
  });

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {stars.map((type, i) => (
          <svg key={i} className={`h-4 w-4 ${type === 'empty' ? 'text-gray-300' : 'text-yellow-400'}`} viewBox="0 0 20 20" fill={type === 'full' ? 'currentColor' : 'none'} stroke="currentColor">
            {type === 'half' ? (
              <>
                <defs>
                  <linearGradient id={`half-${i}`}>
                    <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
                    <stop offset="50%" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path fill={`url(#half-${i})`} strokeWidth="0" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </>
            ) : (
              <path strokeWidth={type === 'empty' ? '1' : '0'} d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            )}
          </svg>
        ))}
      </div>
      {showCount && (
        <span className="text-sm text-gray-500">
          {average.toFixed(1)} ({count})
        </span>
      )}
    </div>
  );
}
