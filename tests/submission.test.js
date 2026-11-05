import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRecentCases } from "../src/content/submission.js";

describe("server-backed submission evidence", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "location",
      new URL("https://apps.acgme.org/ads/CaseLogs/CaseEntry/New"),
    );
    vi.stubGlobal("fetch", vi.fn());
    document.body.innerHTML = `
      <input id="UrlGetLastFive" value="/ads/CaseLogs/CaseEntry/GetLastFive">
      <select id="Residents"><option value="">Choose</option><option value="42">Resident</option><option value="multiselect-all">All</option></select>
      <input id="PatientIdDisplayName" value="Case ID">`;
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reads exact case identifiers, dates and server row identities", async () => {
    fetch.mockResolvedValue({
      ok: true,
      text: async () =>
        '<tr><td>11/2/2026 8:00 AM</td><td>CASE-1</td><td>11/1/2026</td><td><a href="/ads/CaseLogs/CaseEntry/Edit/123">Edit</a></td></tr>',
    });
    const rows = await getRecentCases();
    expect(rows).toEqual([
      {
        caseId: "CASE-1",
        date: "11/1/2026",
        key: JSON.stringify(["/ads/CaseLogs/CaseEntry/Edit/123"]),
      },
    ]);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      residentProgramDetailId: [42],
      patientIdDisplayName: "Case ID",
    });
    expect(fetch.mock.calls[0][1].credentials).toBe("same-origin");
  });

  it("rejects rows without stable record links", async () => {
    fetch.mockResolvedValue({
      ok: true,
      text: async () =>
        "<tr><td>Just now</td><td>CASE-1</td><td>11/1/2026</td></tr>",
    });
    await expect(getRecentCases()).rejects.toThrow("record links");
  });

  it("rejects an unexpected response fragment", async () => {
    fetch.mockResolvedValue({
      ok: true,
      text: async () => "Service unavailable",
    });
    await expect(getRecentCases()).rejects.toThrow("Unexpected response");
  });

  it("accepts an empty recent-case list", async () => {
    fetch.mockResolvedValue({
      ok: true,
      text: async () => '<tr><td colspan="4">No cases</td></tr>',
    });
    expect(await getRecentCases()).toEqual([]);
  });

  it("keeps the same identity when only the displayed creation time changes", async () => {
    const row = (time) =>
      `<tr><td>${time}</td><td>CASE-1</td><td>11/1/2026</td><td><a href="/ads/CaseLogs/CaseEntry/Edit/123">Edit</a></td></tr>`;
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => row("Just now"),
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => row("1 minute ago"),
    });
    const before = await getRecentCases();
    expect((await getRecentCases())[0].key).toBe(before[0].key);
  });

  it.each([
    "https://example.com/ads/CaseLogs/CaseEntry/GetLastFive",
    "/ads/CaseLogs/CaseEntry/Insert",
    "",
  ])("rejects an unexpected endpoint: %s", async (url) => {
    document.getElementById("UrlGetLastFive").value = url;
    await expect(getRecentCases()).rejects.toThrow("unavailable");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a missing resident list", async () => {
    document.getElementById("Residents").remove();
    await expect(getRecentCases()).rejects.toThrow("unavailable");
  });

  it.each([{ ok: false }, { ok: true, redirected: true }])(
    "rejects failed or redirected responses",
    async (response) => {
      fetch.mockResolvedValue(response);
      await expect(getRecentCases()).rejects.toThrow("Could not read");
    },
  );

  it("rejects a login page rather than using it as an empty baseline", async () => {
    fetch.mockResolvedValue({
      ok: true,
      text: async () => "<html><form>Sign in</form></html>",
    });
    await expect(getRecentCases()).rejects.toThrow("Unexpected response");
  });
});
