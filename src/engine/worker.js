import { generate, generateDaily } from "./generator.js";

self.onmessage = ({ data }) => {
  const { id, difficulty, dateKey } = data;
  const result = dateKey ? generateDaily(dateKey) : generate(difficulty);
  self.postMessage({ id, result });
};
