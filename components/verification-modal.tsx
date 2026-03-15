'use client';

import { useState, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

interface VerificationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

export function VerificationModal({ open, onClose, onSubmit }: VerificationModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setSubmitting(true);
    try {
      await onSubmit();
      setFile(null);
      setPreview(null);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Farmer verification">
      <p className="text-sm text-muted mb-3">
        Upload an image of your ID or farm documentation. For this demo, verification is accepted once you submit.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Choose verification image"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-border rounded-lg py-6 px-4 text-center text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer touch-manipulation"
      >
        {preview ? (
          <div className="flex flex-col items-center gap-2">
            <img
              src={preview}
              alt="Preview"
              className="max-h-40 max-w-full object-contain rounded border border-border"
            />
            <span className="text-sm">Tap to change image</span>
          </div>
        ) : (
          <span className="text-sm">Choose image to upload</span>
        )}
      </button>
      <div className="flex gap-2 mt-4">
        <Button
          onClick={handleSubmit}
          disabled={!file || submitting}
          className="min-h-[2.5rem] flex-1"
        >
          {submitting ? 'Submitting…' : 'Submit for verification'}
        </Button>
        <Button variant="ghost" onClick={handleClose} className="min-h-[2.5rem]">
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
