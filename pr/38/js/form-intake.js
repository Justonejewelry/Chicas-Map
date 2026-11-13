// Chicas Map form intake — captures listing + email forms and emails them
// Zero-config FormSubmit endpoint. First submission may require inbox confirmation.
(function () {
  const ENDPOINT = "https://formsubmit.co/ajax/mr.jsciaraffa@gmail.com";

  document.addEventListener(
    "submit",
    function (e) {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;

      const titleInput = form.querySelector('[name="title"]');
      const emailInput = form.querySelector('[name="email"], [type="email"]');
      if (!titleInput && !emailInput) return;

      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      data._subject = titleInput
        ? "Chicas Map — New sale tip: " + (data.title || "untitled")
        : "Chicas Map — Pack email signup";
      data._template = "table";
      data.source_url = location.href;
      data.captured_at = new Date().toISOString();

      // Fire-and-forget; localStorage path still runs in React
      fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(data),
      }).catch(function () {});
    },
    true
  );
})();
