import React from 'react';
import logoImg from '../assets/aquapure-logo.png';
import './AquaPureLogo.css';

export interface AquaPureLogoProps {
  /** Explicit width (e.g. 100 or '100px') */
  width?: number | string;
  /** Explicit height (e.g. 38 or '38px') */
  height?: number | string;
  /** Preset sizes */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Presentation variant:
   * - 'badge': Encased in a pure-white card with rounded corners and subtle shadow.
   *            Guarantees high contrast on dark headers (e.g. #210440).
   * - 'plain': Logo image without background container.
   * - 'compact': Centered emblem presentation for tight spaces like collapsed sidebars.
   */
  variant?: 'badge' | 'plain' | 'compact';
  /** Optional badge text displayed alongside the logo (e.g. "Admin") */
  badgeText?: string;
  /** Custom class */
  className?: string;
  /** Accessibility label */
  alt?: string;
}

const PRESET_HEIGHTS: Record<string, number> = {
  xs: 24,
  sm: 30,
  md: 40,
  lg: 52,
  xl: 68,
};

export const AquaPureLogo: React.FC<AquaPureLogoProps> = ({
  width,
  height,
  size = 'md',
  variant = 'badge',
  badgeText,
  className = '',
  alt = 'AquaPure Logo',
}) => {
  const resolvedHeight = height ?? PRESET_HEIGHTS[size] ?? 40;
  const styleObj: React.CSSProperties = {
    height: typeof resolvedHeight === 'number' ? `${resolvedHeight}px` : resolvedHeight,
    width: width ? (typeof width === 'number' ? `${width}px` : width) : 'auto',
  };

  return (
    <div className={`aquapure-logo-container aquapure-logo-${variant} ${className}`}>
      <img
        src={logoImg}
        alt={alt}
        className="aquapure-logo-img"
        style={styleObj}
        loading="eager"
      />
      {badgeText && <span className="aquapure-logo-tag">{badgeText}</span>}
    </div>
  );
};
