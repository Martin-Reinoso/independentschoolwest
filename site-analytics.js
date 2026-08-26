(function () {
  "use strict";

  const MEASUREMENT_ID = "G-KWF626WYP6";
  const PUBLIC_HOSTS = new Set(["ffe.org.au", "www.ffe.org.au"]);
  const BLOCKED_PATHS = [
    /rosewood-enrolment/i,
    /rosewood-application-sign/i,
    /rosewood-enrolment-admin/i,
    /rosewood-receipt/i,
    /application-link-request-review/i,
    /homepage-application-request-review/i,
    /review-enrollment/i
  ];

  if (PUBLIC_HOSTS.has(window.location.hostname) && BLOCKED_PATHS.some(pattern => pattern.test(window.location.pathname))) return;
  if (!/^G-[A-Z0-9]+$/.test(MEASUREMENT_ID) || MEASUREMENT_ID === "G-PLACEHOLDER") return;

  let loaded = false;

  function ensureDataLayer() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };
  }

  function loadAnalytics() {
    if (loaded) return;
    loaded = true;
    ensureDataLayer();

    window.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: `${window.location.origin}${window.location.pathname}`,
      page_path: window.location.pathname,
      page_title: document.title
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
    script.referrerPolicy = "strict-origin-when-cross-origin";
    document.head.appendChild(script);
  }

  loadAnalytics();
}());
