import { LovelaceCardConfig } from 'custom-card-helpers';

export interface StackInCardConfig {
  type: string;
  mode: 'horizontal' | 'vertical';
  cards: LovelaceCardConfig[];
  title?: string;
}
