import { Platform } from '@/types';

export interface PlatformConfig {
  name: string;
  displayName: string;
  icon: string;
  color: string;
  supported: boolean;
  comingSoon: boolean;
}

export const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  twitter: {
    name: 'twitter',
    displayName: 'Twitter/X',
    icon: 'Twitter',
    color: '#1DA1F2',
    supported: true,
    comingSoon: false,
  },
  reddit: {
    name: 'reddit',
    displayName: 'Reddit',
    icon: 'MessageSquare',
    color: '#FF4500',
    supported: true,
    comingSoon: false,
  },
  youtube: {
    name: 'youtube',
    displayName: 'YouTube',
    icon: 'Youtube',
    color: '#FF0000',
    supported: false,
    comingSoon: true,
  },
  unknown: {
    name: 'unknown',
    displayName: 'Unknown',
    icon: 'Globe',
    color: '#6B7280',
    supported: false,
    comingSoon: false,
  },
};
