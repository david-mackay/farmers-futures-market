'use client';

import { useState, useMemo } from 'react';
import { BookmarkPlus, Check } from 'lucide-react';
import { CropType } from '@/shared/types';
import { CROP_LABELS } from '@/shared/constants';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { useWatchedCrops, searchCrops } from '@/hooks/use-watched-crops';

interface CropSearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function CropSearchModal({ open, onClose }: CropSearchModalProps) {
  const [query, setQuery] = useState('');
  const { add, isWatched } = useWatchedCrops();

  const results = useMemo(() => searchCrops(query), [query]);

  return (
    <Modal open={open} onClose={onClose} title="Search crops">
      <div className="space-y-4">
        <Input
          label="Crop name"
          placeholder="e.g. Wheat, Corn..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="max-h-[60vh] overflow-y-auto border border-border rounded-lg divide-y divide-border -mx-1">
          {results.length === 0 ? (
            <p className="p-4 text-muted text-sm">No crops match.</p>
          ) : (
            results.map((crop) => {
              const watched = isWatched(crop);
              return (
                <button
                  key={crop}
                  type="button"
                  onClick={() => add(crop)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted-bg active:bg-muted-bg/80 transition-colors duration-200 cursor-pointer min-h-[2.75rem] touch-manipulation"
                  aria-label={watched ? `${CROP_LABELS[crop]} on watchlist` : `Add ${CROP_LABELS[crop]} to watchlist`}
                >
                  <span className="font-medium text-foreground truncate">{CROP_LABELS[crop]}</span>
                  <span className="shrink-0 flex items-center gap-1.5 text-primary" aria-hidden>
                    {watched ? (
                      <>
                        <Check className="w-5 h-5 text-primary" strokeWidth={2.5} />
                        <span className="text-xs font-medium">Watching</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-5 h-5" strokeWidth={2} />
                        <span className="text-xs font-medium sr-only sm:not-sr-only">Add to watchlist</span>
                      </>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
