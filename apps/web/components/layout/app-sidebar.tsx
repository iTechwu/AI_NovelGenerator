'use client';

import { useMemo, useCallback, useEffect, useState, memo } from 'react';
import type { ComponentType } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';
import {
  BookMarked,
  Clapperboard,
  FileStack,
  FileUp,
  FolderOpen,
  LayoutDashboard,
  ListTodo,
  PenLine,
  ScrollText,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { useApp, useIsAdmin } from '@/providers';
import type { StudioProjectSection } from '@/lib/studio/project-routes';
import {
  emptyProjectNavigationState,
  PROJECT_NAVIGATION_EVENT,
  type ProjectNavigationState,
} from '@/lib/studio/project-navigation';

interface NavGroup {
  groupKey: string;
  title?: string;
  items: NavItem[];
}

interface NavItem {
  titleKey?: string;
  title?: string;
  href: string;
  anchor?: boolean;
  workspaceSection?: StudioProjectSection;
  icon: ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  availability?: 'always' | 'project' | 'blueprint' | 'chapter' | 'draft' | 'adaptation' | 'screenplay';
  disabledDescription?: string;
}

/**
 * Navigation configuration for sidebar
 * Customize this for your application
 */
const navGroups: NavGroup[] = [
  {
    groupKey: 'studio',
    title: '开始创作',
    items: [
      {
        title: '一句话写小说',
        href: '#novel-setup',
        anchor: true,
        icon: BookMarked,
      },
      {
        title: '一句话写剧本',
        href: '#screenplay-setup',
        anchor: true,
        icon: Clapperboard,
      },
      {
        title: '导入小说存稿',
        href: '#legacy-import',
        anchor: true,
        icon: FileUp,
      },
      {
        title: '作品库',
        href: '#project-library',
        anchor: true,
        icon: FolderOpen,
      },
    ],
  },
  {
    groupKey: 'adaptation',
    title: '改编创作',
    items: [
      {
        title: '小说转剧本',
        href: '',
        workspaceSection: 'adaptation',
        icon: Clapperboard,
        availability: 'adaptation',
        disabledDescription: '至少定稿一章小说后即可开始改编',
      },
    ],
  },
  {
    groupKey: 'project',
    title: '当前作品',
    items: [
      {
        title: '作品概览',
        href: '',
        workspaceSection: 'overview',
        icon: LayoutDashboard,
        availability: 'project',
      },
      {
        title: '蓝图与大纲',
        href: '',
        workspaceSection: 'blueprint',
        icon: FileStack,
        availability: 'blueprint',
      },
      {
        title: '剧本开发',
        href: '',
        workspaceSection: 'screenplay',
        icon: Clapperboard,
        availability: 'screenplay',
        disabledDescription: '独立剧本生成蓝图后，可在此规划分场并编写正文',
      },
      {
        title: '章节创作',
        href: '',
        workspaceSection: 'chapters',
        icon: PenLine,
        availability: 'chapter',
      },
      {
        title: '质量与评审',
        href: '',
        workspaceSection: 'review',
        icon: ShieldCheck,
        availability: 'draft',
      },
      {
        title: '设定与事实',
        href: '',
        workspaceSection: 'facts',
        icon: BookMarked,
        availability: 'draft',
      },
      {
        title: '版本与导出',
        href: '',
        workspaceSection: 'versions',
        icon: ScrollText,
        availability: 'draft',
      },
    ],
  },
  {
    groupKey: 'tasks',
    title: '创作管理',
    items: [
      {
        title: '任务中心',
        href: '#task-center',
        anchor: true,
        icon: ListTodo,
      },
    ],
  },
  {
    groupKey: 'settings',
    items: [
      {
        titleKey: 'settings',
        href: '/settings',
        icon: Settings,
      },
    ],
  },
];

// Memoized nav item component
const NavItemComponent = memo(function NavItemComponent({
  item,
  href,
  isActive,
  isDisabled,
  title,
  disabledDescription,
}: {
  item: NavItem;
  href: string;
  isActive: boolean;
  isDisabled: boolean;
  title: string;
  disabledDescription: string;
}) {
  const itemClassName = cn(
    'relative flex items-center gap-2 group-data-[collapsible=icon]:justify-center',
    isDisabled && 'cursor-not-allowed text-muted-foreground/55',
  );

  return (
    <SidebarMenuItem key={href}>
      <SidebarMenuButton
        asChild
        aria-disabled={isDisabled || undefined}
        isActive={!isDisabled && isActive}
        tooltip={isDisabled ? disabledDescription : title}
        className={cn(
          'relative h-9 rounded-md transition-colors duration-150',
          isDisabled
            ? 'hover:bg-transparent hover:text-muted-foreground'
            : isActive
              ? ['bg-primary/20', 'font-medium', 'shadow-sm']
              : ['hover:bg-accent'],
        )}
      >
        {isDisabled ? (
          <span className={itemClassName}>
            <item.icon className="size-[18px] shrink-0" />
            <span className="truncate group-data-[collapsible=icon]:hidden">{title}</span>
          </span>
        ) : item.anchor ? (
          <a href={href} className={itemClassName}>
            <item.icon className={cn('size-[18px] shrink-0', isActive ? 'text-primary' : '')} />
            <span className="truncate group-data-[collapsible=icon]:hidden">{title}</span>
            {isActive && (
              <span className="absolute -left-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
            )}
          </a>
        ) : (
          <Link href={href} className={itemClassName}>
            <item.icon className={cn('size-[18px] shrink-0', isActive ? 'text-primary' : '')} />
            <span className="truncate group-data-[collapsible=icon]:hidden">{title}</span>
            {isActive && (
              <span className="absolute -left-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
            )}
          </Link>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
});

export function AppSidebar() {
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const { brandName } = useApp();
  const isAdmin = useIsAdmin();
  const [activeAnchor, setActiveAnchor] = useState('#project-library');
  const [projectNavigation, setProjectNavigation] = useState<ProjectNavigationState>(
    emptyProjectNavigationState,
  );

  const currentPath = useMemo(() => pathname || '/', [pathname]);
  const routeProjectId = useMemo(
    () => currentPath.match(/^\/studio\/([^/]+)/)?.[1] ?? projectNavigation.projectId,
    [currentPath, projectNavigation.projectId],
  );

  useEffect(() => {
    const syncActiveAnchor = () => {
      if (window.location.hash) setActiveAnchor(window.location.hash);
    };
    syncActiveAnchor();
    window.addEventListener('hashchange', syncActiveAnchor);
    return () => window.removeEventListener('hashchange', syncActiveAnchor);
  }, []);

  useEffect(() => {
    const syncProjectNavigation = (event: Event) => {
      setProjectNavigation((event as CustomEvent<ProjectNavigationState>).detail);
    };
    window.addEventListener(PROJECT_NAVIGATION_EVENT, syncProjectNavigation);
    return () => window.removeEventListener(PROJECT_NAVIGATION_EVENT, syncProjectNavigation);
  }, []);

  // Memoize filtered groups based on admin permission
  const filteredGroups = useMemo(() => {
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.adminOnly || isAdmin),
      }))
      .filter((group) => group.items.length > 0);
  }, [isAdmin]);

  // Memoize title getter
  const getItemTitle = useCallback(
    (item: NavItem) => item.title || (item.titleKey ? t(`menu.${item.titleKey}`) : ''),
    [t],
  );

  const isItemAvailable = useCallback(
    (item: NavItem) => {
      if (item.availability === 'screenplay') return projectNavigation.projectFormat === 'screenplay';
      switch (item.availability) {
        case 'project':
          return projectNavigation.hasProject;
        case 'blueprint':
          return projectNavigation.hasBlueprint;
        case 'chapter':
          return projectNavigation.hasChapterWorkspace;
        case 'draft':
          return projectNavigation.hasDraftWorkspace;
        case 'adaptation':
          return projectNavigation.hasAdaptationSource;
        default:
          return true;
      }
    },
    [projectNavigation],
  );

  const resolveItemHref = useCallback(
    (item: NavItem) =>
      item.workspaceSection && routeProjectId
        ? `/studio/${routeProjectId}/${item.workspaceSection}`
        : item.href,
    [routeProjectId],
  );

  const projectGuide = useMemo(() => {
    if (!projectNavigation.hasProject) return '打开作品后解锁完整工作区';
    if (projectNavigation.projectFormat === 'screenplay') return '独立剧本：按分集与场景持续创作';
    if (!projectNavigation.hasBlueprint) return '等待蓝图生成后继续';
    if (!projectNavigation.hasChapterWorkspace) return '确认蓝图后进入章节创作';
    if (!projectNavigation.hasDraftWorkspace) return '生成章节草稿后解锁审校与交付';
    return '当前作品工作区';
  }, [projectNavigation]);

  // Memoize active state checker
  const isItemActive = useCallback(
    (item: NavItem, href: string) =>
      item.anchor
        ? currentPath === '/' && activeAnchor === item.href
        : currentPath === href || currentPath.startsWith(`${href}/`),
    [activeAnchor, currentPath],
  );

  // Render a navigation group
  const renderNavGroup = useCallback(
    (group: NavGroup & { items: NavItem[] }) => {
      const groupLabel = group.title ?? t('groupSettings');
      const groupGuide =
        group.groupKey === 'project'
          ? projectGuide
          : group.groupKey === 'adaptation'
            ? projectNavigation.hasAdaptationSource
              ? '已定稿小说可从这里建立可追溯的剧本改编'
              : '至少定稿一章小说后即可开启改编'
            : null;
      return (
        <SidebarGroup key={group.groupKey}>
          <SidebarGroupLabel className="mb-1 px-3 text-xs font-medium tracking-normal">
            {groupLabel}
          </SidebarGroupLabel>
          {groupGuide && (
            <p className="px-3 pb-2 text-xs leading-5 text-muted-foreground group-data-[collapsible=icon]:hidden">
              {groupGuide}
            </p>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {group.items.map((item) => (
                (() => {
                  const href = resolveItemHref(item);
                  return (
                    <NavItemComponent
                      key={item.workspaceSection ?? item.href}
                      item={item}
                      href={href}
                      isActive={isItemActive(item, href)}
                      isDisabled={!isItemAvailable(item)}
                      title={getItemTitle(item)}
                      disabledDescription={item.disabledDescription ?? projectGuide}
                    />
                  );
                })()
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      );
    },
    [
      t,
      getItemTitle,
      isItemActive,
      isItemAvailable,
      resolveItemHref,
      projectGuide,
      projectNavigation.hasAdaptationSource,
    ],
  );

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarContent className="pt-3">{filteredGroups.map(renderNavGroup)}</SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 relative">
        <div className="p-3">
          <div className="flex items-center">
            {/* Expanded state: show logo + brand name */}
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
              <span className="font-semibold truncate">{brandName}</span>
            </div>

            {/* Collapsed state: only show brand name initial */}
            <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center w-full">
              <span className="font-semibold">{brandName.charAt(0)}</span>
            </div>
          </div>
        </div>

        {/* Collapse/expand button, fixed at bottom right */}
        <div className="absolute -right-3" style={{ bottom: 'calc(0.75rem + 50px)' }}>
          <SidebarTrigger className="size-8 bg-accent" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
