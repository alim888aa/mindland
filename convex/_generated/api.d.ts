/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activityApplication from "../activityApplication.js";
import type * as activityInterpretation from "../activityInterpretation.js";
import type * as auth from "../auth.js";
import type * as checkIn from "../checkIn.js";
import type * as checkInAgent from "../checkInAgent.js";
import type * as checkInCompletion from "../checkInCompletion.js";
import type * as checkInCompletionPolicy from "../checkInCompletionPolicy.js";
import type * as checkInContextPolicy from "../checkInContextPolicy.js";
import type * as checkInGeneration from "../checkInGeneration.js";
import type * as checkInPolicy from "../checkInPolicy.js";
import type * as checkInPrompt from "../checkInPrompt.js";
import type * as islandCatalogue from "../islandCatalogue.js";
import type * as islandHistory from "../islandHistory.js";
import type * as islandMaterialization from "../islandMaterialization.js";
import type * as islandQuestionnaireActions from "../islandQuestionnaireActions.js";
import type * as islandQuestionnaireGeneration from "../islandQuestionnaireGeneration.js";
import type * as islandQuestionnaireValues from "../islandQuestionnaireValues.js";
import type * as islandVisualDetails from "../islandVisualDetails.js";
import type * as islands from "../islands.js";
import type * as onboardingAgent from "../onboardingAgent.js";
import type * as onboardingDiscovery from "../onboardingDiscovery.js";
import type * as onboardingInterview from "../onboardingInterview.js";
import type * as onboardingInterviewGeneration from "../onboardingInterviewGeneration.js";
import type * as openaiHealth from "../openaiHealth.js";
import type * as privateProofRecords from "../privateProofRecords.js";
import type * as safeErrorLog from "../safeErrorLog.js";
import type * as structuredCheckIn from "../structuredCheckIn.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activityApplication: typeof activityApplication;
  activityInterpretation: typeof activityInterpretation;
  auth: typeof auth;
  checkIn: typeof checkIn;
  checkInAgent: typeof checkInAgent;
  checkInCompletion: typeof checkInCompletion;
  checkInCompletionPolicy: typeof checkInCompletionPolicy;
  checkInContextPolicy: typeof checkInContextPolicy;
  checkInGeneration: typeof checkInGeneration;
  checkInPolicy: typeof checkInPolicy;
  checkInPrompt: typeof checkInPrompt;
  islandCatalogue: typeof islandCatalogue;
  islandHistory: typeof islandHistory;
  islandMaterialization: typeof islandMaterialization;
  islandQuestionnaireActions: typeof islandQuestionnaireActions;
  islandQuestionnaireGeneration: typeof islandQuestionnaireGeneration;
  islandQuestionnaireValues: typeof islandQuestionnaireValues;
  islandVisualDetails: typeof islandVisualDetails;
  islands: typeof islands;
  onboardingAgent: typeof onboardingAgent;
  onboardingDiscovery: typeof onboardingDiscovery;
  onboardingInterview: typeof onboardingInterview;
  onboardingInterviewGeneration: typeof onboardingInterviewGeneration;
  openaiHealth: typeof openaiHealth;
  privateProofRecords: typeof privateProofRecords;
  safeErrorLog: typeof safeErrorLog;
  structuredCheckIn: typeof structuredCheckIn;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
