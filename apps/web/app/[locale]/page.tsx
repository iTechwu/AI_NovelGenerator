'use client';

import { AppShell } from '@/components/layout';
import { StudioWorkbench } from '@/components/studio';
import { useRouter } from '@/i18n/navigation';

export default function LocalePage() {
  const router = useRouter();

  return (
    <AppShell>
      <StudioWorkbench
        onOpenProject={(projectId) => router.push(`/studio/${projectId}/overview`)}
      />
    </AppShell>
  );
}
