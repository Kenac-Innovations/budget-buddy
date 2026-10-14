import { expect, it } from "vitest";
import { displayTranscript } from "./route";

it("projects Chat Completions and Responses history to user/assistant text only", () => {
  const history = [
    { role: "system", content: "Secret system instructions" },
    { role: "developer", content: "Secret developer instructions" },
    { role: "tool", content: "Secret tool results" },
    { type: "function_call", name: "add_line", arguments: "Secret tool args" },
    { type: "reasoning", summary: [{ text: "Secret reasoning" }] },
    { role: "user", content: "Hello" },
    { role: "assistant", content: null, tool_calls: [{ arguments: "Secret args" }] },
    { type: "message", role: "assistant", content: [
      { type: "output_text", text: "Power comes first.", annotations: [{ private: "annotation" }] },
      { type: "tool_use", text: "Secret tool text" },
      { type: "text", text: "What needs power?" },
    ] },
    { role: "user", content: [{ type: "input_text", text: "Four branches" }, { type: "input_image", image_url: "private" }] },
    { role: "assistant", content: "   " }, null, 42,
  ];
  expect(displayTranscript(history)).toEqual([
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Power comes first.\nWhat needs power?" },
    { role: "user", content: "Four branches" },
  ]);
});
