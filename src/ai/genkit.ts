/**
 * @fileoverview This file initializes the Genkit AI instance with necessary plugins.
 *
 * It configures and exports a global `ai` object that can be used throughout the
 * application to interact with Genkit's AI capabilities, such as defining and
 * running flows, prompts, and tools.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  // For production, you may want to use a different logger, such as the
  // Google Cloud Logging plugin.
  // logSinks: [googleCloudLogging()],
});
