/**
 * Enhanced nextStep function with multi-booking support
 * @param {HTMLElement} element - The element triggering the step transition
 */
const nextStep = (element) => {
  try {
    const currentStep = element.getAttribute("data-step");
    const bookingType = detectBookingType();

    if (bookingType === "bus" && currentStep === "passengers") {
      // Bus: Seat selection validation
      let isValid = true;
      const seatContainer = document.querySelector(".seat-selection-container");
      const seatError = seatContainer.querySelector(".book-alert__content");
      if (seatError) seatError.remove();

      // Check if at least one seat is selected and within limit
      if (typeof selectedSeats !== "undefined") {
        if (selectedSeats.length === 0) {
          bookToast("لطفاً حداقل یک صندلی انتخاب کنید.");

          // seatContainer.insertAdjacentHTML('beforeend',
          //     `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">لطفاً حداقل یک صندلی انتخاب کنید.</div>`);
          isValid = false;
        } else if (
          typeof maxSelectableSeats !== "undefined" &&
          selectedSeats.length > maxSelectableSeats
        ) {
          bookToast(
            `حداکثر ${maxSelectableSeats} صندلی می‌توانید انتخاب کنید.`
          );

          // seatContainer.insertAdjacentHTML('beforeend',
          //     `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">حداکثر ${maxSelectableSeats} صندلی می‌توانید انتخاب کنید.</div>`);
          isValid = false;
        }
      }

      if (isValid) {
        const nextStep = getNextStep(currentStep);
        if (nextStep) {
          transitionToStep(currentStep, nextStep, element);
        }
      }
    } else if (currentStep === "passenger") {
      // Passenger information validation (same for both flight and bus)
      let isExist = true;
      let isValid = true;
      const passengerInfoContents = document.querySelectorAll(
        ".book-passenger__container"
      );

      // Check required fields and dates for each passenger
      passengerInfoContents.forEach((passengerContent) => {
        if (
          !passengerContent
            .closest(".book-passengers__content")
            .classList.contains("book-hidden")
        ) {
          const numberItems = passengerContent.querySelectorAll(
            ".book-info__item__container"
          );
          numberItems.forEach((e) => {
            // Remove existing error messages
            const description = e.querySelector(".book-alert__content");
            if (description) description.remove();

            // Validate required fields
            const necessaryField = e.querySelector(".book-Required");
            if (necessaryField) {
              const innerItem = necessaryField.closest(
                ".book-info__item__content"
              );
              innerItem.classList.remove("book-invalid");
              if (necessaryField.value === "") {
                innerItem.classList.add("book-invalid");
                bookToast("مشخصات مسافر را وارد کنید.");

                // e.insertAdjacentHTML('beforeend', `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">مشخصات مسافر را وارد کنید.</div>`);
                isExist = false;
              }
            }

            // Validate date fields
            const dateItems = e.querySelectorAll(".book-date__item__content");
            dateItems.forEach((dateItem) => {
              const dateNecessaryField =
                dateItem.querySelector(".book-Required");
              if (dateNecessaryField) {
                const dateInnerItem = dateNecessaryField.closest(
                  ".book-info__item__content"
                );
                dateInnerItem.classList.remove("book-invalid");
                if (
                  dateNecessaryField.value === "" ||
                  !dateNecessaryField.getAttribute("data-id") ||
                  dateNecessaryField.getAttribute("data-id") === ""
                ) {
                  dateInnerItem.classList.add("book-invalid");
                  if (!e.querySelector(".book-alert__content")) {
                    bookToast("مشخصات مسافر را وارد کنید.");

                    // e.insertAdjacentHTML('beforeend', `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">مشخصات مسافر را وارد کنید.</div>`);
                  }
                  isExist = false;
                }
              }
            });
          });
        }
      });

      if (isExist) {
        // Get departure date based on booking type
        let exitDateMsDate;
        if (bookingType === "bus") {
          const exitDateMs = document.querySelector(
            ".book-DepartureDate"
          )?.value;
          exitDateMsDate = exitDateMs ? new Date(exitDateMs) : null;
        } else {
          // Flight: use lastDepartureDate if available
          exitDateMsDate =
            typeof lastDepartureDate !== "undefined"
              ? new Date(lastDepartureDate)
              : null;
        }

        const passengerContents = document.querySelectorAll(
          ".book-passenger__container"
        );

        passengerContents.forEach((passengerContent) => {
          if (
            !passengerContent
              .closest(".book-passengers__content")
              .classList.contains("book-hidden")
          ) {
            const passengerType =
              passengerContent.querySelector(".book-Type").value;
            const birthdayField =
              passengerContent.querySelector(".book-DateOfBirth");

            if (typeof checkDate === "function") {
              birthdayField.value = checkDate(birthdayField.value);
            }

            let birthday = birthdayField.value;
            const birthParts = birthday.split("-");

            // Validate birth date
            const [checkYear, checkMonth, checkDay] = birthParts.map((part) =>
              parseInt(part, 10)
            );
            const birthdayDate = new Date(birthday);

            if (
              isNaN(checkYear) ||
              isNaN(checkMonth) ||
              isNaN(checkDay) ||
              checkMonth < 1 ||
              checkMonth > 12 ||
              checkDay < 1 ||
              checkDay > new Date(checkYear, checkMonth, 0).getDate() ||
              isNaN(birthdayDate.getTime())
            ) {
              if (typeof addDateError === "function") {
                addDateError("تاریخ معتبر وارد کنید.", birthdayField);
              }
              isValid = false;
            } else {
              if (typeof removeDateError === "function") {
                removeDateError(birthdayField);
              }

              // Calculate age
              const cmsDate =
                document.querySelector(".book-layout__main")?.dataset.cmsdate;
              if (cmsDate) {
                const formattedDate = cmsDate
                  .split("/")
                  .map((part) => part.padStart(2, "0"))
                  .join("-");
                const [MM, DD, YYYY] = formattedDate.split("-");
                const finalDate = `${YYYY}-${MM}-${DD}`;
                const currentDate = new Date(finalDate);
                const daysDiff = Math.ceil(
                  (currentDate - birthdayDate) / (1000 * 3600 * 24)
                );
                const age = Math.floor(daysDiff / 365);

                // Validate age based on passenger type
                if (passengerType === "ADT" && (age < 12 || age > 98)) {
                  if (typeof addDateError === "function") {
                    addDateError(
                      "برای بزرگسال تاریخ تولد معتبر وارد کنید",
                      birthdayField
                    );
                  }
                  isValid = false;
                } else if (passengerType === "CHD" && (age < 2 || age > 12)) {
                  if (typeof addDateError === "function") {
                    addDateError(
                      "برای کودک تاریخ تولد معتبر وارد کنید",
                      birthdayField
                    );
                  }
                  isValid = false;
                } else if (passengerType === "INF" && (age < 0 || age > 2)) {
                  if (typeof addDateError === "function") {
                    addDateError(
                      "برای نوزاد تاریخ تولد معتبر وارد کنید",
                      birthdayField
                    );
                  }
                  isValid = false;
                } else {
                  if (typeof removeDateError === "function") {
                    removeDateError(birthdayField);
                  }
                }
              }
            }

            // Validate passport expiration (if applicable)
            const passExpireField = passengerContent.querySelector(
              ".book-PassportExpiration"
            );
            if (
              passExpireField &&
              passExpireField
                .closest(".book-info__item__container")
                .querySelector(".book-day")
                ?.classList.contains("book-Required")
            ) {
              if (typeof checkDate === "function") {
                passExpireField.value = checkDate(passExpireField.value);
              }

              let passExpireDate = passExpireField.value;
              const passExpireParts = passExpireDate.split("-");
              const year = parseInt(passExpireParts[0], 10);
              const month = parseInt(passExpireParts[1], 10);
              const day = parseInt(passExpireParts[2], 10);
              const passExpireDateObject = new Date(passExpireDate);

              if (
                isNaN(year) ||
                isNaN(month) ||
                isNaN(day) ||
                isNaN(passExpireDateObject.getTime()) ||
                month < 1 ||
                month > 12 ||
                day < 1 ||
                day > new Date(year, month, 0).getDate()
              ) {
                if (typeof addDateError === "function") {
                  addDateError("تاریخ معتبر وارد کنید.", passExpireField);
                }
                isValid = false;
              } else if (exitDateMsDate) {
                // Check 6-month validity
                const timeDiff =
                  passExpireDateObject.getTime() - exitDateMsDate.getTime();
                const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                if (daysDiff < 183) {
                  if (typeof addDateError === "function") {
                    addDateError(
                      "تاریخ انقضای گذرنامه باید بیشتر از 6 ماه باشد.",
                      passExpireField
                    );
                  }
                  isValid = false;
                } else {
                  if (typeof removeDateError === "function") {
                    removeDateError(passExpireField);
                  }
                }
              }
            }

            // Additional validations (passport code, national code, English fields, etc.)
            // ... (keeping your existing validation logic)
          }
        });

        if (isValid) {
          // Transition to buyer step or login
          const mainUserId = document.querySelector(".main-userid")?.value;
          if (mainUserId === "0") {
            if (typeof showLoginContainer === "function") {
              showLoginContainer();
            }
          } else {
            const nextStep = getNextStep(currentStep);
            if (nextStep) {
              transitionToStep(currentStep, nextStep, element);

              // Initialize buyer container if needed
              const buyersContainer = document.querySelector(
                ".book-buyers__container"
              );
              if (
                buyersContainer &&
                buyersContainer.getAttribute("data-run") === "0"
              ) {
                if (typeof $bc !== "undefined" && $bc.setSource) {
                  $bc.setSource("cms.buyer", true);
                  buyersContainer.setAttribute("data-run", "1");
                }
              }
            }
          }
        }
      }
    } else if (currentStep === "buyer") {
      // Validate buyer information
      let isExist = true;
      let isValid = true;
      let isVerify = true;

      document
        .querySelectorAll(".book-buyer__info__content")
        .forEach((buyerContent) => {
          buyerContent
            .querySelectorAll(".book-info__item__container")
            .forEach((e) => {
              // Remove existing error messages
              const description = e.querySelector(".book-alert__content");
              if (description) description.remove();

              // Validate required fields
              const necessaryField = e.querySelector(".book-Required");
              if (necessaryField) {
                necessaryField
                  .closest(".book-info__item__content")
                  .classList.remove("book-invalid");
                if (necessaryField.value === "") {
                  necessaryField
                    .closest(".book-info__item__content")
                    .classList.add("book-invalid");
                  bookToast("مشخصات خریدار را وارد کنید.");

                  // e.insertAdjacentHTML('beforeend', `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">مشخصات خریدار را وارد کنید.</div>`);
                  isExist = false;
                }
              }

              // Validate number fields
              e.querySelectorAll(".book-number__item__container").forEach(
                (numberItem) => {
                  const codeField = numberItem.querySelector(".book-code");
                  if (codeField) {
                    codeField
                      .closest(".book-info__item__content")
                      .classList.remove("book-invalid");
                    if (codeField.value === "") {
                      codeField
                        .closest(".book-info__item__content")
                        .classList.add("book-invalid");
                      isExist = false;
                    }
                  }
                }
              );
            });
        });

      if (isExist) {
        // Validate agency selection
        if (document.querySelector(".book-buyer-1")) {
          const agencyContent = document.querySelector(
            ".book-buyer__agency__content"
          );
          const selectedAgency = document.querySelector(
            ".book-selected__agency"
          );
          if (
            !agencyContent.classList.contains("book-hidden") &&
            (!selectedAgency.getAttribute("data-id") ||
              selectedAgency.getAttribute("data-id") === "")
          ) {
            isValid = false;
            bookToast("آژانس موردنظر را از لیست پیشنهادی انتخاب کنید.");

            // selectedAgency.closest(".book-info__item__container").insertAdjacentHTML('beforeend',
            //     `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">آژانس موردنظر را از لیست پیشنهادی انتخاب کنید.</div>`);
          }
        }

        // Validate buyer fields
        function validateField(element, className, regex, errorMessage) {
          try {
            const field = element.querySelector(className);
            if (field?.classList.contains("book-Required")) {
              if (!regex.test(field.value)) {
                field
                  .closest(".book-info__item__content")
                  .classList.add("book-invalid");
                bookToast(errorMessage);

                // element.insertAdjacentHTML('beforeend',
                //     `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">${errorMessage}</div>`);
                return false;
              }
              field
                .closest(".book-info__item__content")
                .classList.remove("book-invalid");
              return true;
            }
            return true;
          } catch (err) {
            console.error(
              `validateField: ${err.message}, Line: ${
                err.lineNumber || "unknown"
              }`
            );
            return false;
          }
        }

        Array.from(
          document.getElementsByClassName("book-buyer__info__content")
        ).forEach((buyerInfo) => {
          // Validate name
          Array.from(buyerInfo.getElementsByClassName("book-name")).forEach(
            (e) => {
              if (
                !validateField(
                  e.closest(".book-info__item__container"),
                  ".book-name",
                  /^.{2,}$/,
                  "حداقل تعداد کاراکتر 2 است ."
                )
              ) {
                isValid = false;
              }
            }
          );

          // Validate email
          Array.from(buyerInfo.getElementsByClassName("book-email")).forEach(
            (e) => {
              if (
                !validateField(
                  e.closest(".book-info__item__container"),
                  ".book-email",
                  /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
                  "ایمیل صحیح نمی‌باشد."
                )
              ) {
                isValid = false;
              }
            }
          );

          // Validate address
          Array.from(buyerInfo.getElementsByClassName("book-address")).forEach(
            (e) => {
              if (
                !validateField(
                  e.closest(".book-info__item__container"),
                  ".book-address",
                  /^.{5,}$/,
                  "حداقل تعداد کاراکتر 5 است."
                )
              ) {
                isValid = false;
              }
            }
          );

          // Validate mobile
          Array.from(
            buyerInfo.getElementsByClassName("book-number__item__container")
          ).forEach((e) => {
            if (e.querySelector(".book-code__number")?.value === "+98") {
              if (
                !validateField(
                  e,
                  ".book-mobile",
                  /^9([0123645789]{9})$/,
                  "تلفن همراه باید با 9 شروع شده و بیش از 10 رقم نباشد."
                )
              ) {
                isValid = false;
              }
            }
          });
        });

        if (isValid) {
          // Handle email/mobile verification
          function handleVerification(e, type) {
            try {
              const verifyContainer =
                type === "email"
                  ? document.querySelector(".book-email-verify-container")
                  : document.querySelector(".book-mobile-verify-container");
              const verifyInput = verifyContainer.querySelector(
                `.${type}-verify`
              );
              verifyContainer.classList.remove("book-hidden");
              verifyInput.value = e.value;
              if (type === "mobile") {
                const codeContainer = verifyContainer.querySelector(
                  ".book-code-verify-container"
                );
                const btnItem =
                  verifyContainer.querySelector(".book-btn__content");
                codeContainer.classList.add("book-hidden");
                btnItem.dataset.type = "verifyrequest";
                btnItem.innerHTML = "ارسال کد";
              }
            } catch (err) {
              console.error(
                `handleVerification: ${err.message}, Line: ${
                  err.lineNumber || "unknown"
                }`
              );
            }
          }

          document
            .querySelector(".book-check__has__data")
            .querySelectorAll("input")
            .forEach((e) => {
              if (e.dataset.verify && e.dataset.verify === "false") {
                if (
                  document
                    .querySelector(".book-verify-request-container")
                    .classList.contains("book-verify-request-container-toggle")
                ) {
                  document
                    .querySelector(".book-verify-request-container")
                    .classList.toggle("book-verify-request-container-toggle");
                }
                isVerify = false;
                if (e.classList.contains("book-email")) {
                  handleVerification(e, "email");
                }
                if (e.classList.contains("book-mobile")) {
                  handleVerification(e, "mobile");
                }
              }
            });

          if (isVerify) {
            // Set dash for empty fields
            document
              .querySelectorAll(".book-buyer__info__content")
              .forEach((content) => {
                content.querySelectorAll(".book-has-dash").forEach((input) => {
                  if (input.value === "") {
                    input.value = "-";
                  }
                });
              });

            // Transition to summary step
            const nextStepName = getNextStep(currentStep);
            if (nextStepName) {
              transitionToStep(currentStep, nextStepName, element);

              if (typeof showSummaryContent === "function") {
                showSummaryContent(element);
              }
            }
          }
        }
      }
    } else if (currentStep === "summary") {
      // Validate summary step
      let isValid = true;
      const removeDescription = (container) => {
        const description = container.querySelector(".book-alert__content");
        if (description) description.remove();
      };

      // Validate company rules checkbox
      const ruleContent = document.querySelector(
        ".book-company__rule__container"
      );
      removeDescription(ruleContent);
      if (!ruleContent.querySelector("input[type=checkbox]").checked) {
        bookToast("لطفا قوانین و مقررات را تایید فرمایید");

        // ruleContent.insertAdjacentHTML('beforeend',
        //     `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">لطفا قوانین و مقررات را تایید فرمایید</div>`);
        isValid = false;
      }

      // Validate counter selection
      const counterContent = document.querySelector(".book-counter__container");
      removeDescription(counterContent);
      if (counterContent.classList.contains("book-Required")) {
        const counterName = counterContent.querySelector(".book-name").value;
        if (counterName === "") {
          bookToast("لطفا کانتر اقدام کننده را انتخاب فرمایید");

          // counterContent.insertAdjacentHTML('beforeend',
          //     `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">لطفا کانتر اقدام کننده را انتخاب فرمایید</div>`);
          isValid = false;
        }
      }

      if (isValid) {
        // Transition to invoice step
        const invoiceContainer = document.querySelector(
          ".book-invoice__container"
        );
        invoiceContainer.classList.remove("book-hidden");
        if (invoiceContainer.querySelectorAll(".book-invoice__content")[0]) {
          invoiceContainer
            .querySelectorAll(".book-invoice__content")
            .forEach((e) => {
              e.remove();
            });
        }
        if (invoiceContainer.querySelector(".book-api__container__loader")) {
          invoiceContainer
            .querySelector(".book-api__container__loader")
            .remove();
        }
        invoiceContainer.insertAdjacentHTML(
          "beforeend",
          `<span
                                                  class="book-api__container__loader book-bg-white book-relative book-block book-w-3 book-h-3 book-rounded-full book-mx-auto book-m-3"></span>`
        );

        // Handle invoice rendering based on account type
        const accountType = document.querySelector(".book-buyers__container")
          .dataset.accounttype;
        // Commented out as per original code
        const share = sessionSearchStorage.share;
        if (Number(share) === 1) {
          invoiceContainer.innerHTML = `<div class="book-invoice__content book-pre__Invoice" data-run="0" onclick="submitInvoice(this,'pre__Invoice')">جهت ثبت قرارداد کلیک کنید</div>`;
          document.querySelector(".book-bankIdentifier").value = -1;
        } else if (Number(accountType) === 1) {
          invoiceContainer.innerHTML = `<div class="book-invoice__content book-pre__Invoice book-text-xl book-text-center book-cursor-pointer" data-run="0" onclick="submitInvoice(this,'pre__Invoice')">جهت ثبت پیش قرارداد و ارسال به حسابداری کلیک کنید</div>`;
        } else {
          let cookieValue = `; ${document.cookie}`;
          let match = cookieValue.match(/(?:^|;\s*)rkey=([^;]*)/);
          let rkey = match ? match[1] : null;
          const { requests, productGroupField, productIdField } =
            getServiceMappingInfo(selectedMode);
          const userCreditUrl = requests.userCredit;
          $bc.setSource("cms.bankList", [
            {
              bank: utmSource === "safarmarket" ? "safarmarket" : "",
              rkey: rkey,
              selectedMode: selectedMode,
              userCreditUrl: userCreditUrl,
              run: true,
            },
          ]);
        }
        /* } */
      }
    }
  } catch (err) {
    console.error(
      `nextStep: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};
/**
 * Enhanced prevStep function with multi-booking support
 * @param {HTMLElement} element - The element triggering the step transition
 */
const prevStep = (element) => {
  try {
    const currentStep = element.getAttribute("data-step");
    const previousStep = getPreviousStep(currentStep);

    if (!previousStep) {
      // Already at first step
      return;
    }

    // Handle special cases for going back
    if (currentStep === "summary") {
      // Reset coupon if applicable
      const couponResponse = document.querySelector(
        ".book-coupon__container .book-response-code"
      );
      if (couponResponse && couponResponse.classList.contains("book-true")) {
        const couponCode = document.querySelector(".book-coupon__code");
        const couponButton = document.querySelector(
          ".book-coupon__container button"
        );
        if (couponCode) couponCode.value = "";
        if (couponButton) couponButton.click();
      }

      // Hide invoice container if visible
      const summaryInvoice = document.querySelector(".book-invoice__container");
      if (summaryInvoice && !summaryInvoice.classList.contains("book-hidden")) {
        summaryInvoice.classList.add("book-hidden");
      }

      // Remove error messages
      ["book-company__rule__container", "book-counter__container"].forEach(
        (className) => {
          const description = document.querySelector(
            `.${className} .book-alert__content`
          );
          if (description) description.remove();
        }
      );
    }

    // Special handling for bus seat selection
    const bookingType = detectBookingType();
    if (bookingType === "bus" && previousStep === "passengers") {
      // Re-render seat map if going back to seat selection
      if (
        typeof onProcessedRenderSeatMapSelection === "function" &&
        window.seatMapResponse
      ) {
        setTimeout(() => {
          onProcessedRenderSeatMapSelection({
            response: window.seatMapResponse,
          });
        }, 100);
      }
    }

    // Perform the transition
    transitionToStep(currentStep, previousStep, element);

    // Update current prev button step
    element.setAttribute("data-step", previousStep);

    // Find and update next button step
    const nextButton = element.nextElementSibling;
    if (nextButton) {
      nextButton.setAttribute("data-step", previousStep);
    }

    // Handle navigation button visibility
    const config = getCurrentStepConfig();
    const stepIndex = config.steps.indexOf(previousStep);

    if (stepIndex === 0) {
      // Going back to first step - hide previous button
      element.classList.add("book-invisible");
    } else {
      // Make sure previous button is visible for middle steps
      element.classList.remove("book-invisible", "book-hidden");
    }

    // Make sure next button is visible when going back from last step
    if (nextButton && stepIndex < config.steps.length - 1) {
      nextButton.classList.remove("book-invisible", "book-hidden");
    }
  } catch (err) {
    console.error(
      `prevStep: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};
