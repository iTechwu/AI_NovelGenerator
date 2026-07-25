import { AppShell } from '@/components/layout';
import { StudioProjectWorkspace } from '@/components/studio/studio-project-workspace';
import { StudioScreenplayWorkspace } from '@/components/studio/studio-screenplay-workspace';
import { studioProjectSections, type StudioProjectSection } from '@/lib/studio/project-routes';
import { notFound } from 'next/navigation';

export default async function StudioProjectSectionPage({
  params,
}: {
  params: Promise<{ projectId: string; section: string }>;
}) {
  const { projectId, section } = await params;
  if (!studioProjectSections.includes(section as StudioProjectSection)) notFound();

  return (
    <AppShell>
      {section === 'screenplay' ? (
        <StudioScreenplayWorkspace projectId={projectId} />
      ) : (
        <StudioProjectWorkspace projectId={projectId} section={section as StudioProjectSection} />
      )}
    </AppShell>
  );
}
