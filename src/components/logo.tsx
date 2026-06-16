import Image from 'next/image';

export function PrismFilterLogo({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/prism-filter-logo.svg"
      alt="PRISM FILTER"
      width={size}
      height={size}
      priority
      className="object-contain"
    />
  );
}

export function BrandName() {
  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-bold tracking-tight">
        PRISM FILTER
      </h1>
      <p className="text-xs text-blue-600 font-semibold">정산 자동화 시스템</p>
    </div>
  );
}
