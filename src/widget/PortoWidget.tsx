import { createWidget } from 'expo-widgets';
import { HStack, Link, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';

export type WidgetGoal = {
  id: string;
  title: string;
  type: 'daily' | 'value';
  progress_ratio: number;
  progress: number;
  target_days: number | null;
  target_value: number | null;
  unit_custom: string | null;
  category_color: string;
};

export type PortoWidgetData = {
  goals: WidgetGoal[];
};

function goalDetail(goal: WidgetGoal): string {
  if (goal.type === 'daily') {
    return `${goal.progress}/${goal.target_days ?? '?'} zile`;
  }
  const unit = goal.unit_custom ? ' ' + goal.unit_custom : '';
  return `${goal.progress}/${goal.target_value ?? '?'}${unit}`;
}

export const portoGoalsWidget = createWidget<PortoWidgetData>(
  'PortoGoals',
  (props) => {
    const { goals } = props;

    return (
      <VStack
        alignment="leading"
        spacing={10}
        modifiers={[padding({ all: 16 })]}
      >
        <Text modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
          PORTO
        </Text>

        {goals.length === 0 ? (
          <Text modifiers={[font({ size: 14 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
            Deschide Porto și configurează widget-ul din profil.
          </Text>
        ) : (
          goals.map((goal) => (
            <Link destination={`porto://goal/${goal.id}`}>
              <VStack alignment="leading" spacing={4}>
                <HStack spacing={4} alignment="firstTextBaseline">
                  <Text modifiers={[font({ weight: 'semibold', size: 14 }), foregroundStyle('#0f172a')]}>
                    {goal.title}
                  </Text>
                  <Spacer />
                  <Text modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle(goal.category_color)]}>
                    {`${Math.round(goal.progress_ratio * 100)}%`}
                  </Text>
                </HStack>
                <ProgressView value={goal.progress_ratio > 1 ? 1 : goal.progress_ratio} />
                <Text modifiers={[font({ size: 11 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
                  {goalDetail(goal)}
                </Text>
              </VStack>
            </Link>
          ))
        )}
      </VStack>
    );
  },
);
