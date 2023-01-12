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
      this.errors[input] = t("validation_not_empty");
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
      this.errors[input] = t("validation_email");
      return false;
    }
    return true;
  }

  validatePasswordMatch(input1, input2) {
    if (input1.value !== input2.value) {
      this.errors[input2] = t("validation_passwords");
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

function setDOMError(input, error) {
  const error_element_id = input.getAttribute("id") + "-error";

  let error_msg = document.createElement("div");
  error_msg.classList.add("lu-error-msg");
  error_msg.textContent = error;
  error_msg.style.color = "red";
  error_msg.style.marginTop = "10px";
  error_msg.setAttribute("id", error_element_id);
  input.after(error_msg);

  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-describedby", error_element_id);
}

/**
 * Constats & variables
 */
const AVAILABLE_PAGES = ["/login", "/register"];
const CURRENT_PAGE = getCurrentPage(AVAILABLE_PAGES);
const FORM = CURRENT_PAGE ? document.querySelector("form.form") : null;

/**
 * Main method
 */

function callback() {
  resetDOMErrors();

  let validator = new Validator();

  const email = document.getElementById("email");
  const password = document.getElementById("password");

  validator.validateNotEmpty(email) && validator.validateEmail(email);
  validator.validateNotEmpty(password);

  if (CURRENT_PAGE === "/register") {
    let password_confirm = document.getElementById("password");
    let first_name = document.getElementById("first_name-id");
    let last_name = document.getElementById("last_name-id");

    validator.validateNotEmpty(password_confirm) &&
      validator.validatePasswordMatch(password, password_confirm);
    validator.validateNotEmpty(first_name);
    validator.validateNotEmpty(last_name);
  }

  validator.getErrors().forEach((input, error) => {
    setDOMError(input, error);
  });
}

function bindSubmit() {
  addSubmitListener(callback, FORM);
}

export default (function () {
  if (CURRENT_PAGE) {
    if (document.readyState === "complete") {
      bindSubmit();
    } else {
      window.addEventListener("DOMContentLoaded", () => {
        bindSubmit();
      });
    }
  }
})();
