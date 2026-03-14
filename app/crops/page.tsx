import Link from 'next/link';
import { Metadata } from 'next';
import {
  CROP_ENCYCLOPEDIA,
  formatCropLabel,
  getCropHref,
} from '@/shared/crop-encyclopedia';

export const metadata: Metadata = {
  title: 'Crop Encyclopedia | Future\'s Farmer\'s Market',
  description: 'Browse crop profiles, growing conditions, harvest windows, and price ranges.',
};

function formatDaysRange(start: number, end: number) {
  return `${start}-${end} days`;
}

function formatTemperatureRange(min: number, max: number) {
  return `${min}-${max}°C`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-JM', {
    style: 'currency',
    currency: 'JMD',
    maximumFractionDigits: 0,
  }).format(value);
}

const categories = [...new Set(CROP_ENCYCLOPEDIA.map((crop) => crop.category))];

export default function CropsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <section className="rounded-[2rem] border border-border bg-gradient-to-br from-card via-card to-primary/5 px-6 py-8 sm:px-8 sm:py-10 shadow-sm">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Crop Encyclopedia</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Growing knowledge for every crop in the market ecosystem.
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Browse planting seasons, harvest windows, climate preferences, and local price ranges for Jamaica-focused crops.
            Open any crop card for the full profile.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {categories.map((category) => (
              <a
                key={category}
                href={`#${category}`}
                className="rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {formatCropLabel(category)}
              </a>
            ))}
          </div>
        </div>
      </section>

      {categories.map((category) => {
        const crops = CROP_ENCYCLOPEDIA.filter((crop) => crop.category === category);

        return (
          <section key={category} id={category} className="space-y-4 scroll-mt-24">
            <div className="flex items-end justify-between gap-3 border-b border-border pb-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{formatCropLabel(category)}</h2>
                <p className="text-sm text-muted">{crops.length} crop{crops.length === 1 ? '' : 's'} in this category</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {crops.map((crop) => (
                <Link
                  key={crop.id}
                  href={getCropHref(crop)}
                  className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground group-hover:text-primary">{crop.display_name}</h3>
                      <p className="mt-1 text-sm italic text-muted">{crop.scientific_name}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {crop.lifecycle}
                    </span>
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <dt className="text-muted">Planting</dt>
                      <dd className="mt-0.5 font-medium text-foreground">{crop.planting_season}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Harvest</dt>
                      <dd className="mt-0.5 font-medium text-foreground">
                        {formatDaysRange(crop.harvest_start_days, crop.harvest_end_days)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Temperature</dt>
                      <dd className="mt-0.5 font-medium text-foreground">
                        {formatTemperatureRange(crop.temperature_min_c, crop.temperature_max_c)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Water</dt>
                      <dd className="mt-0.5 font-medium text-foreground">{crop.water_mm_per_week} mm/week</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Sunlight</dt>
                      <dd className="mt-0.5 font-medium text-foreground">{formatCropLabel(crop.sunlight)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Retail</dt>
                      <dd className="mt-0.5 font-medium text-foreground">
                        {formatCurrency(crop.retail_price_jmd_per_kg)}/kg
                      </dd>
                    </div>
                  </dl>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
