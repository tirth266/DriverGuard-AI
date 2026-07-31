// DriverGuard AI — TypeScript Interfaces

export interface NavLink {
  label: string;
  href: string;
  active?: boolean;
}

export interface FeatureCard {
  icon: string;
  title: string;
  description: string;
}

export interface DetectionCategory {
  id: string;
  label: string;
  className: string;
  confidence: number;
  confidenceColor: 'safe' | 'danger' | 'warning';
  imageUrl: string;
  imageAlt: string;
}

export interface PipelineStep {
  id: number;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

export interface KPIMetric {
  id: string;
  label: string;
  value: string;
  unit: string;
  accentColor: string;
  progress: number;
}

export interface BehaviorMetric {
  id: string;
  label: string;
  value: string;
  status: 'safe' | 'warning' | 'danger' | 'info';
  detail?: string;
}

export interface TimelineEvent {
  time: string;
  type: 'safe' | 'minor' | 'major';
}

export interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

export type ButtonVariant = 'primary' | 'glass' | 'outline' | 'secondary';
export type BadgeVariant = 'safe' | 'danger' | 'warning' | 'info';
