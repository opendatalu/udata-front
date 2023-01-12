/**
 * Adds DOM validation messages for login & register pages.
 */

import { getCurrentPage, addSubmitListener } from "./helpers";
import i18n from "../i18n";

const { t } = i18n.global;

/**
 * Functions
 */

class Validator {
  constructor() {
    this.errors = {};
  }

  validateNotEmpty(input) {
    if (!input.value) {
      this.errors[input.getAttribute("id")] = t("validation_not_empty");
      return false;
    }
    return true;
  }

  validateEmail(input) {
    if (
      !/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/.text(
        email.value
      )
    ) {
      this.errors[input.getAttribute("id")] = t("validation_email");
      return false;
    }
    return true;
  }

  validatePasswordMatch(input1, input2) {
    if (input1.value !== input2.value) {
      this.errors[input2.getAttribute("id")] = t("validation_passwords");
    }
  }

  getErrors() {
    return this.errors;
  }
}

function resetDOMErrors() {
  document.querySelectorAll("lu-error-msg").forEach((el) => {
    // Remove aria labels from input
    let input_id = el.getAttribute("aria-describedby").slice(0, -6); // Remove "-error"
    let input = document.getElementById(input_id);
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");

    // Remove the error message itself
    el.remove();
  });
}

function setDOMError(input_id, error) {
  const input = document.getElementById(input_id);
  const error_element_id = input_id + "-error";

  let error_msg = document.createElement("p");
  error_msg.classList.add("lu-error-msg", "fr-error-text", "fr-mt-1v");
  error_msg.textContent = error;
  error_msg.setAttribute("id", error_element_id);
  input.after(error_msg);

  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-describedby", error_element_id);
}

function loadInputVars() {
  EMAIL_INPUT = document.getElementById("email");
  PASSWORD_INPUT = document.getElementById("password");
  if (CURRENT_PAGE === "/register") {
    PASSWORD_CONFIRM_INPUT = document.getElementById("password");
    FIRST_NAME_INPUT = document.getElementById("first_name-id");
    LAST_NAME_INPUT = document.getElementById("last_name-id");
  }
}

function disableHTML5Validations() {
  EMAIL_INPUT.removeAttribute("required");
  PASSWORD_INPUT.removeAttribute("required");
  if (PASSWORD_CONFIRM_INPUT) {
    PASSWORD_CONFIRM_INPUT.removeAttribute("required");
    FIRST_NAME_INPUT.removeAttribute("required");
    LAST_NAME_INPUT.removeAttribute("required");
  }
}

/**
 * Constats & variables
 */
const AVAILABLE_PAGES = ["/login", "/register"];
const CURRENT_PAGE = getCurrentPage(AVAILABLE_PAGES);
const FORM = CURRENT_PAGE ? document.querySelector("form.form") : null;

// Loaded on DOM ready
let EMAIL_INPUT = null;
let PASSWORD_INPUT = null;
let PASSWORD_CONFIRM_INPUT = null;
let FIRST_NAME_INPUT = null;
let LAST_NAME_INPUT = null;

/**
 * Main method
 */

function callback(event) {
  resetDOMErrors();

  let validator = new Validator();

  validator.validateNotEmpty(EMAIL_INPUT) &&
    validator.validateEmail(EMAIL_INPUT);
  validator.validateNotEmpty(password);

  if (CURRENT_PAGE === "/register") {
    validator.validateNotEmpty(PASSWORD_CONFIRM_INPUT) &&
      validator.validatePasswordMatch(PASSWORD_INPUT, PASSWORD_CONFIRM_INPUT);
    validator.validateNotEmpty(FIRST_NAME_INPUT);
    validator.validateNotEmpty(LAST_NAME_INPUT);
  }

  const errors = validator.getErrors();
  const error_keys = Object.keys(errors);

  if (error_keys.length > 0) {
    event.preventDefault();

    error_keys.forEach((input_id) => {
      setDOMError(input_id, errors[input_id]);
    });
  }
}

function init() {
  loadInputVars();
  disableHTML5Validations();
  addSubmitListener(callback, FORM);
}

export default (function () {
  if (CURRENT_PAGE) {
    if (document.readyState === "complete") {
      init();
    } else {
      window.addEventListener("DOMContentLoaded", () => {
        init();
      });
    }
  }
})();
