// Read the same server-backed recent-case list used by ACGME's Last 5 Cases panel.
// A new matching row is evidence of a save; navigation alone is not.
export async function getRecentCases() {
  const endpoint = document.getElementById("UrlGetLastFive")?.value;
  const residents = [...document.querySelectorAll("#Residents option")]
    .map((option) => Number(option.value))
    .filter((value) => Number.isInteger(value) && value > 0);
  const url = new URL(endpoint || "", location.href);
  if (
    !endpoint ||
    url.origin !== location.origin ||
    url.pathname !== "/ads/CaseLogs/CaseEntry/GetLastFive" ||
    residents.length === 0
  ) {
    throw new Error("The ACGME recent-case list is unavailable.");
  }

  const response = await fetch(url.href, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      residentProgramDetailId: residents,
      patientIdDisplayName:
        document.getElementById("PatientIdDisplayName")?.value || "Case ID",
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok || response.redirected) {
    throw new Error("Could not read the ACGME recent-case list.");
  }
  const html = await response.text();
  // A login/error document must never become an empty baseline.
  if (/<(?:html|form|script)\b/i.test(html)) {
    throw new Error("Unexpected response from the ACGME recent-case list.");
  }
  const table = document.createElement("table");
  table.innerHTML = html;
  const rows = [...table.querySelectorAll("tr")];
  if (html.trim() && rows.length === 0) {
    throw new Error("Unexpected response from the ACGME recent-case list.");
  }
  return rows
    .filter((row) => row.cells.length >= 3)
    .map((row) => {
      // Use record links, not the Created label: relative timestamps can change without a new save.
      const links = [...row.querySelectorAll("a[href]")]
        .map((a) => a.getAttribute("href"))
        .filter((href) => href.startsWith("/ads/CaseLogs/"))
        .sort();
      if (links.length === 0)
        throw new Error("Recent cases have no verifiable record links.");
      return {
        caseId: row.cells[1].textContent.trim(),
        date: row.cells[2].textContent.trim(),
        key: JSON.stringify(links),
      };
    });
}
