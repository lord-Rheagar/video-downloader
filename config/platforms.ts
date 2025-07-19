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
  youtube: {
    name: 'youtube',
    displayName: 'YouTube',
    icon: 'Youtube',
    color: '#FF0000',
    supported: true,
    comingSoon: false,
  },
  twitter: {
    name: 'twitter',
    displayName: 'Twitter/X',
    icon: 'Twitter',
    color: '#1DA1F2',
    supported: true,
    comingSoon: false,
  },
  instagram: {
    name: 'instagram',
    displayName: 'Instagram',
    icon: 'Instagram',
    color: '#E4405F',
    supported: false,
    comingSoon: true,
  },
  facebook: {
    name: 'facebook',
    displayName: 'Facebook',
    icon: 'Facebook',
    color: '#1877F2',
    supported: false,
    comingSoon: true,
  },
  reddit: {
    name: 'reddit',
    displayName: 'Reddit',
    icon: 'MessageSquare',
    color: '#FF4500',
    supported: true,
    comingSoon: false,
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
