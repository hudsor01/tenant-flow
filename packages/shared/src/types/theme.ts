export type ThemeMode = 'light' | 'dark' | 'system';

export type Domain = 'marketing' | 'product';

export type SemanticColorToken =
  | 'background'
  | 'foreground'
  | 'primary'
  | 'primary-foreground'
  | 'secondary'
  | 'secondary-foreground'
  | 'accent'
  | 'accent-foreground'
  | 'muted'
  | 'muted-foreground'
  | 'success'
  | 'success-foreground'
  | 'warning'
  | 'warning-foreground'
  | 'error'
  | 'error-foreground'
  | 'info'
  | 'info-foreground'
  | 'border'
  | 'ring'
  | 'input'
  | 'card'
  | 'card-foreground';

export interface ColorRationale {
  token: SemanticColorToken;
  light: string; // OKLCH/HEX
  dark: string; // OKLCH/HEX
  notes: string;
}

export interface ThemeReport {
  domain: Domain;
  tokens: ColorRationale[];
}

