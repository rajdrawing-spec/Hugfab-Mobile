/**
 * One thing waiting on a person, from either console.
 *
 * The two endpoints describe an item differently — the seller's carries a `tone`
 * of action or warning, the admin's a four-value `severity` — and this does not
 * flatten them into one scale. They are different judgements made by different
 * services, and a mapping invented here would be a third judgement nobody asked
 * for. Each is rendered in its own terms; only the layout is shared.
 *
 * Both carry an `href` into the web console, and that is the whole point of the
 * screen on a phone: it answers "does this need me at my laptop?" and then takes
 * you there.
 */

import { View } from 'react-native';
import { Text } from './text';
import { Badge } from './badge';
import { Touchable } from './pressable';
import { openWebPage } from '@/lib/links';
import { elevation } from '@/theme';
import type { AttentionAlert, AttentionItem, Severity } from '@/api/types';

const SEVERITY_TONE: Record<Severity, 'primary' | 'warning' | 'info' | 'success'> = {
  critical: 'primary',
  action: 'warning',
  info: 'info',
  done: 'success',
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  action: 'Action required',
  info: 'Information',
  done: 'Completed',
};

function Card({
  title,
  badge,
  cta,
  href,
}: {
  title: string;
  badge: React.ReactNode;
  cta: string;
  href: string;
}): React.JSX.Element {
  return (
    <Touchable
      accessibilityRole="link"
      accessibilityLabel={`${title}. ${cta} on the website.`}
      press="card"
      onPress={() => void openWebPage(href)}
      style={elevation('sm')}
      className="bg-surface mb-3 rounded-lg p-4"
    >
      {badge}
      <Text step="small" className="mt-2">
        {title}
      </Text>
      <Text step="small" tone="primary" weight="semibold" className="mt-2">
        {cta}
      </Text>
    </Touchable>
  );
}

/** A seller's alert. `title` already reads as a sentence with its count in it. */
export function AlertCard({ alert }: { alert: AttentionAlert }): React.JSX.Element {
  return (
    <Card
      title={alert.title}
      badge={
        <Badge
          label={alert.tone === 'action' ? 'Needs you' : 'Stock'}
          tone={alert.tone === 'action' ? 'primary' : 'warning'}
        />
      }
      cta="Open on the website"
      href={alert.href}
    />
  );
}

/** An admin queue. `cta` is the console's own wording for the action. */
export function AttentionItemCard({ item }: { item: AttentionItem }): React.JSX.Element {
  return (
    <Card
      title={item.title}
      badge={
        <Badge
          label={SEVERITY_LABEL[item.severity]}
          tone={SEVERITY_TONE[item.severity]}
        />
      }
      cta={item.cta}
      href={item.href}
    />
  );
}

/** Nothing is waiting. Worth saying plainly rather than showing an empty column. */
export function AllClear({ message }: { message: string }): React.JSX.Element {
  return (
    <View className="bg-success-soft mb-3 rounded-lg p-4">
      <Text step="small" tone="success">
        {message}
      </Text>
    </View>
  );
}
