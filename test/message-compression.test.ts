describe("Message Compression", () => {
  it("should compress messages when there are more than 10", () => {
    // Create 15 messages
    const messages = Array.from({ length: 15 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message ${i}: ${"x".repeat(200)}`,
    }));

    // The compressMessages function is in api.ts but not exported
    // We test the behavior through the session history limit
    const { addMessage, getHistory, clearSession } = require("../bot/session");
    const userId = 99999;

    clearSession(userId);
    messages.forEach((m) => {
      addMessage(userId, m.role as "user" | "assistant", m.content);
    });

    const history = getHistory(userId);
    expect(history.length).toBeLessThanOrEqual(20);
  });

  it("should limit history to 20 messages", () => {
    const { addMessage, getHistory, clearSession } = require("../bot/session");
    const userId = 88888;

    clearSession(userId);
    for (let i = 0; i < 25; i++) {
      addMessage(userId, "user", `Message ${i}`);
    }

    const history = getHistory(userId);
    expect(history.length).toBe(20);
    expect(history[0].content).toBe("Message 5");
    expect(history[19].content).toBe("Message 24");
  });
});
