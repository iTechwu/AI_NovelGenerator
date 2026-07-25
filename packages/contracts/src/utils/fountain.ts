export interface FountainValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sceneHeadingCount: number;
  actionCount: number;
  dialogueCount: number;
}

const sceneHeadingPattern = /^(?:INT\.?|EXT\.?|INT\/EXT\.?|I\/E\.?|内景|外景|内外景)/iu;
const characterCuePattern = /^(?:[A-Z][A-Z0-9 .'-]{1,}|[\u4e00-\u9fff]{1,8})(?:\s*（[^）]+）)?$/u;

/**
 * A deliberately small Fountain guardrail. It recognizes the minimum
 * deliverable structure without trying to infer screenplay quality or force a
 * dialogue line into a silent scene.
 */
export function analyzeFountain(content: string): FountainValidation {
  const lines = content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  const headings = lines.filter((line) => sceneHeadingPattern.test(line));
  const characterCues = lines.filter((line) => characterCuePattern.test(line));
  const actionCount = lines.filter(
    (line) =>
      !sceneHeadingPattern.test(line) &&
      !characterCuePattern.test(line) &&
      !line.startsWith('(') &&
      !line.startsWith('（'),
  ).length;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (headings.length === 0) errors.push('请至少写一个场景头，例如“INT. 港口仓库 - 夜”。');
  if (actionCount === 0) errors.push('请补充至少一段动作描述，说明镜头中发生了什么。');
  if (characterCues.length === 0) warnings.push('当前场景未识别到角色与对白；无对白场景可忽略此提示。');

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sceneHeadingCount: headings.length,
    actionCount,
    dialogueCount: characterCues.length,
  };
}
