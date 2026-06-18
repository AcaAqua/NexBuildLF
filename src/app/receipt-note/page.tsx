'use client';

import React from 'react';
import PrintSlipPage from '@/components/features/PrintSlipPage';

export default function ReceiptNotePage() {
  const [projectId, setProjectId] = React.useState<string | undefined>();

  React.useEffect(() => {
    setProjectId(new URLSearchParams(window.location.search).get('projectId') || undefined);
  }, []);

  return <PrintSlipPage type="receipt" initialProjectId={projectId} />;
}
