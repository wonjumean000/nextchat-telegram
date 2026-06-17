describe("Bot API", () => {
  describe("getProviderFromModel", () => {
    it("should return Claude for claude models", () => {
      const { getProviderFromModel } = require("../bot/api");
      expect(getProviderFromModel("claude-3-opus")).toBe("Claude");
      expect(getProviderFromModel("claude-3-sonnet")).toBe("Claude");
    });

    it("should return GeminiPro for gemini models", () => {
      const { getProviderFromModel } = require("../bot/api");
      expect(getProviderFromModel("gemini-1.5-pro")).toBe("GeminiPro");
      expect(getProviderFromModel("gemini-1.5-flash")).toBe("GeminiPro");
    });

    it("should return OrcaRouter for other models", () => {
      const { getProviderFromModel } = require("../bot/api");
      expect(getProviderFromModel("llama-3.3-70b")).toBe("OrcaRouter");
      expect(getProviderFromModel("gpt-4o")).toBe("OrcaRouter");
      expect(getProviderFromModel("mistral-large")).toBe("OrcaRouter");
    });
  });
});

describe("Bot Session", () => {
  const { getSession, clearSession, updateModel, addMessage, getHistory } = require("../bot/session");

  beforeEach(() => {
    clearSession(12345);
  });

  it("should create a new session with default model", () => {
    const session = getSession(12345);
    expect(session.currentModel).toBe("llama-3.3-70b");
    expect(session.conversationHistory).toEqual([]);
  });

  it("should update model", () => {
    updateModel(12345, "mistral-large");
    const session = getSession(12345);
    expect(session.currentModel).toBe("mistral-large");
  });

  it("should add messages to history", () => {
    addMessage(12345, "user", "Hello");
    addMessage(12345, "assistant", "Hi there!");
    const history = getHistory(12345);
    expect(history).toHaveLength(2);
    expect(history[0].role).toBe("user");
    expect(history[0].content).toBe("Hello");
    expect(history[1].role).toBe("assistant");
    expect(history[1].content).toBe("Hi there!");
  });

  it("should clear session", () => {
    addMessage(12345, "user", "Test");
    clearSession(12345);
    const session = getSession(12345);
    expect(session.conversationHistory).toEqual([]);
  });
});
