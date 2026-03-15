'use client';

import { Modal } from '@/components/ui/modal';

interface SignupBonusModalProps {
  open: boolean;
  onClose: () => void;
}

export function SignupBonusModal({ open, onClose }: SignupBonusModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Congratulations!" dismissible>
      <p className="text-foreground">
        Congratulations for signing up! Here is <strong>500 USDC</strong> for testing out our new marketplace.
      </p>
      <p className="text-sm text-muted mt-2">
        Check your wallet — the test USDC should appear shortly. You can use it to place and fill orders on devnet.
      </p>
    </Modal>
  );
}
