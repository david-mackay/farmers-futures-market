import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  CROP_ENCYCLOPEDIA,
  findCropBySlug,
  formatCropLabel,
  getCropHref,
  getCropSlug,
} from '@/shared/crop-encyclopedia';

interface CropDetailPageProps {
  params: Promise<{ slug: string }>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-JM', {
    style: 'currency',
    currency: 'JMD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDaysRange(start: number, end: number) {
  return `${start}-${end} days`;
}

function formatTemperatureRange(min: number, max: number, optimal: number) {
  return `${min}-${max}°C range · optimal ${optimal}°C`;
}

function formatAltitudeRange(min: number, max: number) {
  return `${min}-${max} m`;
}

function formatSoilRange(min: number, max: number) {
  return `pH ${min}-${max}`;
}

export async function generateStaticParams() {
  return CROP_ENCYCLOPEDIA.map((crop) => ({ slug: getCropSlug(crop) }));
}

export async function generateMetadata({ params }: CropDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const crop = findCropBySlug(slug);

  if (!crop) {
    return {
      title: 'Crop Not Found | Future\'s Farmer\'s Market',
    };
  }

  return {
    title: `${crop.display_name} | Crop Encyclopedia`,
    description: `${crop.display_name}: planting season, harvest window, climate profile, and market pricing.`,
  };
}

export default async function CropDetailPage({ params }: CropDetailPageProps) {
  const { slug } = await params;
  const crop = findCropBySlug(slug);

  if (!crop) {
    notFound();
  }

  const relatedCrops = CROP_ENCYCLOPEDIA
    .filter((entry) => entry.category === crop.category && entry.id !== crop.id)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <section className="rounded-[2rem] border border-border bg-gradient-to-br from-card via-card to-secondary/15 px-6 py-8 sm:px-8 sm:py-10 shadow-sm">
        <Link href="/crops" className="inline-flex text-sm font-medium text-primary hover:underline">
          ← Back to encyclopedia
        </Link>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              {formatCropLabel(crop.category)}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              {crop.display_name}
            </h1>
            <p className="mt-3 text-base italic text-muted sm:text-lg">{crop.scientific_name}</p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
              {crop.display_name} is a {crop.lifecycle} crop best suited to {formatCropLabel(crop.sunlight)} conditions,
              with planting typically in {crop.planting_season} and harvest expected after {formatDaysRange(crop.harvest_start_days, crop.harvest_end_days)}.
            </p>
          </div>

          <div className="min-w-[15rem] rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Market Snapshot</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Farmgate</dt>
                <dd className="font-semibold text-foreground">{formatCurrency(crop.farmgate_price_jmd_per_kg)}/kg</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Wholesale</dt>
                <dd className="font-semibold text-foreground">{formatCurrency(crop.wholesale_price_jmd_per_kg)}/kg</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Retail</dt>
                <dd className="font-semibold text-foreground">{formatCurrency(crop.retail_price_jmd_per_kg)}/kg</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Yield</dt>
                <dd className="font-semibold text-foreground">{crop.yield_kg_per_hectare.toLocaleString()} kg/ha</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Growing Conditions</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted">Temperature</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {formatTemperatureRange(crop.temperature_min_c, crop.temperature_max_c, crop.optimal_temperature_c)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Sunlight</dt>
              <dd className="mt-0.5 font-medium text-foreground">{formatCropLabel(crop.sunlight)}</dd>
            </div>
            <div>
              <dt className="text-muted">Water</dt>
              <dd className="mt-0.5 font-medium text-foreground">{crop.water_mm_per_week} mm/week</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Land Profile</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted">Altitude</dt>
              <dd className="mt-0.5 font-medium text-foreground">{formatAltitudeRange(crop.altitude_min_m, crop.altitude_max_m)}</dd>
            </div>
            <div>
              <dt className="text-muted">Soil</dt>
              <dd className="mt-0.5 font-medium text-foreground">{formatSoilRange(crop.soil_ph_min, crop.soil_ph_max)}</dd>
            </div>
            <div>
              <dt className="text-muted">Lifecycle</dt>
              <dd className="mt-0.5 font-medium text-foreground">{formatCropLabel(crop.lifecycle)}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Production Window</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted">Planting Season</dt>
              <dd className="mt-0.5 font-medium text-foreground">{crop.planting_season}</dd>
            </div>
            <div>
              <dt className="text-muted">Harvest Begins</dt>
              <dd className="mt-0.5 font-medium text-foreground">{crop.harvest_start_days} days</dd>
            </div>
            <div>
              <dt className="text-muted">Harvest Window</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {formatDaysRange(crop.harvest_start_days, crop.harvest_end_days)}
              </dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pricing</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted">Farmgate</dt>
              <dd className="mt-0.5 font-medium text-foreground">{formatCurrency(crop.farmgate_price_jmd_per_kg)}/kg</dd>
            </div>
            <div>
              <dt className="text-muted">Wholesale</dt>
              <dd className="mt-0.5 font-medium text-foreground">{formatCurrency(crop.wholesale_price_jmd_per_kg)}/kg</dd>
            </div>
            <div>
              <dt className="text-muted">Retail</dt>
              <dd className="mt-0.5 font-medium text-foreground">{formatCurrency(crop.retail_price_jmd_per_kg)}/kg</dd>
            </div>
          </dl>
        </article>
      </section>

      {relatedCrops.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3 border-b border-border pb-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Related Crops</h2>
              <p className="text-sm text-muted">More in {formatCropLabel(crop.category)}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {relatedCrops.map((related) => (
              <Link
                key={related.id}
                href={getCropHref(related)}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <h3 className="text-lg font-semibold text-foreground">{related.display_name}</h3>
                <p className="mt-1 text-sm italic text-muted">{related.scientific_name}</p>
                <p className="mt-4 text-sm text-muted">
                  {related.planting_season} planting season · {related.water_mm_per_week} mm/week water
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
