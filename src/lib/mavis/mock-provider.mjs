export const mockProvider = Object.freeze({
  name: "mock",
  async generate() {
    return { claims: [] };
  },
});
