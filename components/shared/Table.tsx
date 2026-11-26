import React from 'react';
import { Table as KumoTable } from '@cloudflare/kumo/components/table';

/**
 * TrackXpense Table Component
 * Powered by Cloudflare Kumo Design System.
 * 
 * Strict Skill & Design Guidelines:
 * - Content text: 14px (text-sm)
 * - Font weights: font-medium (500) for headers/inline, semibold (600) max for headings, NEVER font-bold (700)
 * - Heading case: Sentence case only
 * - Zero tracking: No tracking-* classes
 * - Crisp 1px hairlines: Separators use var(--color-kumo-hairline)
 */
export const Table = KumoTable;

export type { KumoTableLayout, KumoTableRowVariant } from '@cloudflare/kumo/components/table';
export default Table;
