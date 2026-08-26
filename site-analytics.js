(() => {
  "use strict";

  // Replace this placeholder with the GA4 web stream Measurement ID before release.
  const measurementId = "G-XXXXXXXXXX";
  const publicPaths = new Set([
    "/",
    "/index.html",
    "/family-evening/",
    "/family-evening/index.html",
    "/donate.html",
    "/pages/info-session.html",
    "/pages/rosewood-fee-calculator.html",
    "/pages/rosewood-fee-schedule.html"
  ]);

  const validMeasurementId = /^G-[A-Z0-9]{8,}$/;
  const placeholderMeasurementId = /^G-X+$/;
  const calculatorEvents = new Set([
    "fee_calculator_started",
    "fee_calculator_step_completed",
    "fee_estimate_updated",
    "fee_calculator_reset",
    "fee_estimate_printed",
    "fee_schedule_opened",
    "fee_question_clicked"
  ]);
  const calculatorSteps = new Set(["family", "payment", "bond"]);
  if (!validMeasurementId.test(measurementId) || placeholderMeasurementId.test(measurementId)) return;
  if (!publicPaths.has(window.location.pathname)) return;

  const sanitiseUrl = value => {
    if (!value) return "";
    try {
      const url = new URL(value, window.location.origin);
      return `${url.origin}${url.pathname}`;
    } catch {
      return "";
    }
  };

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.ffeAnalytics = Object.freeze({
    track(eventName, parameters = {}) {
      if (!calculatorEvents.has(eventName)) return false;

      const safeParameters = {};
      if (eventName === "fee_calculator_step_completed") {
        if (!calculatorSteps.has(parameters.step)) return false;
        safeParameters.step = parameters.step;
      }

      window.gtag("event", eventName, safeParameters);
      return true;
    }
  });

  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_flags: "SameSite=Lax;Secure"
  });
  window.gtag("event", "page_view", {
    page_title: document.title,
    page_location: `${window.location.origin}${window.location.pathname}`,
    page_path: window.location.pathname,
    page_referrer: sanitiseUrl(document.referrer)
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.append(script);
})();
