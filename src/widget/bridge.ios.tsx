/**
 * Bridge widget iOS — expo-widgets + @expo/ui/swift-ui.
 * Importat doar pe iOS (Metro: bridge.ios.tsx), deci modulul nativ apple-only
 * `expo-widgets` nu ajunge niciodată în bundle-ul Android.
 */
import { HStack, Link, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

import { goalDetail, goalPct, WidgetData, WidgetGoal } from '@/widget/types';

const portoGoalsWidget = createWidget<WidgetData>('PortoGoals', (props) => {
  // Widget-ul medium iOS are dimensiune fixă — afișăm primele 3 (Android, redimensionabil,
  // le arată pe toate). Lista completă rămâne salvată în WidgetData.
  const goals = props.goals.slice(0, 3);

  return (
    <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 16 })]}>
      <Text
        modifiers={[
          font({ weight: 'bold', size: 13 }),
          foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
        ]}
      >
        PORTO
      </Text>

      {goals.length === 0 ? (
        <Text
          modifiers={[
            font({ size: 14 }),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
          ]}
        >
          Deschide Porto și configurează widget-ul din profil.
        </Text>
      ) : (
        goals.map((goal) => (
          <Link key={goal.id} destination={`porto://goal/${goal.id}`}>
            <VStack alignment="leading" spacing={4}>
              <HStack spacing={4} alignment="firstTextBaseline">
                <Text modifiers={[font({ weight: 'semibold', size: 14 }), foregroundStyle('#0f172a')]}>
                  {goal.title}
                </Text>
                <Spacer />
                <Text
                  modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle(goal.category_color)]}
                >
                  {`${goalPct(goal)}%`}
                </Text>
              </HStack>
              <ProgressView value={goal.progress_ratio > 1 ? 1 : goal.progress_ratio} />
              <Text
                modifiers={[
                  font({ size: 11 }),
                  foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
                ]}
              >
                {goalDetail(goal)}
              </Text>
            </VStack>
          </Link>
        ))
      )}
    </VStack>
  );
});

export function pushWidgetData(goals: WidgetGoal[]): void {
  portoGoalsWidget.updateSnapshot({ goals });
}

export function reloadWidget(): void {
  portoGoalsWidget.reload();
}
