import { CostAccountingService } from './pricing';

export interface ContextOptimizationResult {
  originalText: string;
  optimizedText: string;
  originalTokens: number;
  optimizedTokens: number;
  tokensSaved: number;
  reductionPercentage: number;
  actionsApplied: string[];
  isOptimized: boolean;
}

export class ContextOptimizer {
  /**
   * Optimizes prompt context safely without altering semantic meaning or required instructions.
   */
  public static optimize(prompt: string, preserveFormatting: boolean = false): ContextOptimizationResult {
    const originalText = prompt;
    const originalTokens = CostAccountingService.estimateTokenCount(originalText);
    const actionsApplied: string[] = [];

    if (!prompt || prompt.trim().length === 0) {
      return {
        originalText,
        optimizedText: prompt,
        originalTokens,
        optimizedTokens: originalTokens,
        tokensSaved: 0,
        reductionPercentage: 0,
        actionsApplied: ['No optimization needed (empty text)'],
        isOptimized: false,
      };
    }

    let text = prompt;

    // Check if prompt contains code blocks
    const hasCodeBlock = /```[\s\S]*?```/.test(text);

    // 1. Whitespace reduction: trim excess whitespace on lines
    const beforeWhitespace = text;
    if (!preserveFormatting) {
      // Normalize Windows line endings
      text = text.replace(/\r\n/g, '\n');
      // Collapse multiple consecutive spaces (outside code blocks if possible)
      if (!hasCodeBlock) {
        text = text.replace(/[ \t]{2,}/g, ' ');
      }
      // Collapse 3+ consecutive newlines to 2 newlines (preserve paragraphs)
      text = text.replace(/\n{3,}/g, '\n\n');
      text = text.trim();

      if (text !== beforeWhitespace) {
        actionsApplied.push('Normalized excess whitespace and collapsed redundant blank lines');
      }
    }

    // 2. Remove identical consecutive duplicate lines (e.g. repeated context chunks or log lines)
    const lines = text.split('\n');
    const dedupedLines: string[] = [];
    let duplicateLinesCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const current = lines[i].trim();
      const previous = i > 0 ? lines[i - 1].trim() : null;

      // Don't dedup empty lines or very short markers
      if (current.length > 25 && current === previous) {
        duplicateLinesCount++;
        continue;
      }
      dedupedLines.push(lines[i]);
    }

    if (duplicateLinesCount > 0) {
      text = dedupedLines.join('\n');
      actionsApplied.push(`Deduplicated ${duplicateLinesCount} repeated redundant lines`);
    }

    // 3. Clean trailing spaces from each line
    text = text
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n');

    const optimizedTokens = CostAccountingService.estimateTokenCount(text);
    const tokensSaved = Math.max(0, originalTokens - optimizedTokens);
    const reductionPercentage =
      originalTokens > 0 ? Number(((tokensSaved / originalTokens) * 100).toFixed(1)) : 0;

    return {
      originalText,
      optimizedText: text,
      originalTokens,
      optimizedTokens,
      tokensSaved,
      reductionPercentage,
      actionsApplied: actionsApplied.length > 0 ? actionsApplied : ['Input context is already compact'],
      isOptimized: tokensSaved > 0,
    };
  }
}
