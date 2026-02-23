import { IconCamera, IconFileAi, IconFileDescription, IconUser } from '@tabler/icons-react';
import * as React from 'react';
import { TbReportMedical } from 'react-icons/tb';

import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { AuthContext } from '@/entities/User/auth.context';
import { Link } from '@tanstack/react-router';
import { useTheme } from 'next-themes';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChartBar } from 'react-icons/fa6';
import { MdQuiz } from 'react-icons/md';
import { NavDocuments } from './nav-documents';
import { NavSecondary } from './nav-secondary';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const { user } = useContext(AuthContext);
  const isDark = resolvedTheme === 'dark';
  const data = {
    navMain: [
      {
        title: t('nav.dashboard.title'),
        url: '/app/dashboard',
        icon: <MdQuiz />,
      },
    ],
    navClouds: [
      {
        title: 'Capture',
        icon: IconCamera,
        isActive: true,
        url: '#',
        items: [
          {
            title: 'Active Proposals',
            url: '#',
          },
          {
            title: 'Archived',
            url: '#',
          },
        ],
      },
      {
        title: 'Proposal',
        icon: IconFileDescription,
        url: '#',
        items: [
          {
            title: 'Active Proposals',
            url: '#',
          },
          {
            title: 'Archived',
            url: '#',
          },
        ],
      },
      {
        title: 'Prompts',
        icon: IconFileAi,
        url: '#',
        items: [
          {
            title: 'Active Proposals',
            url: '#',
          },
          {
            title: 'Archived',
            url: '#',
          },
        ],
      },
    ],
    navSecondary: [
      {
        title: 'Пользователи',
        url: '/app/admin/user',
        icon: IconUser,
      },
    ],
    documents: [
      {
        name: t('nav.bids.report'),
        url: '/app/bid/report',
        icon: <TbReportMedical />,
      },
      {
        name: t('nav.bids.statistic'),
        url: '/app/bid/statistic',
        icon: <FaChartBar />,
      },
    ],
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link to="/app">
                <div>
                  <img
                    className="object-fill w-5 h-5"
                    src={isDark ? '/logo_dark.png' : '/logo_white.png'}
                  />
                </div>
                <span className="text-base font-semibold">
                  {import.meta.env.VITE_PUBLIC_APP_NAME}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        {user?.isAdmin ? <NavSecondary items={data.navSecondary} className="mt-auto" /> : null}
      </SidebarContent>
      <SidebarFooter>
        {user ? <NavUser user={{ name: user.name, email: user.login }} /> : null}
      </SidebarFooter>
    </Sidebar>
  );
}
