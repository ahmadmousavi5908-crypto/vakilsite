const TRANSITIONS = Object.freeze({
  GREETING: Object.freeze(["DISCOVERY", "URGENCY_CHECK", "ESCALATED"]),
  DISCOVERY: Object.freeze(["URGENCY_CHECK", "HANDOFF_OFFERED", "ESCALATED"]),
  URGENCY_CHECK: Object.freeze(["GENERAL_GUIDANCE", "HANDOFF_OFFERED", "ESCALATED"]),
  GENERAL_GUIDANCE: Object.freeze(["DISCOVERY", "HANDOFF_OFFERED", "COMPLETED", "ESCALATED"]),
  HANDOFF_OFFERED: Object.freeze(["HANDOFF_PREVIEW", "GENERAL_GUIDANCE", "ESCALATED"]),
  HANDOFF_PREVIEW: Object.freeze(["GENERAL_GUIDANCE", "COMPLETED", "ESCALATED"]),
  COMPLETED: Object.freeze([]),
  ESCALATED: Object.freeze([]),
});

export const PUBLIC_CONVERSATION_STATES = Object.freeze(Object.keys(TRANSITIONS));

export function createInitialPublicConversationState() {
  return "GREETING";
}

export function transitionPublicConversation(currentState, nextState, context = {}) {
  if (!Object.hasOwn(TRANSITIONS, currentState)) {
    return Object.freeze({ ok: false, state: null, reasonCode: "INVALID_CURRENT_STATE" });
  }
  if (TRANSITIONS[currentState].length === 0) {
    return Object.freeze({ ok: false, state: currentState, reasonCode: "TERMINAL_STATE" });
  }

  if (context.urgent === true) {
    return Object.freeze({
      ok: true,
      state: "ESCALATED",
      reasonCode: "URGENT_HANDOFF_REQUIRED",
    });
  }

  if (!Object.hasOwn(TRANSITIONS, nextState) ||
      !TRANSITIONS[currentState].includes(nextState)) {
    return Object.freeze({ ok: false, state: currentState, reasonCode: "INVALID_TRANSITION" });
  }

  if (nextState === "HANDOFF_PREVIEW") {
    const summary = typeof context.summary === "string" ? context.summary.trim() : "";
    if (context.consent !== true || !summary || summary.length > 1200) {
      return Object.freeze({
        ok: false,
        state: currentState,
        reasonCode: "HANDOFF_CONSENT_OR_SUMMARY_REQUIRED",
      });
    }
  }

  if (currentState === "HANDOFF_PREVIEW" &&
      nextState === "COMPLETED" &&
      context.consent !== true) {
    return Object.freeze({
      ok: false,
      state: currentState,
      reasonCode: "HANDOFF_CONSENT_REQUIRED",
    });
  }

  return Object.freeze({ ok: true, state: nextState, reasonCode: null });
}
