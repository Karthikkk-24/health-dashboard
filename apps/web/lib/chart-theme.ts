'use client';

import { useEffect, useState } from 'react';

/** Reads live CSS chart tokens so Recharts follow the active theme. */
export function useChartTheme() {
  const [colors, setColors] = useState({
    grid: '#1f2d45',
    muted: '#94a3b8',
    tooltipBg: '#111827',
    border: '#1f2d45',
    text: '#f1f5f9',
    accent: '#3b82f6',
    accentGlow: '#60a5fa',
    success: '#10b981',
  });

  useEffect(() => {
    const read = () => {
      const styles = getComputedStyle(document.documentElement);
      setColors({
        grid: styles.getPropertyValue('--hd-chart-grid').trim() || '#1f2d45',
        muted: styles.getPropertyValue('--hd-muted').trim() || '#94a3b8',
        tooltipBg:
          styles.getPropertyValue('--hd-chart-tooltip-bg').trim() || '#111827',
        border: styles.getPropertyValue('--hd-border').trim() || '#1f2d45',
        text: styles.getPropertyValue('--hd-text').trim() || '#f1f5f9',
        accent: styles.getPropertyValue('--hd-accent').trim() || '#3b82f6',
        accentGlow:
          styles.getPropertyValue('--hd-accent-glow').trim() || '#60a5fa',
        success: styles.getPropertyValue('--hd-success').trim() || '#10b981',
      });
    };

    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
}
