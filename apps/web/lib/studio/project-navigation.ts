export const PROJECT_NAVIGATION_EVENT = 'hanlin:project-navigation';

export interface ProjectNavigationState {
  hasProject: boolean;
  hasBlueprint: boolean;
  hasChapterWorkspace: boolean;
  hasDraftWorkspace: boolean;
  hasAdaptationSource: boolean;
}

export const emptyProjectNavigationState: ProjectNavigationState = {
  hasProject: false,
  hasBlueprint: false,
  hasChapterWorkspace: false,
  hasDraftWorkspace: false,
  hasAdaptationSource: false,
};

export function publishProjectNavigationState(state: ProjectNavigationState) {
  window.dispatchEvent(
    new CustomEvent<ProjectNavigationState>(PROJECT_NAVIGATION_EVENT, { detail: state }),
  );
}
