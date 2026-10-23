import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Lightbulb, RefreshCw } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText, Button, useTheme } from '../../design-system';

/** @param {{report:import('./aiModel').AiInsightReport,coverage:ReturnType<typeof import('./aiModel').buildAiDataPayload>['coverage']|null,periodDays:number}} props */
export function AiInsightReport({ report, coverage, periodDays }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const DisclosureIcon = expanded ? ChevronUp : ChevronDown;

  return <View style={{ gap: theme.spacing.lg }} testID="ai-report-content">
    <View style={{ gap: theme.spacing.sm }}>
      <AppText variant="sectionTitle" accessibilityRole="header">{report.headline}</AppText>
      <AppText>{report.summary}</AppText>
    </View>

    {report.recommendations.length > 0 && <ReportSection icon={Lightbulb} title="Try next">
      {report.recommendations.map((recommendation) => <View key={recommendation.title} style={{ gap: theme.spacing.xs }}>
        <AppText variant="label">{recommendation.title}</AppText>
        <AppText>{recommendation.action}</AppText>
      </View>)}
    </ReportSection>}

    <ReportSection icon={RefreshCw} title="What to look for">
      <AppText>{report.nextCheck}</AppText>
    </ReportSection>

    {/* Keep the supporting detail available without making it the main reading task. */}
    <View style={{ borderTopWidth: theme.controls.borderWidth, borderColor: theme.colors.border.default, paddingTop: theme.spacing.xs }}>
      <Button
        label={expanded ? 'Hide evidence and details' : 'View evidence and details'}
        variant="text"
        expanded={expanded}
        icon={<DisclosureIcon size={theme.controls.icon} color={theme.colors.text.primary} strokeWidth={theme.controls.iconStrokeWidth} />}
        onPress={() => setExpanded((current) => !current)}
        testID="ai-report-details-toggle"
      />
      {expanded && <View style={{ gap: theme.spacing.md, paddingTop: theme.spacing.sm }} testID="ai-report-details">
        {coverage && <View style={{ gap: theme.spacing.xs }}>
          <AppText variant="caption" tone="secondary">Records from {coverage.daysWithAnyLog} of the last {periodDays} days.</AppText>
          <AppText variant="caption" tone="secondary">{coverage.bowelRecords} bowel · {coverage.foodRecords} food · {coverage.drinkRecords} drinks · {coverage.exerciseRecords} exercise entries</AppText>
        </View>}

        {report.patterns.length > 0 && <ReportSection icon={FileText} title="What your records show">
          {report.patterns.map((pattern) => <View key={pattern.title} style={{ gap: theme.spacing.xs }}>
            <AppText variant="label">{pattern.title}</AppText>
            <AppText tone="secondary">{pattern.evidence}</AppText>
            <AppText variant="caption" tone="secondary">{pattern.interpretation}</AppText>
          </View>)}
        </ReportSection>}

        {report.recommendations.length > 0 && <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="label" accessibilityRole="header">Why try this?</AppText>
          {report.recommendations.map((recommendation) => <View key={recommendation.title} style={{ gap: theme.spacing.xs }}>
            {report.recommendations.length > 1 && <AppText variant="caption">{recommendation.title}</AppText>}
            <AppText variant="caption" tone="secondary">{recommendation.reason}</AppText>
          </View>)}
        </View>}

        {report.dataGaps.length > 0 && <View style={{ gap: theme.spacing.xs }}>
          <AppText variant="label" accessibilityRole="header">What is still unclear</AppText>
          {report.dataGaps.map((gap) => <AppText key={gap} variant="caption" tone="secondary">{gap}</AppText>)}
        </View>}
      </View>}
    </View>
  </View>;
}

/** @param {{icon:import('lucide-react-native').LucideIcon,title:string,children:import('react').ReactNode}} props */
function ReportSection({ icon: Icon, title, children }) {
  const theme = useTheme();
  return <View style={{ gap: theme.spacing.sm }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <Icon size={theme.controls.smallIcon} color={theme.colors.text.secondary} strokeWidth={theme.controls.iconStrokeWidth} />
      <AppText variant="label" accessibilityRole="header" style={{ flex: 1 }}>{title}</AppText>
    </View>
    {children}
  </View>;
}
