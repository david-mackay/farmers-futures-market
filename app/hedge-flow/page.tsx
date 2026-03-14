'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CropType, HedgeFlowCalculation, OrderType } from '@/shared/types';
import { CROP_LABELS, CROP_UNIT, CROP_YIELD_PER_ACRE } from '@/shared/constants';
import { api } from '@/lib/api-client';
import { useUser } from '@/hooks/use-user';
import { useDevMode } from '@/hooks/use-dev-mode';
import { Card, CardTitle } from '@/components/ui/card';
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
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState('');

  const isVerifiedFarmer = user?.role === 'FARMER' && user?.is_verified;

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
    if (!calc || !deliveryDate || !devMode) return;
    setPosting(true);
    setError('');
    try {
      await api.post('/api/orders', {
        crop_type: calc.crop_type,
        type: OrderType.ASK,
        price: calc.recommended_price,
        quantity: calc.expected_yield,
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

  if (!isVerifiedFarmer) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Hedge Flow</h1>
        <Card>
          <div className="text-center py-8">
            <h2 className="text-lg font-semibold mb-2">Verified Farmers Only</h2>
            <p className="text-muted mb-4">You need to be a verified farmer to use the Hedge Flow tool.</p>
            <Link href="/profile">
              <Button variant="outline">Go to Profile</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hedge Flow</h1>
        <p className="text-muted text-sm mt-1">
          Calculate expected yield and lock in prices with a single sell order
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
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

      {/* Step 1: Input */}
      <Card className={step !== 1 && !posted ? 'opacity-50' : ''}>
        <CardTitle>Step 1: Choose Crop & Acreage</CardTitle>
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
            <Button onClick={calculateYield} disabled={!cropType || !acreage || calcLoading} className="w-full">
              {calcLoading ? 'Calculating...' : 'Calculate Expected Yield'}
            </Button>
          )}
        </div>
      </Card>

      {/* Step 2: Review & Post */}
      {calc && step >= 2 && (
        <Card>
          <CardTitle>Step 2: Review & Lock In Price</CardTitle>
          <div className="mt-4 grid grid-cols-2 gap-4">
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
              <div className="text-xs text-muted mt-1">per {CROP_UNIT[calc.crop_type]} (avg bid)</div>
            </div>
            <div className="col-span-2 bg-primary/10 rounded-lg p-4 border border-primary/20">
              <div className="text-xs text-primary uppercase font-bold">Projected Revenue</div>
              <div className="text-3xl font-bold font-data text-primary mt-1">
                {formatRevenue(calc.projected_revenue)}
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
              {error && <p className="text-sm text-accent-red">{error}</p>}
              <Button onClick={postSellOrder} disabled={!deliveryDate || posting} className="w-full" size="lg">
                {posting ? 'Posting Sell Order...' : `Post Sell Order for ${formatRevenue(calc.projected_revenue)}`}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Step 3: Success */}
      {posted && (
        <Card className="border-2 border-primary">
          <div className="text-center py-4">
            <div className="text-4xl mb-2">&#10003;</div>
            <h3 className="text-xl font-bold text-primary">Sell Order Posted!</h3>
            <p className="text-muted mt-2">
              Your {formatQuantity(calc!.expected_yield, calc!.crop_type)} of {CROP_LABELS[calc!.crop_type]} is now listed at {formatPrice(calc!.recommended_price)} per unit.
            </p>
            <div className="mt-4 flex gap-3 justify-center">
              <Link href="/trading-post">
                <Button variant="primary">View on Trading Post</Button>
              </Link>
              <Button variant="outline" onClick={() => { setStep(1); setPosted(false); setCalc(null); }}>
                Hedge Another Crop
              </Button>
            </div>
          </div>
        </Card>
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
