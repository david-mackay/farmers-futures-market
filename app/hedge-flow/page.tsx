'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CropType, HedgeFlowCalculation, OrderType } from '@/shared/types';
import { CROP_LABELS, CROP_UNIT, CROP_YIELD_PER_ACRE } from '@/shared/constants';
import { api } from '@/lib/api-client';
import { useUser } from '@/hooks/use-user';
import { useDevMode } from '@/hooks/use-dev-mode';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatPrice, formatRevenue, formatQuantity } from '@/lib/format';
import Link from 'next/link';

const cropOptions = Object.entries(CROP_LABELS).map(([value, label]) => ({ value, label }));

function HedgeFlowContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const devMode = useDevMode();

  const [step, setStep] = useState(1);
  const [cropType, setCropType] = useState(searchParams.get('crop') || '');
  const [acreage, setAcreage] = useState('');
  const [calc, setCalc] = useState<HedgeFlowCalculation | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [quantityKg, setQuantityKg] = useState('');
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState('');

  const isVerifiedFarmer = user?.is_farmer && user?.is_verified;

  const calculateYield = async () => {
    if (!cropType || !acreage || parseFloat(acreage) <= 0) return;
    setCalcLoading(true);
    try {
      const data = await api.get<HedgeFlowCalculation>(
        `/api/analytics/hedge-flow?crop_type=${cropType}&acreage=${acreage}`
      );
      setCalc(data);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCalcLoading(false);
    }
  };

  const postSellOrder = async () => {
    const kg = parseInt(quantityKg, 10);
    if (!calc || !deliveryDate || !devMode || !quantityKg || isNaN(kg) || kg <= 0) return;
    setPosting(true);
    setError('');
    try {
      await api.post('/api/orders', {
        crop_type: calc.crop_type,
        type: OrderType.ASK,
        price: calc.recommended_price,
        quantity: kg,
        delivery_date: deliveryDate,
      });
      setPosted(true);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  const quantityKgNum = parseInt(quantityKg, 10) || 0;
  const projectedRevenueFromKg = calc && quantityKgNum > 0 ? quantityKgNum * calc.recommended_price : calc?.projected_revenue ?? 0;

  if (!isVerifiedFarmer) {
    return (
      <div className="flex flex-col min-h-0">
        <section className="border-b border-border pb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Hedge Flow</h1>
        </section>
        <section className="border-b border-border py-8 px-4 text-center">
          <h2 className="text-lg font-semibold mb-2">Verified Farmers Only</h2>
          <p className="text-muted mb-4">You need to be a verified farmer to use the Hedge Flow tool.</p>
          <Link href="/profile" className="inline-block touch-manipulation">
            <Button variant="outline" className="min-h-[2.75rem]">Go to Profile</Button>
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      <section className="border-b border-border pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Hedge Flow</h1>
        <p className="text-muted text-xs sm:text-sm mt-1">
          Calculate expected yield and lock in prices (per kg) with a sell order
        </p>
      </section>

      {/* Steps indicator: wrap on small screens */}
      <section className="border-b border-border py-3">
      <div className="flex flex-wrap items-center gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              ${step >= s ? 'bg-primary text-white' : 'bg-muted-bg text-muted'}
            `}>
              {s}
            </div>
            <span className={`text-sm ${step >= s ? 'text-foreground font-medium' : 'text-muted'}`}>
              {s === 1 ? 'Select & Input' : s === 2 ? 'Review Yield' : 'Confirmed'}
            </span>
            {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-primary' : 'bg-border'}`} />}
          </div>
        ))}
      </div>
      </section>

      {/* Step 1: Input */}
      <section className={`border-b border-border py-4 ${step !== 1 && !posted ? 'opacity-60' : ''}`}>
        <h2 className="text-base font-semibold text-foreground mb-3">Step 1: Choose Crop & Acreage</h2>
        <div className="mt-4 space-y-4">
          <Select
            label="Crop Type"
            value={cropType}
            onChange={(e) => setCropType(e.target.value)}
            options={cropOptions}
            placeholder="Select crop..."
          />
          <Input
            label="Acreage"
            type="number"
            min="0.1"
            step="0.1"
            value={acreage}
            onChange={(e) => setAcreage(e.target.value)}
            placeholder="e.g. 50"
          />
          {step === 1 && (
            <Button onClick={calculateYield} disabled={!cropType || !acreage || calcLoading} className="w-full min-h-[2.75rem] touch-manipulation">
              {calcLoading ? 'Calculating...' : 'Calculate Expected Yield'}
            </Button>
          )}
        </div>
      </section>

      {/* Step 2: Review & Post */}
      {calc && step >= 2 && (
        <section className="border-b border-border py-4">
          <h2 className="text-base font-semibold text-foreground mb-3">Step 2: Review & Lock In Price (per kg)</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-muted-bg rounded-lg p-4">
              <div className="text-xs text-muted uppercase font-bold">Expected Yield</div>
              <div className="text-2xl font-bold font-data mt-1">
                {formatQuantity(calc.expected_yield, calc.crop_type)}
              </div>
              <div className="text-xs text-muted mt-1">
                {acreage} acres x {CROP_YIELD_PER_ACRE[calc.crop_type]} {CROP_UNIT[calc.crop_type]}/acre
              </div>
            </div>
            <div className="bg-muted-bg rounded-lg p-4">
              <div className="text-xs text-muted uppercase font-bold">Market Price</div>
              <div className="text-2xl font-bold font-data text-primary mt-1">
                {formatPrice(calc.recommended_price)}
              </div>
              <div className="text-xs text-muted mt-1">per kg (avg bid)</div>
            </div>
            <div className="col-span-2 bg-primary/10 rounded-lg p-4 border border-primary/20">
              <div className="text-xs text-primary uppercase font-bold">Projected Revenue</div>
              <div className="text-3xl font-bold font-data text-primary mt-1">
                {formatRevenue(step === 2 && quantityKgNum > 0 ? projectedRevenueFromKg : calc.projected_revenue)}
              </div>
            </div>
          </div>
          {step === 2 && !posted && (
            <div className="mt-4 space-y-4">
              <Input
                label="Delivery Date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
              <Input
                label="Quantity (kg)"
                type="number"
                min="1"
                value={quantityKg}
                onChange={(e) => setQuantityKg(e.target.value)}
                placeholder="e.g. 500"
              />
              {error && <p className="text-sm text-accent-red">{error}</p>}
              <Button onClick={postSellOrder} disabled={!deliveryDate || !quantityKg || quantityKgNum <= 0 || posting} className="w-full min-h-[2.75rem] touch-manipulation" size="lg">
                {posting ? 'Posting Sell Order...' : `Post Sell Order for ${formatRevenue(projectedRevenueFromKg)}`}
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Step 3: Success */}
      {posted && (
        <section className="border-b border-border border-l-4 border-l-primary py-6 px-4">
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-2" aria-hidden>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-primary">Sell Order Posted!</h3>
            <p className="text-muted mt-2">
              Your {quantityKg} kg of {CROP_LABELS[calc!.crop_type]} is now listed at {formatPrice(calc!.recommended_price)} per kg.
            </p>
            <div className="mt-4 flex gap-3 justify-center flex-wrap">
              <Link href="/explore" className="cursor-pointer">
                <Button variant="primary">View on Explore</Button>
              </Link>
              <Button variant="outline" onClick={() => { setStep(1); setPosted(false); setCalc(null); }}>
                Hedge Another Crop
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function HedgeFlowPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted">Loading...</div>}>
      <HedgeFlowContent />
    </Suspense>
  );
}
