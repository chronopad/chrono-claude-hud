import { DEFAULT_PROJECT_LINE_ORDER } from '../config.ts';
import { t } from '../i18n/index.ts';
import type { Frame } from './frame.ts';
import { activityLine, type ActivityElement } from './activity.ts';
import { separatorLine, visibleWidth } from './ansi.ts';
import { contextBarAndValue, tokenBreakdown } from './context.ts';
import { cacheHitRateLine, promptCacheLine, sessionTimeLine } from './lines.ts';
import { orderParts } from './order.ts';
import {
  advisorPart, authPart, breadcrumbPart, compactionsPart, configCountParts, costPart, customLinePart, durationPart, extraPart,
  modelBadge, projectParts, sessionNamePart, sessionTokensSummary, speedPart, versionPart, type Part,
} from './parts.ts';
import { usageParts } from './usage.ts';

const ACTIVITY: ActivityElement[] = ['tools', 'skills', 'mcp', 'agents', 'todos'];

// The context bar rides with the model badge, so the cluster moves as the 'model' segment.
function modelCluster(f: Frame): string {
  const display = f.config?.display;
  const { bar, value } = contextBarAndValue(f);
  return [display?.showModel !== false ? modelBadge(f) : null, bar, value].filter(Boolean).join(' ');
}

function sessionLines(f: Frame): string[] {
  const parts: Part[] = [];
  const add = (text: string | null, key: Part['key'] = null): void => {
    if (text) parts.push({ key, text });
  };
  const breadcrumb = breadcrumbPart(f); // chrono: replaces the custom, project and session parts
  add(breadcrumb ?? customLinePart(f, 'first'));
  add(modelCluster(f), 'model');
  if (!breadcrumb) {
    for (const part of projectParts(f, 'compact')) add(part, 'project');
    add(sessionNamePart(f), 'sessionName');
  }
  add(versionPart(f), 'version');
  configCountParts(f).forEach((part) => add(part));
  (usageParts(f, 'compact') ?? []).forEach((part) => add(part));
  if (f.config?.display?.showSessionTokens) add(sessionTokensSummary(f, `${t('format.tok')}:`));
  add(compactionsPart(f));
  add(advisorPart(f), 'advisor');
  add(durationPart(f), 'duration');
  add(sessionTimeLine(f));
  add(promptCacheLine(f));
  add(cacheHitRateLine(f));
  add(costPart(f), 'cost');
  add(speedPart(f), 'speed');
  add(extraPart(f), 'extra');
  add(authPart(f), 'auth');
  add(customLinePart(f, 'last'));
  const ordered = orderParts(parts, f.config?.projectLineOrder ?? DEFAULT_PROJECT_LINE_ORDER);
  if (breadcrumb && ordered.length > 1) {
    // chrono: the breadcrumb is line 1; everything else (context, usage bars, ...) is line 2, space-joined.
    return [ordered[0], ordered.slice(1).join(' ') + tokenBreakdown(f)];
  }
  return [ordered.join(' | ') + tokenBreakdown(f)];
}

/** The compact layout: one session line, then the activity lines. */
export function compactLines(f: Frame): string[] {
  const header = sessionLines(f);
  const activity = ACTIVITY.map((element) => activityLine(f, element)).filter((line): line is string => !!line);
  const lines = [...header];
  if (f.config?.showSeparators && activity.length > 0) {
    const widest = Math.max(...header.map(visibleWidth), 20);
    lines.push(separatorLine(f.width ? Math.min(widest, f.width) : widest));
  }
  return [...lines, ...activity];
}
