(function () {
  "use strict";

  const root = document.documentElement;
  const navToggle = document.querySelector(".nav-toggle");
  const themeToggle = document.querySelector(".theme-toggle");
  const siteNav = document.querySelector(".site-nav");
  const logo = document.querySelector(".brand img");
  const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const themeStorageKey = "mqe-theme";

  function getStoredTheme() {
    try {
      return window.localStorage.getItem(themeStorageKey);
    } catch (error) {
      return null;
    }
  }

  function setStoredTheme(theme) {
    try {
      window.localStorage.setItem(themeStorageKey, theme);
    } catch (error) {
      // Ignore storage failures and fall back to the current session theme.
    }
  }

  function updateLogo(isDark) {
    if (!logo) return;

    const lightSrc = logo.dataset.lightSrc || logo.getAttribute("src");
    const darkSrc = logo.dataset.darkSrc || lightSrc;

    logo.src = isDark ? darkSrc : lightSrc;
  }

  function applyTheme(theme, persist) {
    const isDark = theme === "dark";

    root.setAttribute("data-theme", theme);
    updateLogo(isDark);

    if (themeToggle) {
      const label = isDark ? "Switch to light mode" : "Switch to dark mode";
      themeToggle.setAttribute("aria-pressed", String(isDark));
      themeToggle.setAttribute("aria-label", label);
      themeToggle.setAttribute("title", label);
    }

    if (persist) {
      setStoredTheme(theme);
    }
  }

  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      siteNav.classList.toggle("open", !expanded);
    });
  }

  const carousels = document.querySelectorAll("[data-carousel]");


  carousels.forEach((carousel) => {
    const viewport = carousel.querySelector("[data-carousel-viewport]");
    const track = carousel.querySelector("[data-carousel-track]");
    const prevButton = carousel.querySelector("[data-carousel-prev]");
    const nextButton = carousel.querySelector("[data-carousel-next]");

    if (!track || (!prevButton && !nextButton)) {
      return;
    }

    let isAnimating = false;
    let animationFallbackId = 0;
    let isPrimed = false;

    function cards() {
      return Array.from(track.children);
    }

    function cardsPerView() {
      return 2;
    }

    function stepSize() {
      const firstCard = track.firstElementChild;
      if (!firstCard) return 0;

      const gap = parseFloat(window.getComputedStyle(track).gap || "0");
      const cardWidth = firstCard.getBoundingClientRect().width;
      return cardWidth + gap;
    }

    function clearAnimationFallback() {
      if (animationFallbackId) {
        window.clearTimeout(animationFallbackId);
        animationFallbackId = 0;
      }
    }

    function peekSize() {
      if (!viewport) {
        return 0;
      }

      const paddingLeft = parseFloat(window.getComputedStyle(viewport).paddingLeft || "0");
      return Math.max(0, Math.min(12, paddingLeft * 0.24));
    }

    function baseOffset(shift) {
      if (shift <= 0) return 0;
      return Math.max(0, shift - peekSize());
    }

    function ensurePrimed() {
      if (isPrimed || cards().length <= cardsPerView()) {
        return;
      }

      const last = track.lastElementChild;
      if (last) {
        track.insertBefore(last, track.firstElementChild);
        isPrimed = true;
      }
    }

    function resetTrackPosition() {
      const shift = stepSize();
      const base = baseOffset(shift);
      track.style.transition = "none";
      track.style.transform = `translateX(-${base}px)`;
      void track.offsetWidth;
    }

    function finishSlide(direction) {
      if (direction === "next") {
        const first = track.firstElementChild;
        if (first) {
          track.appendChild(first);
        }
      }

      resetTrackPosition();
      isAnimating = false;
      clearAnimationFallback();
    }

    function setControlsEnabled() {
      const enabled = cards().length > cardsPerView();
      if (prevButton) prevButton.disabled = !enabled;
      if (nextButton) nextButton.disabled = !enabled;
    }

    function slide(direction) {
      if (isAnimating || cards().length <= cardsPerView()) {
        return;
      }

      ensurePrimed();

      const shift = stepSize();
      if (shift <= 0) {
        return;
      }

      const base = baseOffset(shift);

      clearAnimationFallback();
      isAnimating = true;

      if (direction === "previous") {
        const last = track.lastElementChild;
        if (!last) {
          isAnimating = false;
          return;
        }

        track.insertBefore(last, track.firstElementChild);
        track.style.transition = "none";
        track.style.transform = `translateX(-${base + shift}px)`;
        void track.offsetWidth;
        track.style.transition = "transform 260ms ease";
        track.style.transform = `translateX(-${base}px)`;

        track.addEventListener(
          "transitionend",
          function onPreviousEnd(event) {
            if (event.propertyName !== "transform") return;
            finishSlide("previous");
          },
          { once: true }
        );

        animationFallbackId = window.setTimeout(function () {
          finishSlide("previous");
        }, 420);

        return;
      }

      track.style.transition = "transform 260ms ease";
      track.style.transform = `translateX(-${base + shift}px)`;

      track.addEventListener(
        "transitionend",
        function onNextEnd(event) {
          if (event.propertyName !== "transform") return;
          finishSlide("next");
        },
        { once: true }
      );

      animationFallbackId = window.setTimeout(function () {
        finishSlide("next");
      }, 420);
    }

    function updateCarousel() {
      if (isAnimating) {
        isAnimating = false;
        clearAnimationFallback();
      }

      ensurePrimed();
      resetTrackPosition();
      setControlsEnabled();
    }

    if (prevButton) {
      prevButton.addEventListener("click", function () {
        slide("previous");
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", function () {
        slide("next");
      });
    }

    window.addEventListener("resize", updateCarousel);
    updateCarousel();
  });

  const storedTheme = getStoredTheme();
  const initialTheme = storedTheme || (darkModeQuery.matches ? "dark" : "light");

  applyTheme(initialTheme, false);

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      const currentTheme = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme(nextTheme, true);
    });
  }

  if (!storedTheme) {
    const listener = (event) => applyTheme(event.matches ? "dark" : "light", false);
    if (typeof darkModeQuery.addEventListener === "function") {
      darkModeQuery.addEventListener("change", listener);
    } else if (typeof darkModeQuery.addListener === "function") {
      darkModeQuery.addListener(listener);
    }
  }

  const yearTarget = document.getElementById("year");
  if (yearTarget) {
    yearTarget.textContent = String(new Date().getFullYear());
  }
})();
