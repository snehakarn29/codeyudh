import { QualityRuleConfig } from './types';

export interface QualityValidationResult {
  isValid: boolean;
  score: number; // 0-100
  failedChecks: string[];
  passedChecks: string[];
  details: Record<string, boolean | string>;
}

export class QualityValidator {
  /**
   * Evaluates generated model output against configured validation rules.
   */
  public static validate(output: string, rules?: QualityRuleConfig): QualityValidationResult {
    const failedChecks: string[] = [];
    const passedChecks: string[] = [];
    const details: Record<string, boolean | string> = {};

    // 1. Non-empty check (default true)
    if (!output || output.trim().length === 0) {
      failedChecks.push('Output is empty or contains only whitespace');
      return {
        isValid: false,
        score: 0,
        failedChecks,
        passedChecks,
        details: { empty: true },
      };
    }
    passedChecks.push('Output is non-empty');
    details.nonEmpty = true;

    // 2. Minimum length check
    const minLength = rules?.minLength ?? 10;
    if (output.trim().length < minLength) {
      failedChecks.push(`Output length (${output.trim().length} chars) is below minimum (${minLength} chars)`);
      details.minLength = false;
    } else {
      passedChecks.push(`Output length meets minimum requirement (${minLength}+ chars)`);
      details.minLength = true;
    }

    // 3. Maximum length check
    if (rules?.maxLength && output.length > rules.maxLength) {
      failedChecks.push(`Output length (${output.length} chars) exceeds maximum limit (${rules.maxLength} chars)`);
      details.maxLength = false;
    }

    // 4. JSON validation check if requested
    if (rules?.requireJson) {
      try {
        // Strip markdown code fences if wrapped in ```json ... ```
        let jsonStr = output.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }
        JSON.parse(jsonStr);
        passedChecks.push('Valid JSON syntax confirmed');
        details.jsonValid = true;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Invalid JSON';
        failedChecks.push(`Failed JSON syntax validation: ${errorMsg}`);
        details.jsonValid = false;
      }
    }

    // 5. Code block check if requested
    if (rules?.requireMarkdownCodeBlock) {
      const hasCode = /```[\w]*\n[\s\S]*?```/.test(output);
      if (hasCode) {
        passedChecks.push('Formatted markdown code block present');
        details.codeBlock = true;
      } else {
        failedChecks.push('Required markdown code block is missing');
        details.codeBlock = false;
      }
    }

    // 6. Required keywords check
    if (rules?.requiredKeywords && rules.requiredKeywords.length > 0) {
      const lower = output.toLowerCase();
      const missingKeywords = rules.requiredKeywords.filter(
        (kw) => !lower.includes(kw.toLowerCase().trim())
      );
      if (missingKeywords.length > 0) {
        failedChecks.push(`Missing required keywords: [${missingKeywords.join(', ')}]`);
        details.keywords = false;
      } else {
        passedChecks.push(`All required keywords present (${rules.requiredKeywords.join(', ')})`);
        details.keywords = true;
      }
    }

    // 7. General safety & refusal detection
    const refusalPatterns = [
      /as an ai language model, i cannot/i,
      /i am unable to fulfill this request/i,
      /i do not have access to that information/i,
    ];
    for (const pattern of refusalPatterns) {
      if (pattern.test(output)) {
        failedChecks.push('Model returned an unhandled refusal or capability error');
        details.refusal = true;
        break;
      }
    }

    const totalRules = passedChecks.length + failedChecks.length;
    const score = totalRules > 0 ? Math.round((passedChecks.length / totalRules) * 100) : 100;
    const isValid = failedChecks.length === 0;

    return {
      isValid,
      score,
      failedChecks,
      passedChecks,
      details,
    };
  }
}
