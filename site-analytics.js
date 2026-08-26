(function () {
  "use strict";

  const MEASUREMENT_ID = "G-KWF626WYP6";
  const CONSENT_KEY = "ffe_analytics_consent_v1";
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

  const analyticsState = {
    loaded: false,
    choice: readChoice()
  };

  function readChoice() {
    try {
      const value = window.localStorage.getItem(CONSENT_KEY);
      return value === "granted" || value === "denied" ? value : "";
    } catch {
      return "";
    }
  }

  function saveChoice(value) {
    analyticsState.choice = value;
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // The choice still applies for this page when storage is unavailable.
    }
  }

  function ensureDataLayer() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };
  }

  function loadAnalytics() {
    if (analyticsState.loaded || analyticsState.choice !== "granted") return;
    analyticsState.loaded = true;
    ensureDataLayer();

    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    window.gtag("consent", "update", { analytics_storage: "granted" });
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

  function addStyles() {
    if (document.querySelector('link[data-ffe-analytics-styles]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/site-analytics.css";
    link.dataset.ffeAnalyticsStyles = "true";
    document.head.appendChild(link);
  }

  function createControls() {
    addStyles();
    const panel = document.createElement("section");
    panel.className = "ffe-analytics-panel";
    panel.setAttribute("aria-label", "Analytics choices");
    panel.innerHTML = `
      <strong>Help us improve this website</strong>
      <p>With your permission, we use Google Analytics on public pages to understand what information is useful. It is not used on enrolment, signing or staff pages, and our analytics code does not collect form answers. <a href="https://policies.google.com/privacy" rel="noopener noreferrer">Google privacy information</a>.</p>
      <div class="ffe-analytics-actions">
        <button class="ffe-analytics-accept" type="button">Allow analytics</button>
        <button class="ffe-analytics-decline" type="button">Decline</button>
      </div>
    `;

    const choiceButton = document.createElement("button");
    choiceButton.className = "ffe-analytics-choice";
    choiceButton.type = "button";
    choiceButton.textContent = "Analytics choices";
    choiceButton.hidden = !analyticsState.choice;

    function showPanel() {
      panel.hidden = false;
      choiceButton.hidden = true;
      panel.querySelector("button").focus();
    }

    function choose(value) {
      saveChoice(value);
      panel.hidden = true;
      choiceButton.hidden = false;
      choiceButton.focus();
      if (value === "granted") loadAnalytics();
    }

    panel.querySelector(".ffe-analytics-accept").addEventListener("click", () => choose("granted"));
    panel.querySelector(".ffe-analytics-decline").addEventListener("click", () => choose("denied"));
    choiceButton.addEventListener("click", showPanel);
    panel.hidden = Boolean(analyticsState.choice);
    document.body.append(panel, choiceButton);

    window.FFEAnalytics = Object.freeze({
      showChoices: showPanel,
      get choice() { return analyticsState.choice; }
    });
  }

  function initialise() {
    if (analyticsState.choice === "granted") loadAnalytics();
    createControls();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialise, { once: true });
  else initialise();
}());
