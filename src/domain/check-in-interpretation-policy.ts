export function conversationInterpretationSourceKey(
  checkInId: string,
  completedAt: number,
) {
  return `conversation:${checkInId}:${completedAt}`;
}

export function conversationInterpretationOrNull<
  Interpretation extends { sourceKind: string; createdAt: number },
>(interpretations: readonly Interpretation[]) {
  return interpretations.reduce<Interpretation | null>((latest, interpretation) => {
    if (interpretation.sourceKind !== "conversation") return latest;
    return latest === null || interpretation.createdAt > latest.createdAt
      ? interpretation
      : latest;
  }, null);
}
