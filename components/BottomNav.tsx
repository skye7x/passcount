'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Ticket, Settings, Dumbbell, History, Package } from 'lucide-react';

const TABS = [
  { href: '/', label: 'Counters', icon: Ticket },
  { href: '/trainings/', label: 'Trainings', icon: Dumbbell },
  { href: '/equipment/', label: 'Equipment', icon: Package },
  { href: '/log/', label: 'History', icon: History },
  { href: '/settings/', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {TABS.map(tab => {
        const Icon = tab.icon;
        const isActive =
          tab.href === '/'
            ? pathname === '/'
            : pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}>
            <span className="bottom-nav__icon">
              <Icon size={20} strokeWidth={1.5} />
            </span>
            <span className="bottom-nav__label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
