/**
 * Refacto and improvement of original code to handle tabs.
 * Added keyboard support.
 * JFK
 *
 * Setup:
 * 1) Button container has "data-tabs" attribute
 * 2) Buttons have role="tab" attribute and aria-controls="xxx"
 * 3) Tabs have id "xxx"
 */

const chooseTab = (buttons, button) => {
  const previouslyActive = Array.from(buttons).find(
    (itButton) => itButton.getAttribute("aria-selected") === "true"
  );
  if (previouslyActive) {
    previouslyActive.setAttribute("aria-selected", "false");
    document
      .getElementById(previouslyActive.getAttribute("aria-controls"))
      .classList.remove("fr-unhidden");
  }

  button.setAttribute("aria-selected", "true");
  button.focus();
  const tab = document.getElementById(button.getAttribute("aria-controls"));
  tab.classList.add("fr-unhidden");
};

const chooseNextTab = (buttons, idx, backwards = false) => {
  const numButtons = buttons.length;
  if (backwards) {
    idx -= 1;
    if (idx < 0) {
      idx = numButtons - 1;
    }
  } else {
    idx = (idx + 1) % numButtons;
  }
  // console.log("New idx", idx);
  chooseTab(buttons, buttons[idx]);
};

const keyboardListener = (event, buttons) => {
  const button = event.target;
  var idx = null;
  for (var i = 0; i < buttons.length; i++) {
    if (
      buttons[i].getAttribute("aria-controls") ==
      button.getAttribute("aria-controls")
    ) {
      idx = i;
      break;
    }
  }

  switch (event.key) {
    case "ArrowLeft":
      // console.log("ArrowLeft", idx);
      chooseNextTab(buttons, idx, true);
      break;

    case "ArrowRight":
      // console.log("ArrowRight", idx);
      chooseNextTab(buttons, idx);
      break;
  }
};

const loadComponent = (component) => {
  const buttons = component.querySelectorAll("[role=tab]");
  buttons.forEach((button, i) => {

    // First button is accessible with tab, not the rest.
    if(i == 0) {
      button.setAttribute("tabindex", "0")
    } else {
      button.setAttribute("tabindex", "-1")
    }

    button.addEventListener("keydown", (event) => {
      keyboardListener(event, buttons);
    });

    button.addEventListener("click", (event) => {
      event.preventDefault();
      const button = event.target;
      chooseTab(buttons, button);
    });
  });
};

const loadAllComponents = () => {
  document.addEventListener("DOMContentLoaded", () => {
    const components = document.querySelectorAll("[data-tabs]");
    components.forEach((component) => {
      loadComponent(component);
    });
  });
};

export default loadAllComponents();
