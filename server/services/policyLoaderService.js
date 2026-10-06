import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default path: server/data/expense-policy.md
const DEFAULT_POLICY_PATH = path.resolve(__dirname, '../data/expense-policy.md');

/**
 * Load and parse the expense policy markdown file into section-aware chunks.
 *
 * Each chunk preserves:
 * - sectionId (e.g., "3.1")
 * - sectionTitle (e.g., "Meals & Entertainment - Policy Limit and Meal Guidelines")
 * - text (content including context for optimal vector retrieval)
 * - source ("expense-policy.md")
 *
 * @param {string} [filePath] Optional custom file path.
 * @returns {Array<Object>} List of structured policy chunks.
 */
export const loadPolicyChunks = (filePath = DEFAULT_POLICY_PATH) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Policy document not found at: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);

  const lines = content.split(/\r?\n/);
  const chunks = [];

  let currentMainSection = '';
  let currentSubSectionId = '';
  let currentSubSectionTitle = '';
  let currentParagraphs = [];

  const flushCurrentChunk = () => {
    if (currentSubSectionId && currentParagraphs.length > 0) {
      const bodyText = currentParagraphs.join('\n\n').trim();
      if (bodyText) {
        // Compose sectionTitle: e.g. "Meals & Entertainment: Policy Limit and Meal Guidelines"
        const fullTitle = currentMainSection
          ? `${currentMainSection} - ${currentSubSectionTitle}`
          : currentSubSectionTitle;

        // Contextualized text preserves section info for semantic search accuracy
        const contextualText = `Section ${currentSubSectionId}: ${fullTitle}\n${bodyText}`;

        chunks.push({
          sectionId: currentSubSectionId,
          sectionTitle: fullTitle,
          text: contextualText,
          rawBody: bodyText,
          source: fileName,
        });
      }
    }
    currentParagraphs = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match "## Section X: Title"
    const mainSectionMatch = line.match(/^##\s+Section\s+\d+:\s*(.+)$/i);
    if (mainSectionMatch) {
      flushCurrentChunk();
      currentMainSection = mainSectionMatch[1].trim();
      currentSubSectionId = '';
      currentSubSectionTitle = '';
      continue;
    }

    // Match "### X.Y Title"
    const subSectionMatch = line.match(/^###\s+([0-9.]+)\s+(.+)$/);
    if (subSectionMatch) {
      flushCurrentChunk();
      currentSubSectionId = subSectionMatch[1].trim();
      currentSubSectionTitle = subSectionMatch[2].trim();
      continue;
    }

    // Skip horizontal rules and document header lines if outside a section
    if (line === '---' || line.startsWith('# ')) {
      continue;
    }

    // Collect body text if we are inside a subsection
    if (currentSubSectionId && line.length > 0) {
      currentParagraphs.push(line);
    }
  }

  // Flush the final chunk
  flushCurrentChunk();

  return chunks;
};
