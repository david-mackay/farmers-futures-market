'use client';

import { useState, useRef, useMemo } from 'react';
import { User } from '@/shared/types';
import { CROP_LABELS } from '@/shared/constants';
import { CropType } from '@/shared/types';
import { api } from '@/lib/api-client';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { X } from 'lucide-react';

const CROP_OPTIONS = Object.entries(CROP_LABELS).map(([value, label]) => ({ value, label }));

interface OnboardingModalProps {
  open: boolean;
  user: User;
  onComplete: () => void;
}

export function OnboardingModal({ open, user, onComplete }: OnboardingModalProps) {
  const [displayName, setDisplayName] = useState(user.display_name);
  const [isFarmer, setIsFarmer] = useState(user.is_farmer);
  const [acreage, setAcreage] = useState(user.acreage != null ? String(user.acreage) : '');
  const [cropList, setCropList] = useState<CropType[]>(
    user.crops_produced ? user.crops_produced.split(',').map((c) => c.trim().toUpperCase()).filter((c): c is CropType => Object.values(CropType).includes(c as CropType)) : []
  );
  const [saving, setSaving] = useState(false);
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyPreview, setVerifyPreview] = useState<string | null>(null);
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const verifyInputRef = useRef<HTMLInputElement>(null);

  const nameValid = displayName.trim().length > 0 && !/^User\s+0x/i.test(displayName.trim());
  const availableCrops = useMemo(() => CROP_OPTIONS.filter((o) => !cropList.includes(o.value as CropType)), [cropList]);

  const handleVerifyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f?.type.startsWith('image/')) return;
    setVerifyFile(f);
    const reader = new FileReader();
    reader.onload = () => setVerifyPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const submitVerification = async () => {
    if (!verifyFile) return;
    setVerifySubmitting(true);
    try {
      await api.post(`/api/users/${user.id}/verify`, {});
      setVerifyFile(null);
      setVerifyPreview(null);
      onComplete();
    } finally {
      setVerifySubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!nameValid) return;
    setSaving(true);
    try {
      await api.patch(`/api/users/${user.id}`, {
        display_name: displayName.trim(),
        is_farmer: isFarmer,
        acreage: acreage ? parseFloat(acreage) : null,
        crops_produced: cropList.length > 0 ? cropList.join(',') : null,
      });
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const addCrop = (crop: CropType) => {
    if (!cropList.includes(crop)) setCropList((p) => [...p, crop]);
  };

  const removeCrop = (crop: CropType) => {
    setCropList((p) => p.filter((c) => c !== crop));
  };

  return (
    <Modal open={open} onClose={() => {}} title="Complete your profile" dismissible={false}>
      <p className="text-sm text-muted mb-4">
        Set up your profile so you can trade. You can update these details anytime in Profile.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Name or business name</label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name or business name"
            aria-label="Name or business name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">I am a</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsFarmer(true)}
              className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-colors touch-manipulation ${
                isFarmer ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted-bg text-muted hover:text-foreground'
              }`}
            >
              Farmer
            </button>
            <button
              type="button"
              onClick={() => setIsFarmer(false)}
              className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-colors touch-manipulation ${
                !isFarmer ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted-bg text-muted hover:text-foreground'
              }`}
            >
              Buyer
            </button>
          </div>
        </div>

        {isFarmer && (
          <>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Acreage (optional)</label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={acreage}
                onChange={(e) => setAcreage(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Crops produced (optional)</label>
              {cropList.length > 0 && (
                <ul className="divide-y divide-border border border-border rounded-lg mb-2">
                  {cropList.map((crop) => (
                    <li key={crop} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="font-medium text-foreground text-sm">{CROP_LABELS[crop]}</span>
                      <button
                        type="button"
                        onClick={() => removeCrop(crop)}
                        className="p-1.5 text-muted hover:text-foreground hover:bg-muted-bg rounded touch-manipulation"
                        aria-label={`Remove ${CROP_LABELS[crop]}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {availableCrops.length > 0 && (
                <Select
                  value=""
                  onChange={(e) => { const v = e.target.value; if (v) addCrop(v as CropType); }}
                  options={[{ value: '', label: 'Add a crop…' }, ...availableCrops]}
                />
              )}
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground mb-1">Verify your identity</h3>
              <p className="text-xs text-muted mb-3">
                Farmers must be verified to list sell orders. Upload an image of your ID or farm documentation. For this demo, verification is accepted once you submit.
              </p>
              {user.is_verified ? (
                <p className="text-sm text-primary font-medium">Verified</p>
              ) : (
                <>
                  <input
                    ref={verifyInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleVerifyFileChange}
                    className="hidden"
                    aria-label="Choose verification image"
                  />
                  <button
                    type="button"
                    onClick={() => verifyInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-border rounded-lg py-4 px-4 text-center text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer touch-manipulation text-sm"
                  >
                    {verifyPreview ? (
                      <div className="flex flex-col items-center gap-2">
                        <img src={verifyPreview} alt="Preview" className="max-h-28 max-w-full object-contain rounded border border-border" />
                        <span>Tap to change image</span>
                      </div>
                    ) : (
                      'Choose image to upload'
                    )}
                  </button>
                  {verifyFile && (
                    <Button
                      size="sm"
                      onClick={submitVerification}
                      disabled={verifySubmitting}
                      className="mt-2 min-h-[2.5rem]"
                    >
                      {verifySubmitting ? 'Submitting…' : 'Submit for verification'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-border pb-6 sm:pb-2">
        <Button
          onClick={handleSave}
          disabled={!nameValid || saving}
          className="w-full min-h-[2.75rem]"
        >
          {saving ? 'Saving…' : 'Save and continue'}
        </Button>
      </div>
    </Modal>
  );
}
