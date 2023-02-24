/**
 * Adds DOM validation messages for login & register pages.
 */

import {
  getCurrentPage,
  addSubmitListener,
  addOnLoadListener,
} from "./helpers";
import i18n from "../plugins/i18n.js";

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
    if (!/^[\w\-\.+]+@([\w-]+\.)+[\w-]{2,10}$/.test(input.value)) {
      this.errors[input.getAttribute("id")] = t("validation_email", {
        example_email: "jean.smith@gmail.com",
      });
      return false;
    }
    return true;
  }

  validatePasswordMatch(input1, input2) {
    if (input1.value !== input2.value) {
      this.errors[input2.getAttribute("id")] = t("validation_passwords");
      return false;
    }
    return true;
  }

  validateChecked(input) {
    if (!input.checked) {
      this.errors[input.getAttribute("id")] = t("validation_conditions");
      return false;
    }
    return true;
  }

  getErrors() {
    return this.errors;
  }
}

function resetDOMErrors() {
  document.querySelectorAll(".lu-error-msg").forEach((el) => {
    // Remove aria labels from input
    let input_id = el.getAttribute("id").slice(0, -6); // Remove "-error"
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

  if (input.getAttribute("type") == "checkbox") {
    input.parentElement.after(error_msg);
  } else {
    input.after(error_msg);
  }
  
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-describedby", error_element_id);
}

function loadDOMElements() {
  FORM = document.querySelector("form.form");
  EMAIL_INPUT = document.getElementById("email");
  PASSWORD_INPUT = document.getElementById("password");
  if (CURRENT_PAGE === "/register") {
    PASSWORD_CONFIRM_INPUT = document.getElementById("password_confirm");
    FIRST_NAME_INPUT = document.getElementById("first_name-id");
    LAST_NAME_INPUT = document.getElementById("last_name-id");
    READ_CONDITIONS_INPUT = document.getElementById("accept_conditions");
  }
}

function disableHTML5Validations() {
  EMAIL_INPUT.removeAttribute("required");
  PASSWORD_INPUT.removeAttribute("required");
  if (PASSWORD_CONFIRM_INPUT) {
    PASSWORD_CONFIRM_INPUT.removeAttribute("required");
    FIRST_NAME_INPUT.removeAttribute("required");
    LAST_NAME_INPUT.removeAttribute("required");
    READ_CONDITIONS_INPUT.removeAttribute("required");
  }

  // type=email is HTML5 and it includes validation too that prevents our validation
  EMAIL_INPUT.setAttribute("type", "text");
}

/**
 * Constats & variables
 */
const AVAILABLE_PAGES = ["/login", "/register"];
const CURRENT_PAGE = getCurrentPage(AVAILABLE_PAGES);

// Loaded on DOM ready
let FORM = null;
let EMAIL_INPUT = null;
let PASSWORD_INPUT = null;
let PASSWORD_CONFIRM_INPUT = null;
let FIRST_NAME_INPUT = null;
let LAST_NAME_INPUT = null;
let READ_CONDITIONS_INPUT = null;

/**
 * Main method
 */

function callback(event) {
  resetDOMErrors();

  let validator = new Validator();

  if (validator.validateNotEmpty(EMAIL_INPUT)) {
    validator.validateEmail(EMAIL_INPUT);
  }
  validator.validateNotEmpty(PASSWORD_INPUT);

  if (CURRENT_PAGE === "/register") {
    if (validator.validateNotEmpty(PASSWORD_CONFIRM_INPUT)) {
      validator.validatePasswordMatch(PASSWORD_INPUT, PASSWORD_CONFIRM_INPUT);
    }
    validator.validateNotEmpty(FIRST_NAME_INPUT);
    validator.validateNotEmpty(LAST_NAME_INPUT);
    validator.validateChecked(READ_CONDITIONS_INPUT);
  }

  const errors = validator.getErrors();
  const error_keys = Object.keys(errors);

  if (error_keys.length > 0) {
    error_keys.forEach((input_id) => {
      setDOMError(input_id, errors[input_id]);
    });

    event.preventDefault();
  }
}

function init() {
  loadDOMElements();
  disableHTML5Validations();
  addSubmitListener(FORM, callback);
}

export default (function () {
  if (CURRENT_PAGE) {
    addOnLoadListener(init);
  }
})();
