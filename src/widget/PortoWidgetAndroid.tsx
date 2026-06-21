"use no memo";
/**
 * Layout-ul widget-ului Android (react-native-android-widget).
 * Folosit atât de bridge.android (push din app) cât și de task-handler (render OS).
 *
 * Tap pe un rând de goal → clickAction `OPEN_URI` cu `porto://goal/{id}`, gestionat
 * nativ de bibliotecă (deschide deep link-ul fără cod extra în task handler).
 */
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { goalDetail, goalPct, WidgetGoal } from '@/widget/types';

type Hex = `#${string}`;

const BG = '#ffffff';
const TITLE = '#0f172a';
const MUTED = '#64748b';
const TRACK = '#e2e8f0';

function ProgressBar({ ratio, color }: { ratio: number; color: `#${string}` }) {
  const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  // RemoteViews/LinearLayout nu suportă borderRadius — folosim flex weights fără rundare.
  if (pct === 0) {
    return <FlexWidget style={{ height: 6, width: 'match_parent', backgroundColor: TRACK }} />;
  }
  if (pct >= 100) {
    return <FlexWidget style={{ height: 6, width: 'match_parent', backgroundColor: color }} />;
  }
  return (
    <FlexWidget
      style={{
        height: 6,
        width: 'match_parent',
        backgroundColor: TRACK,
        flexDirection: 'row',
      }}
    >
      <FlexWidget style={{ flex: pct, height: 6, backgroundColor: color }} />
      <FlexWidget style={{ flex: 100 - pct, height: 6 }} />
    </FlexWidget>
  );
}

export function PortoWidgetAndroid({ goals }: { goals: WidgetGoal[] }) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: BG,
        padding: 14,
        flexDirection: 'column',
        justifyContent: 'flex-start',
      }}
      clickAction="OPEN_APP"
    >
      <TextWidget
        text="PORTO"
        style={{ fontSize: 12, fontWeight: 'bold', color: MUTED, marginBottom: 8 }}
      />

      {goals.length === 0 ? (
        <TextWidget
          text="Deschide Porto și configurează widget-ul din profil."
          style={{ fontSize: 13, color: MUTED }}
        />
      ) : (
        goals.map((goal) => (
          <FlexWidget
            key={goal.id}
            style={{
              width: 'match_parent',
              flexDirection: 'column',
              marginBottom: 8,
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: `porto://goal/${goal.id}` }}
          >
            <FlexWidget
              style={{
                width: 'match_parent',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <TextWidget
                text={goal.title}
                truncate="END"
                maxLines={1}
                style={{ fontSize: 14, fontWeight: '600', color: TITLE }}
              />
              <TextWidget
                text={`${goalPct(goal)}%`}
                style={{ fontSize: 13, fontWeight: 'bold', color: goal.category_color as Hex }}
              />
            </FlexWidget>
            <FlexWidget style={{ width: 'match_parent', height: 4 }} />
            <ProgressBar ratio={goal.progress_ratio} color={goal.category_color as Hex} />
            <FlexWidget style={{ width: 'match_parent', height: 2 }} />
            <TextWidget text={goalDetail(goal)} style={{ fontSize: 11, color: MUTED }} />
          </FlexWidget>
        ))
      )}
    </FlexWidget>
  );
}
