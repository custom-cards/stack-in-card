import { LovelaceCardConfig } from 'custom-card-helpers';

export interface StackInCardConfig {
  type: string;
  mode?: 'horizontal' | 'vertical';
  cards: LovelaceCardConfig[];
  title?: string;
  keep?: KeepConfig;
}

export interface KeepConfig {
  margin?: boolean;
  background?: boolean;
  box_shadow?: boolean;
  border?: boolean;
  border_radius?: boolean;
  outer_padding?: boolean;
}
