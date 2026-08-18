import { describe, expect, it } from "vitest";
import { resolveGenerationReference } from "./reference";

describe("resolveGenerationReference", () => {
  it("uses complete modern generation metadata", () => {
    expect(
      resolveGenerationReference({
        model: "fishaudio/ace-step-1.5",
        metadata: {
          generation: {
            provider: "replicate-ace-step",
            job_id: "new-job",
            model: "fishaudio/ace-step-1.5",
          },
        },
      }),
    ).toEqual({
      provider: "replicate-ace-step",
      jobId: "new-job",
      model: "fishaudio/ace-step-1.5",
    });
  });

  it("maps a legacy prediction id to the initial provider", () => {
    expect(
      resolveGenerationReference({
        model: "fishaudio/ace-step-1.5",
        metadata: { prediction_id: "legacy-job" },
      }),
    ).toEqual({
      provider: "replicate-ace-step",
      jobId: "legacy-job",
      model: "fishaudio/ace-step-1.5",
    });
  });

  it("rejects incomplete or malformed metadata", () => {
    expect(resolveGenerationReference({ model: null, metadata: {} })).toBeNull();
    expect(
      resolveGenerationReference({
        model: "fishaudio/ace-step-1.5",
        metadata: { generation: { provider: "replicate-ace-step" } },
      }),
    ).toBeNull();
  });
});
